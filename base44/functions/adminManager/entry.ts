import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { action, entity, data, id, query } = body;

  // ---- USER MANAGEMENT ----
  if (entity === 'users') {
    if (action === 'list') {
      const users = await base44.asServiceRole.entities.User.list('-created_date', body.limit || 100);
      // Fetch business profiles to enrich
      const bizProfiles = await base44.asServiceRole.entities.BusinessProfile.list();
      const bizMap = {};
      bizProfiles.forEach(b => { bizMap[b.user_id] = b; });
      const enriched = users.map(u => ({ ...u, business_profile: bizMap[u.id] || null }));
      return Response.json({ users: enriched });
    }
    if (action === 'update') {
      const updated = await base44.asServiceRole.entities.User.update(id, data);
      return Response.json({ user: updated });
    }
    if (action === 'get_stats') {
      const users = await base44.asServiceRole.entities.User.list();
      const loans = await base44.asServiceRole.entities.LoanApplication.list();
      const savings = await base44.asServiceRole.entities.SavingsPocket.list();
      return Response.json({
        total_users: users.length,
        active_loans: loans.filter(l => l.status === 'active' || l.status === 'disbursed').length,
        total_loan_value: loans.filter(l => l.status === 'active' || l.status === 'disbursed').reduce((s, l) => s + (l.outstanding_balance || l.amount_approved || 0), 0),
        total_savings: savings.reduce((s, p) => s + (p.current_balance || 0), 0),
      });
    }
  }

  // ---- BUSINESS PROFILES ----
  if (entity === 'business_profiles') {
    if (action === 'list') {
      const profiles = await base44.asServiceRole.entities.BusinessProfile.list('-created_date', 200);
      return Response.json({ profiles });
    }
    if (action === 'update') {
      const updated = await base44.asServiceRole.entities.BusinessProfile.update(id, data);
      return Response.json({ profile: updated });
    }
    if (action === 'create') {
      const created = await base44.asServiceRole.entities.BusinessProfile.create(data);
      return Response.json({ profile: created });
    }
  }

  // ---- BUSINESS RULES ----
  if (entity === 'business_rules') {
    if (action === 'list') {
      const rules = await base44.asServiceRole.entities.BusinessRule.list('-priority', 200);
      return Response.json({ rules });
    }
    if (action === 'create') {
      const created = await base44.asServiceRole.entities.BusinessRule.create({ ...data, created_by: user.email });
      return Response.json({ rule: created });
    }
    if (action === 'update') {
      const updated = await base44.asServiceRole.entities.BusinessRule.update(id, { ...data, last_modified_by: user.email });
      return Response.json({ rule: updated });
    }
    if (action === 'delete') {
      await base44.asServiceRole.entities.BusinessRule.delete(id);
      return Response.json({ success: true });
    }
    if (action === 'toggle') {
      const rules = await base44.asServiceRole.entities.BusinessRule.list();
      const rule = rules.find(r => r.id === id);
      if (rule) {
        const updated = await base44.asServiceRole.entities.BusinessRule.update(id, { is_active: !rule.is_active });
        return Response.json({ rule: updated });
      }
    }
  }

  // ---- INSURANCE PRODUCTS ----
  if (entity === 'insurance_products') {
    if (action === 'list') {
      const products = await base44.asServiceRole.entities.InsuranceProduct.list('-created_date', 100);
      return Response.json({ products });
    }
    if (action === 'create') {
      const created = await base44.asServiceRole.entities.InsuranceProduct.create(data);
      return Response.json({ product: created });
    }
    if (action === 'update') {
      const updated = await base44.asServiceRole.entities.InsuranceProduct.update(id, data);
      return Response.json({ product: updated });
    }
    if (action === 'delete') {
      await base44.asServiceRole.entities.InsuranceProduct.delete(id);
      return Response.json({ success: true });
    }
  }

  // ---- INVESTMENT POOLS ----
  if (entity === 'investment_pools') {
    if (action === 'list') {
      const pools = await base44.asServiceRole.entities.InvestmentPool.list('-created_date', 100);
      return Response.json({ pools });
    }
    if (action === 'create') {
      const created = await base44.asServiceRole.entities.InvestmentPool.create(data);
      return Response.json({ pool: created });
    }
    if (action === 'update') {
      const updated = await base44.asServiceRole.entities.InvestmentPool.update(id, data);
      return Response.json({ pool: updated });
    }
  }

  // ---- LOAN APPLICATIONS (ADMIN VIEW) ----
  if (entity === 'loans') {
    if (action === 'list') {
      const loans = await base44.asServiceRole.entities.LoanApplication.list('-created_date', body.limit || 200);
      return Response.json({ loans });
    }
    if (action === 'update') {
      const updated = await base44.asServiceRole.entities.LoanApplication.update(id, data);
      return Response.json({ loan: updated });
    }
  }

  // ---- CRB CHECK (mock / placeholder for real CRB API) ----
  if (entity === 'crb' && action === 'check') {
    const { user_id, national_id, business_name } = data;
    // In production this would call a real CRB API (e.g., Compuscan, CRB Africa, TransUnion)
    // For now we simulate a response and store it
    const mockScore = Math.floor(Math.random() * 300) + 500; // 500-800
    const report = {
      score: mockScore,
      risk_level: mockScore >= 700 ? 'low' : mockScore >= 600 ? 'medium' : 'high',
      inquiries_last_12m: Math.floor(Math.random() * 5),
      active_credit_facilities: Math.floor(Math.random() * 4),
      npa_history: mockScore < 600,
      checked_at: new Date().toISOString(),
    };
    // Store CRB result on business profile if available
    if (user_id) {
      const profiles = await base44.asServiceRole.entities.BusinessProfile.filter({ user_id });
      if (profiles.length > 0) {
        await base44.asServiceRole.entities.BusinessProfile.update(profiles[0].id, {
          crb_checked: true, crb_last_checked: report.checked_at, crb_score: report.score
        });
      }
      await base44.asServiceRole.entities.User.update(user_id, {
        current_credit_score: report.score,
        current_risk_band: report.risk_level === 'low' ? 'A' : report.risk_level === 'medium' ? 'B' : 'C'
      });
    }
    return Response.json({ report });
  }

  // ---- DATA SUBMISSION (Standardised export) ----
  if (entity === 'data_submission' && action === 'generate') {
    const { template_type, date_from, date_to } = data;
    const loans = await base44.asServiceRole.entities.LoanApplication.list();
    const users = await base44.asServiceRole.entities.User.list();
    const repayments = await base44.asServiceRole.entities.Repayment.list();

    let submissionData = {};

    if (template_type === 'crb_monthly') {
      // Format per CRB monthly submission standards
      submissionData = {
        submission_type: 'CRB_MONTHLY',
        generated_at: new Date().toISOString(),
        period: { from: date_from, to: date_to },
        total_accounts: loans.length,
        records: loans.map(loan => {
          const loanUser = users.find(u => u.id === loan.user_id) || {};
          const loanRepayments = repayments.filter(r => r.loan_id === loan.id);
          return {
            account_id: loan.id,
            national_id: loanUser.national_id || '',
            phone: loanUser.phone_number || '',
            loan_amount: loan.amount_approved || 0,
            outstanding: loan.outstanding_balance || 0,
            status: loan.status,
            on_time_payments: loanRepayments.filter(r => r.status === 'on_time').length,
            missed_payments: loanRepayments.filter(r => r.status === 'late' || r.status === 'missed').length,
            disbursement_date: loan.disbursed_at,
            next_payment_date: loan.next_repayment_date,
          };
        })
      };
    } else if (template_type === 'regulatory_summary') {
      submissionData = {
        submission_type: 'REGULATORY_SUMMARY',
        generated_at: new Date().toISOString(),
        period: { from: date_from, to: date_to },
        total_active_borrowers: loans.filter(l => l.status === 'active').length,
        total_disbursed: loans.filter(l => l.disbursed_at && l.disbursed_at >= date_from).reduce((s, l) => s + (l.amount_approved || 0), 0),
        total_collected: repayments.filter(r => r.paid_at >= date_from).reduce((s, r) => s + (r.amount || 0), 0),
        npa_count: loans.filter(l => l.status === 'defaulted').length,
        npa_value: loans.filter(l => l.status === 'defaulted').reduce((s, l) => s + (l.outstanding_balance || 0), 0),
      };
    }

    return Response.json({ submission: submissionData });
  }

  return Response.json({ error: 'Unknown action or entity' }, { status: 400 });
});