import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { loan_id, action, rejection_reason } = body;

  if (!loan_id || !action) return Response.json({ error: 'Missing loan_id or action' }, { status: 400 });

  const loans = await base44.asServiceRole.entities.LoanApplication.filter({});
  const loan = loans.find(l => l.id === loan_id);
  if (!loan) return Response.json({ error: 'Loan not found' }, { status: 404 });

  const now = new Date().toISOString();

  if (action === 'approve') {
    if (!['submitted', 'under_review'].includes(loan.status)) {
      return Response.json({ error: 'Loan cannot be approved in current status' }, { status: 400 });
    }
    await base44.asServiceRole.entities.LoanApplication.update(loan_id, {
      status: 'approved',
      amount_approved: loan.amount_requested,
    });
    await base44.asServiceRole.entities.Notification.create({
      user_id: loan.user_id,
      title: '🎉 Loan Approved!',
      body: `Your loan of UGX ${loan.amount_requested?.toLocaleString()} has been approved! Disbursement is being processed.`,
      type: 'loan_approved',
      is_read: false,
    });
    return Response.json({ success: true, message: 'Loan approved' });
  }

  if (action === 'reject') {
    await base44.asServiceRole.entities.LoanApplication.update(loan_id, {
      status: 'rejected',
      admin_notes: rejection_reason || 'Application does not meet criteria',
    });
    await base44.asServiceRole.entities.Notification.create({
      user_id: loan.user_id,
      title: 'Loan Application Update',
      body: `Your loan application was not approved at this time. ${rejection_reason || 'Please improve your credit score and try again.'}`,
      type: 'loan_rejected',
      is_read: false,
    });
    return Response.json({ success: true, message: 'Loan rejected' });
  }

  if (action === 'disburse') {
    if (loan.status !== 'approved') {
      return Response.json({ error: 'Loan must be approved before disbursement' }, { status: 400 });
    }

    const amount = loan.amount_approved || loan.amount_requested;
    const tenure = loan.tenure_months || 3;
    const interestRate = loan.interest_rate ? loan.interest_rate / 100 : 0.05;
    const r = interestRate;

    // Loyalty points discount on disbursement fee
    let disbursementFee = amount * 0.03;
    let feeDiscount = loan.fee_discount_applied || 0;

    // If apply_loyalty_points flag is set and no discount yet applied, process it now
    if (loan.apply_loyalty_points && !feeDiscount) {
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: loan.user_id });
      const profile = profiles[0];
      if (profile && profile.loyalty_points > 0) {
        const POINTS_PER_UGX = 0.01;
        const maxDiscount = Math.floor(disbursementFee * 0.5);
        const potentialDiscount = Math.floor(profile.loyalty_points / POINTS_PER_UGX);
        feeDiscount = Math.min(potentialDiscount, maxDiscount);
        const pointsUsed = Math.ceil(feeDiscount * POINTS_PER_UGX);

        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          loyalty_points: Math.max(0, profile.loyalty_points - pointsUsed),
        });

        await base44.asServiceRole.entities.LoanApplication.update(loan_id, {
          points_redeemed_for_fees: pointsUsed,
          fee_discount_applied: feeDiscount,
        });
      }
    }

    disbursementFee = Math.max(0, disbursementFee - feeDiscount);
    const insuranceCost = amount * 0.01;
    const netDisbursement = amount - disbursementFee - insuranceCost;

    // Proper amortization formula: M = P*r*(1+r)^n / ((1+r)^n - 1)
    const monthly = r === 0
      ? amount / tenure
      : (amount * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
    const totalRepayable = monthly * tenure;

    // Repayment schedule
    const repaymentSchedule = [];
    for (let i = 1; i <= tenure; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      repaymentSchedule.push({
        loan_id,
        user_id: loan.user_id,
        amount: Math.round(monthly),
        due_date: dueDate.toISOString().split('T')[0],
        status: 'scheduled',
      });
    }
    for (const rep of repaymentSchedule) {
      await base44.asServiceRole.entities.Repayment.create(rep);
    }

    const nextRepayDate = new Date();
    nextRepayDate.setMonth(nextRepayDate.getMonth() + 1);

    await base44.asServiceRole.entities.LoanApplication.update(loan_id, {
      status: 'disbursed',
      disbursed_at: now,
      disbursement_fee: disbursementFee,
      insurance_cost: insuranceCost,
      net_disbursement: netDisbursement,
      total_repayable: totalRepayable,
      monthly_installment: Math.round(monthly),
      outstanding_balance: totalRepayable,
      next_repayment_date: nextRepayDate.toISOString().split('T')[0],
      interest_rate: interestRate * 100,
    });

    await base44.asServiceRole.entities.Notification.create({
      user_id: loan.user_id,
      title: '💸 Loan Disbursed!',
      body: `UGX ${netDisbursement?.toLocaleString()} has been sent to your mobile money account. First repayment of UGX ${Math.round(monthly)?.toLocaleString()} due ${nextRepayDate.toLocaleDateString()}.${feeDiscount > 0 ? ` Loyalty discount of UGX ${feeDiscount.toLocaleString()} applied!` : ''}`,
      type: 'loan_approved',
      is_read: false,
    });

    // Award referral points for both referrer and invitee
    try {
      await base44.asServiceRole.functions.invoke('referralEngine', {
        action: 'award_on_disbursement',
        loan_id,
        borrower_user_id: loan.user_id,
      });
    } catch (_) { /* non-critical */ }

    return Response.json({
      success: true,
      message: 'Loan disbursed successfully',
      net_disbursement: netDisbursement,
      fee_discount_applied: feeDiscount,
      monthly_installment: Math.round(monthly),
      repayment_schedule_created: tenure,
    });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});