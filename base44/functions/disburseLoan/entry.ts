import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { loan_id, action, rejection_reason } = body; // action: 'approve' | 'reject' | 'disburse'

  if (!loan_id || !action) return Response.json({ error: 'Missing loan_id or action' }, { status: 400 });

  const loans = await base44.asServiceRole.entities.LoanApplication.filter({});
  const loan = loans.find(l => l.id === loan_id);
  if (!loan) return Response.json({ error: 'Loan not found' }, { status: 404 });

  const today = new Date().toISOString().split('T')[0];
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
      message: `Your loan of UGX ${loan.amount_requested?.toLocaleString()} has been approved! Disbursement is being processed.`,
      type: 'loan',
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
      message: `Your loan application was not approved at this time. ${rejection_reason || 'Please improve your credit score and try again.'}`,
      type: 'loan',
      is_read: false,
    });
    return Response.json({ success: true, message: 'Loan rejected' });
  }

  if (action === 'disburse') {
    if (loan.status !== 'approved') {
      return Response.json({ error: 'Loan must be approved before disbursement' }, { status: 400 });
    }

    const amount = loan.amount_approved || loan.amount_requested;
    const disbursementFee = amount * 0.03;
    const insuranceCost = amount * 0.01;
    const netDisbursement = amount - disbursementFee - insuranceCost;
    const tenure = loan.tenure_months || 3;
    const interestRate = 0.05; // 5% monthly
    const totalRepayable = amount * Math.pow(1 + interestRate, tenure);
    const monthly = totalRepayable / tenure;

    // Create repayment schedule
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
      message: `UGX ${netDisbursement?.toLocaleString()} has been sent to your mobile money account. Your first repayment of UGX ${Math.round(monthly)?.toLocaleString()} is due on ${nextRepayDate.toLocaleDateString()}.`,
      type: 'loan',
      is_read: false,
    });

    return Response.json({
      success: true,
      message: 'Loan disbursed successfully',
      net_disbursement: netDisbursement,
      monthly_installment: Math.round(monthly),
      repayment_schedule_created: tenure,
    });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});