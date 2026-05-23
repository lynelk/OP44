import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, report_type, date_from, date_to, email_to, report_data } = body;

    // ── GENERATE REPORT ────────────────────────────────────────────────────────
    if (action === 'generate') {
      const [loans, users, repayments, savings, investments, lenderInvestments] = await Promise.all([
        base44.asServiceRole.entities.LoanApplication.list('-created_date', 500),
        base44.asServiceRole.entities.User.list('-created_date', 500),
        base44.asServiceRole.entities.Repayment.list('-created_date', 500),
        base44.asServiceRole.entities.SavingsPocket.list('-created_date', 500),
        base44.asServiceRole.entities.LenderInvestment.list('-created_date', 500),
        base44.asServiceRole.entities.P2PRepayment.list('-created_date', 500),
      ]);

      const inPeriod = (dateStr) => {
        if (!dateStr) return false;
        const d = dateStr.slice(0, 10);
        return d >= date_from && d <= date_to;
      };

      let summary = {};
      let records = [];
      let csv = '';

      if (report_type === 'loan_summary') {
        const activeLoans = loans.filter(l => ['active', 'disbursed'].includes(l.status));
        const disbursedInPeriod = loans.filter(l => l.disbursed_at && inPeriod(l.disbursed_at));
        const repaidInPeriod = repayments.filter(r => r.paid_date && inPeriod(r.paid_date));
        const overdue = loans.filter(l => l.status === 'defaulted' || l.days_overdue > 0);

        summary = {
          total_loans: loans.length,
          active_loans: activeLoans.length,
          disbursed_in_period: disbursedInPeriod.length,
          total_disbursed: disbursedInPeriod.reduce((s, l) => s + (l.amount_approved || 0), 0),
          repayments_collected: repaidInPeriod.reduce((s, r) => s + (r.amount || 0), 0),
          outstanding_portfolio: activeLoans.reduce((s, l) => s + (l.outstanding_balance || 0), 0),
          overdue_loans: overdue.length,
          npl_rate: loans.length > 0 ? (overdue.length / loans.length) * 100 : 0,
        };

        records = disbursedInPeriod.map(l => {
          const u = users.find(u => u.id === l.user_id) || {};
          return {
            loan_id: l.id.slice(-8),
            borrower: u.full_name || 'N/A',
            amount: l.amount_approved || 0,
            outstanding: l.outstanding_balance || 0,
            status: l.status,
            risk_band: l.risk_band || '',
            disbursed: l.disbursed_at?.slice(0, 10) || '',
            next_due: l.next_repayment_date || '',
          };
        });

      } else if (report_type === 'user_activity') {
        const profiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', 500);
        const registeredInPeriod = users.filter(u => inPeriod(u.created_date));
        const kycVerified = profiles.filter(p => p.kyc_status === 'verified');
        const activeUsers = new Set(loans.filter(l => inPeriod(l.created_date)).map(l => l.user_id));

        summary = {
          total_users: users.length,
          new_registrations: registeredInPeriod.length,
          kyc_verified: kycVerified.length,
          active_borrowers: activeUsers.size,
          lenders: profiles.filter(p => p.account_type === 'lender' || p.account_type === 'both').length,
        };

        records = users.filter(u => inPeriod(u.created_date)).map(u => {
          const profile = profiles.find(p => p.user_id === u.id) || {};
          return {
            user_id: u.id.slice(-8),
            name: u.full_name || '',
            email: u.email || '',
            registered: u.created_date?.slice(0, 10) || '',
            kyc_status: profile.kyc_status || 'not_started',
            account_type: profile.account_type || 'borrower',
            risk_tier: profile.risk_tier || '',
          };
        });

      } else if (report_type === 'investment_returns') {
        const activeInv = investments.filter(i => i.status === 'active');
        const completedInv = investments.filter(i => i.status === 'completed');

        summary = {
          total_investments: investments.length,
          active_investments: activeInv.length,
          completed_investments: completedInv.length,
          total_deployed: investments.reduce((s, i) => s + (i.amount_invested || 0), 0),
          total_returns_earned: investments.reduce((s, i) => s + (i.actual_return_earned || 0), 0),
          principal_recovered: investments.reduce((s, i) => s + (i.principal_recovered || 0), 0),
        };

        records = investments.filter(i => inPeriod(i.invested_at)).map(i => {
          const u = users.find(u => u.id === i.lender_id) || {};
          return {
            investment_id: i.id.slice(-8),
            lender: u.full_name || u.email || 'N/A',
            loan_ref: i.loan_id?.slice(-8) || '',
            amount_invested: i.amount_invested || 0,
            returns_earned: i.actual_return_earned || 0,
            ownership_pct: i.ownership_pct || 0,
            status: i.status,
            invested_at: i.invested_at?.slice(0, 10) || '',
          };
        });

      } else if (report_type === 'crb_monthly') {
        records = loans.filter(l => inPeriod(l.created_date) || inPeriod(l.disbursed_at)).map(loan => {
          const loanUser = users.find(u => u.id === loan.user_id) || {};
          const loanRepayments = repayments.filter(r => r.loan_id === loan.id);
          return {
            account_id: loan.id,
            full_name: loanUser.full_name || '',
            phone: loanUser.phone_number || '',
            loan_amount: loan.amount_approved || 0,
            outstanding: loan.outstanding_balance || 0,
            status: loan.status,
            on_time: loanRepayments.filter(r => r.status === 'paid').length,
            late: loanRepayments.filter(r => r.days_late > 0).length,
            disbursement_date: loan.disbursed_at?.slice(0, 10) || '',
          };
        });
        summary = { total_accounts: records.length, period_from: date_from, period_to: date_to };

      } else if (report_type === 'regulatory_summary') {
        const disbursedInPeriod = loans.filter(l => l.disbursed_at && inPeriod(l.disbursed_at));
        const collectedInPeriod = repayments.filter(r => r.paid_date && inPeriod(r.paid_date));
        summary = {
          total_active_borrowers: loans.filter(l => l.status === 'active').length,
          total_disbursed: disbursedInPeriod.reduce((s, l) => s + (l.amount_approved || 0), 0),
          total_collected: collectedInPeriod.reduce((s, r) => s + (r.amount || 0), 0),
          npa_count: loans.filter(l => l.status === 'defaulted').length,
          npa_value: loans.filter(l => l.status === 'defaulted').reduce((s, l) => s + (l.outstanding_balance || 0), 0),
          total_savings: savings.reduce((s, p) => s + (p.current_balance || 0), 0),
        };
        records = [summary];

      } else if (report_type === 'collections') {
        const overdue = loans.filter(l => (l.days_overdue > 0) || l.status === 'defaulted' || l.status === 'overdue');
        summary = {
          overdue_loans: overdue.length,
          total_overdue_value: overdue.reduce((s, l) => s + (l.outstanding_balance || 0), 0),
          defaulted_loans: loans.filter(l => l.status === 'defaulted').length,
          escalated_to_collections: loans.filter(l => l.escalated_to_collections).length,
        };
        records = overdue.map(l => {
          const u = users.find(u => u.id === l.user_id) || {};
          return {
            loan_id: l.id.slice(-8),
            borrower: u.full_name || 'N/A',
            phone: u.phone_number || '',
            amount_approved: l.amount_approved || 0,
            outstanding: l.outstanding_balance || 0,
            days_overdue: l.days_overdue || 0,
            status: l.status,
            escalated: l.escalated_to_collections ? 'Yes' : 'No',
          };
        });
      }

      // Build CSV
      if (records.length > 0) {
        const headers = Object.keys(records[0]);
        const rows = records.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
        csv = [headers.join(','), ...rows].join('\n');
      }

      return Response.json({ summary, records, csv });
    }

    // ── LIST PORTFOLIOS ─────────────────────────────────────────────────────────
    if (action === 'list_portfolios') {
      const [investments, users] = await Promise.all([
        base44.asServiceRole.entities.LenderInvestment.list('-invested_at', 500),
        base44.asServiceRole.entities.User.list('-created_date', 500),
      ]);

      const byLender = {};
      investments.forEach(inv => {
        if (!byLender[inv.lender_id]) {
          byLender[inv.lender_id] = {
            lender_id: inv.lender_id,
            total_invested: 0,
            total_returns: 0,
            principal_recovered: 0,
            active_investments: 0,
            investments: [],
          };
        }
        const p = byLender[inv.lender_id];
        p.total_invested += (inv.amount_invested || 0);
        p.total_returns += (inv.actual_return_earned || 0);
        p.principal_recovered += (inv.principal_recovered || 0);
        if (inv.status === 'active') p.active_investments++;
        p.investments.push(inv);
      });

      const portfolios = Object.values(byLender).map(p => {
        const u = users.find(u => u.id === p.lender_id) || {};
        return { ...p, lender_name: u.full_name || '', lender_email: u.email || '' };
      }).sort((a, b) => b.total_invested - a.total_invested);

      return Response.json({ portfolios });
    }

    // ── SEND EMAIL ──────────────────────────────────────────────────────────────
    if (action === 'send_email') {
      const label = report_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Report';
      const summary = report_data?.summary || {};
      const summaryRows = Object.entries(summary)
        .map(([k, v]) => `<tr><td style="padding:4px 8px;color:#555;text-transform:capitalize">${k.replace(/_/g, ' ')}</td><td style="padding:4px 8px;font-weight:bold">${typeof v === 'number' && v > 10000 ? 'UGX ' + v.toLocaleString() : v}</td></tr>`)
        .join('');

      const body = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1a3a6b;color:white;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">📊 ${label}</h2>
            <p style="margin:4px 0 0;opacity:0.8;font-size:13px">Period: ${date_from} to ${date_to}</p>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none">
            <h3 style="margin-bottom:12px;color:#1a3a6b">Summary</h3>
            <table style="width:100%;border-collapse:collapse">${summaryRows}</table>
            <p style="margin-top:20px;font-size:12px;color:#888">Generated by OpFin Admin on ${new Date().toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })}</p>
          </div>
        </div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email_to,
        subject: `OpFin ${label} — ${date_from} to ${date_to}`,
        body,
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});