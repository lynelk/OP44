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

      } else if (report_type === 'lender_rental_performance') {
        // ── LENDER RENTAL PERFORMANCE REPORT ───────────────────────────────
        const [rentals, rentalTx, trackers, devices] = await Promise.all([
          base44.asServiceRole.entities.RentalAgreement.list('-created_date', 500),
          base44.asServiceRole.entities.RentalPaymentTransaction.list('-initiated_at', 500),
          base44.asServiceRole.entities.GPSTracker.list('-last_updated_at', 200),
          base44.asServiceRole.entities.Device.list('-created_date', 500),
        ]);

        const filteredRentals = rentals.filter(r => inPeriod(r.start_date) || inPeriod(r.created_date));

        // Group by lender
        const byLender = {};
        for (const rental of rentals) {
          if (!byLender[rental.lender_id]) {
            byLender[rental.lender_id] = {
              lender_id: rental.lender_id,
              total_rentals: 0,
              active_rentals: 0,
              completed_rentals: 0,
              disputed_rentals: 0,
              total_earnings: 0,
              collected_payments: 0,
              overdue_payments: 0,
              overdue_amount: 0,
              outstanding_balance: 0,
              devices: new Set(),
              trackers_active: 0,
            };
          }
          const l = byLender[rental.lender_id];
          l.total_rentals++;
          if (rental.status === 'Active') l.active_rentals++;
          if (rental.status === 'Completed') l.completed_rentals++;
          if (rental.status === 'Disputed') l.disputed_rentals++;
          l.total_earnings += (rental.total_rental_fee || 0);
          l.outstanding_balance += (rental.outstanding_balance || 0);
          l.overdue_payments += (rental.overdue_count || 0);
          if (rental.device_id) l.devices.add(rental.device_id);
          // Overdue amount
          const sched = rental.payment_schedule || [];
          l.overdue_amount += sched.filter(s=>s.status==='Overdue').reduce((sum,s)=>sum+(s.amount||0),0);
        }

        // Add collected payments from transactions
        for (const tx of rentalTx) {
          if (tx.status === 'Successful' && byLender[tx.lender_id]) {
            byLender[tx.lender_id].collected_payments += (tx.amount || 0);
          }
        }

        // Compute device utilisation & GPS coverage
        for (const lenderId of Object.keys(byLender)) {
          const lData = byLender[lenderId];
          const lenderDevices = devices.filter(d => d.lender_id === lenderId);
          const lenderTrackers = trackers.filter(t => t.lender_id === lenderId && t.is_active);
          lData.total_devices = lenderDevices.length;
          lData.devices_with_gps = lenderTrackers.length;
          const rentedDevices = new Set(rentals.filter(r=>r.lender_id===lenderId&&r.status==='Active').map(r=>r.device_id));
          lData.utilisation_rate = lenderDevices.length > 0 ? (rentedDevices.size / lenderDevices.length) * 100 : 0;
          lData.payment_health_rate = lData.total_earnings > 0 ? ((lData.total_earnings - lData.overdue_amount) / lData.total_earnings) * 100 : 100;
          // Average days device was idle (approx: devices available - active)
          const idleDevices = lenderDevices.filter(d=>d.status==='Available').length;
          lData.avg_idle_devices = idleDevices;
        }

        const lenderEntries = Object.values(byLender);

        // Enrich with user names
        records = lenderEntries.map(l => {
          const u = users.find(u=>u.id===l.lender_id) || {};
          return {
            lender_id: l.lender_id.slice(-8),
            lender_name: u.full_name || 'N/A',
            email: u.email || '',
            total_rentals: l.total_rentals,
            active_rentals: l.active_rentals,
            completed_rentals: l.completed_rentals,
            disputed_rentals: l.disputed_rentals,
            total_devices: l.total_devices || 0,
            utilisation_rate_pct: l.utilisation_rate?.toFixed(1) || '0',
            avg_idle_devices: l.avg_idle_devices || 0,
            devices_with_gps: l.devices_with_gps || 0,
            total_earnings_ugx: l.total_earnings,
            collected_ugx: l.collected_payments,
            outstanding_ugx: l.outstanding_balance,
            overdue_amount_ugx: l.overdue_amount,
            payment_health_pct: l.payment_health_rate?.toFixed(1) || '100',
          };
        }).sort((a,b)=>b.total_earnings_ugx - a.total_earnings_ugx);

        summary = {
          total_lenders: lenderEntries.length,
          total_rentals: rentals.length,
          active_rentals: rentals.filter(r=>r.status==='Active').length,
          total_rental_earnings: rentals.reduce((s,r)=>s+(r.total_rental_fee||0),0),
          total_collected: rentalTx.filter(t=>t.status==='Successful').reduce((s,t)=>s+(t.amount||0),0),
          total_outstanding: rentals.reduce((s,r)=>s+(r.outstanding_balance||0),0),
          avg_utilisation_rate: lenderEntries.length>0 ? (lenderEntries.reduce((s,l)=>s+(l.utilisation_rate||0),0)/lenderEntries.length).toFixed(1) : '0',
          gps_tracked_devices: trackers.filter(t=>t.is_active).length,
        };

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

    // ── LENDER RENTAL REPORTS ───────────────────────────────────────────────────
    if (action === 'lender_rental_report') {
      const { lender_id } = body;

      const [rentals, trackers, devices, users] = await Promise.all([
        base44.asServiceRole.entities.RentalAgreement.list('-created_date', 500),
        base44.asServiceRole.entities.GPSTracker.list('-created_date', 500),
        base44.asServiceRole.entities.Device.list('-created_date', 500),
        base44.asServiceRole.entities.User.list('-created_date', 500),
      ]);

      // Filter to specific lender or all lenders
      const targetRentals = lender_id
        ? rentals.filter(r => r.lender_id === lender_id)
        : rentals;

      // Group by lender
      const byLender = {};
      for (const rental of targetRentals) {
        if (!byLender[rental.lender_id]) {
          byLender[rental.lender_id] = {
            lender_id: rental.lender_id,
            total_rentals: 0,
            active_rentals: 0,
            completed_rentals: 0,
            disputed_rentals: 0,
            total_earnings: 0,
            outstanding_balance: 0,
            overdue_count: 0,
            overdue_value: 0,
            paid_installments: 0,
            total_installments: 0,
            devices_rented: new Set(),
            rental_days: 0,
            rentals: [],
          };
        }
        const p = byLender[rental.lender_id];
        p.total_rentals++;
        p.rentals.push(rental);

        if (rental.status === 'Active') p.active_rentals++;
        if (rental.status === 'Completed') p.completed_rentals++;
        if (rental.status === 'Disputed' || rental.dispute_status === 'Open') p.disputed_rentals++;

        // Earnings: sum of paid installments
        const schedule = rental.payment_schedule || [];
        const paid = schedule.filter(s => s.status === 'Paid');
        const overdue = schedule.filter(s => s.status === 'Overdue');
        p.paid_installments += paid.length;
        p.total_installments += schedule.length;
        p.total_earnings += paid.reduce((s, i) => s + (i.amount || 0), 0);
        p.outstanding_balance += rental.outstanding_balance || 0;
        p.overdue_count += overdue.length;
        p.overdue_value += overdue.reduce((s, i) => s + (i.amount || 0), 0);

        if (rental.device_id) p.devices_rented.add(rental.device_id);

        // Rental duration in days
        if (rental.start_date && rental.end_date) {
          const days = Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000 * 60 * 60 * 24));
          p.rental_days += days;
        }
      }

      // Attach GPS / device utilisation metrics
      const lenderReports = Object.values(byLender).map(p => {
        const lenderUser = users.find(u => u.id === p.lender_id) || {};
        const lenderDevices = devices.filter(d => d.lender_id === p.lender_id);
        const lenderTrackers = trackers.filter(t => t.lender_id === p.lender_id);

        // Asset utilisation: proportion of lender's devices currently rented
        const totalDevices = lenderDevices.length || 1;
        const rentedDevices = lenderDevices.filter(d => d.status === 'Rented').length;
        const utilisation_rate = ((rentedDevices / totalDevices) * 100).toFixed(1);

        // Average GPS downtime: devices with no GPS update in >24h
        const now = Date.now();
        const staleTrackers = lenderTrackers.filter(t => {
          if (!t.last_updated_at) return true;
          return (now - new Date(t.last_updated_at).getTime()) > 24 * 60 * 60 * 1000;
        }).length;
        const avg_device_downtime_pct = lenderTrackers.length > 0
          ? ((staleTrackers / lenderTrackers.length) * 100).toFixed(1)
          : '0';

        // Payment health: pct of installments paid on time
        const payment_health_pct = p.total_installments > 0
          ? ((p.paid_installments / p.total_installments) * 100).toFixed(1)
          : '100';

        return {
          lender_id:              p.lender_id,
          lender_name:            lenderUser.full_name || lenderUser.email || 'N/A',
          lender_email:           lenderUser.email || '',
          total_rentals:          p.total_rentals,
          active_rentals:         p.active_rentals,
          completed_rentals:      p.completed_rentals,
          disputed_rentals:       p.disputed_rentals,
          total_earnings_ugx:     p.total_earnings,
          outstanding_balance:    p.outstanding_balance,
          overdue_installments:   p.overdue_count,
          overdue_value_ugx:      p.overdue_value,
          payment_health_pct:     parseFloat(payment_health_pct),
          total_devices:          totalDevices,
          rented_devices:         rentedDevices,
          utilisation_rate_pct:   parseFloat(utilisation_rate),
          gps_trackers:           lenderTrackers.length,
          stale_trackers:         staleTrackers,
          avg_device_downtime_pct: parseFloat(avg_device_downtime_pct),
          unique_devices_rented:  p.devices_rented.size,
          total_rental_days:      p.rental_days,
        };
      }).sort((a, b) => b.total_earnings_ugx - a.total_earnings_ugx);

      // Overall platform summary
      const summary = {
        total_lenders:        lenderReports.length,
        total_rentals:        lenderReports.reduce((s, r) => s + r.total_rentals, 0),
        active_rentals:       lenderReports.reduce((s, r) => s + r.active_rentals, 0),
        total_earnings_ugx:   lenderReports.reduce((s, r) => s + r.total_earnings_ugx, 0),
        total_outstanding:    lenderReports.reduce((s, r) => s + r.outstanding_balance, 0),
        avg_utilisation_pct:  lenderReports.length > 0
          ? (lenderReports.reduce((s, r) => s + r.utilisation_rate_pct, 0) / lenderReports.length).toFixed(1)
          : 0,
        avg_payment_health_pct: lenderReports.length > 0
          ? (lenderReports.reduce((s, r) => s + r.payment_health_pct, 0) / lenderReports.length).toFixed(1)
          : 0,
      };

      // CSV export
      let csv = '';
      if (lenderReports.length > 0) {
        const headers = Object.keys(lenderReports[0]);
        const rows = lenderReports.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
        csv = [headers.join(','), ...rows].join('\n');
      }

      // Optionally send email report
      if (body.email_to && lenderReports.length > 0) {
        const topLenders = lenderReports.slice(0, 5).map(r =>
          `<tr>
            <td style="padding:6px 8px">${r.lender_name}</td>
            <td style="padding:6px 8px;text-align:right">UGX ${r.total_earnings_ugx.toLocaleString()}</td>
            <td style="padding:6px 8px;text-align:right">${r.utilisation_rate_pct}%</td>
            <td style="padding:6px 8px;text-align:right">${r.payment_health_pct}%</td>
            <td style="padding:6px 8px;text-align:right">${r.active_rentals}</td>
            <td style="padding:6px 8px;text-align:right">${r.avg_device_downtime_pct}%</td>
          </tr>`
        ).join('');

        const emailBody = `
          <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
            <div style="background:#006B3C;color:white;padding:24px;border-radius:8px 8px 0 0">
              <h2 style="margin:0">🏦 Lender Rental Performance Report</h2>
              <p style="margin:4px 0 0;opacity:0.8;font-size:13px">Generated: ${new Date().toLocaleString('en-UG',{timeZone:'Africa/Kampala'})}</p>
            </div>
            <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none">
              <h3 style="color:#006B3C">Platform Summary</h3>
              <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
                <tr><td style="padding:4px 8px;color:#555">Total Lenders</td><td style="padding:4px 8px;font-weight:bold">${summary.total_lenders}</td></tr>
                <tr><td style="padding:4px 8px;color:#555">Active Rentals</td><td style="padding:4px 8px;font-weight:bold">${summary.active_rentals}</td></tr>
                <tr><td style="padding:4px 8px;color:#555">Total Earnings</td><td style="padding:4px 8px;font-weight:bold">UGX ${summary.total_earnings_ugx.toLocaleString()}</td></tr>
                <tr><td style="padding:4px 8px;color:#555">Avg Asset Utilisation</td><td style="padding:4px 8px;font-weight:bold">${summary.avg_utilisation_pct}%</td></tr>
                <tr><td style="padding:4px 8px;color:#555">Avg Payment Health</td><td style="padding:4px 8px;font-weight:bold">${summary.avg_payment_health_pct}%</td></tr>
              </table>
              <h3 style="color:#006B3C">Top Lenders by Earnings</h3>
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead><tr style="background:#f3f4f6">
                  <th style="padding:6px 8px;text-align:left">Lender</th>
                  <th style="padding:6px 8px;text-align:right">Earnings</th>
                  <th style="padding:6px 8px;text-align:right">Utilisation</th>
                  <th style="padding:6px 8px;text-align:right">Payment Health</th>
                  <th style="padding:6px 8px;text-align:right">Active</th>
                  <th style="padding:6px 8px;text-align:right">Downtime</th>
                </tr></thead>
                <tbody>${topLenders}</tbody>
              </table>
            </div>
          </div>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: body.email_to,
          subject: `Pipiya Lender Rental Report — ${new Date().toLocaleDateString('en-UG',{timeZone:'Africa/Kampala'})}`,
          body: emailBody,
        }).catch(() => null);
      }

      return Response.json({ summary, lender_reports: lenderReports, csv });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});