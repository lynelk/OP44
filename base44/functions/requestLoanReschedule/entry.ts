import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { loan_id, requested_tenure_months, reason } = await req.json();
    if (!loan_id || !requested_tenure_months || !reason) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the loan
    const loans = await base44.entities.LoanApplication.filter({ id: loan_id, user_id: user.id });
    const loan = loans[0];
    if (!loan) return Response.json({ error: 'Loan not found' }, { status: 404 });
    if (!['active', 'disbursed'].includes(loan.status)) {
      return Response.json({ error: 'Only active loans can be rescheduled' }, { status: 400 });
    }

    // Check no pending request exists
    const existing = await base44.entities.LoanRescheduleRequest.filter({ loan_id, status: 'pending' });
    if (existing.length > 0) {
      return Response.json({ error: 'A pending reschedule request already exists for this loan' }, { status: 400 });
    }

    const balance = loan.outstanding_balance || loan.total_repayable || loan.amount_requested;
    const monthlyRate = (loan.interest_rate || 5) / 100;
    let proposed_monthly_installment;
    if (monthlyRate === 0) {
      proposed_monthly_installment = balance / requested_tenure_months;
    } else {
      proposed_monthly_installment = (balance * monthlyRate * Math.pow(1 + monthlyRate, requested_tenure_months))
        / (Math.pow(1 + monthlyRate, requested_tenure_months) - 1);
    }
    const proposed_total_repayable = proposed_monthly_installment * requested_tenure_months;

    const rescheduleRequest = await base44.entities.LoanRescheduleRequest.create({
      loan_id,
      user_id: user.id,
      original_tenure_months: loan.tenure_months,
      original_monthly_installment: loan.monthly_installment,
      outstanding_balance: balance,
      requested_tenure_months,
      proposed_monthly_installment: Math.round(proposed_monthly_installment),
      proposed_total_repayable: Math.round(proposed_total_repayable),
      reason,
      status: 'pending',
      requested_date: new Date().toISOString(),
    });

    // Notify user
    await base44.entities.Notification.create({
      user_id: user.id,
      title: 'Reschedule Request Submitted',
      message: `Your loan reschedule request has been submitted and is under review.`,
      type: 'info',
      is_read: false,
    });

    return Response.json({ success: true, reschedule_request: rescheduleRequest });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});