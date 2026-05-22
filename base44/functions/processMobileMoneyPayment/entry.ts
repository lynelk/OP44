import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { loan_id, amount, phone_number, provider, pin } = body;

  if (!loan_id || !amount || !phone_number || !provider) {
    return Response.json({ error: 'Missing required fields: loan_id, amount, phone_number, provider' }, { status: 400 });
  }

  const loan = await base44.entities.LoanApplication.filter({ user_id: user.id });
  const targetLoan = loan.find(l => l.id === loan_id);
  if (!targetLoan) return Response.json({ error: 'Loan not found' }, { status: 404 });

  if (!['active', 'disbursed'].includes(targetLoan.status)) {
    return Response.json({ error: 'Loan is not active' }, { status: 400 });
  }

  const payAmount = parseFloat(amount);
  if (payAmount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

  // Simulate provider-specific processing delay
  const txnRef = `${provider.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const today = new Date().toISOString().split('T')[0];

  // Simulate random success (95% success rate for realism)
  const success = Math.random() > 0.05;
  if (!success) {
    return Response.json({
      success: false,
      error: 'Transaction declined by mobile money provider. Please try again.',
      txn_ref: txnRef,
    }, { status: 200 });
  }

  // Find next scheduled/overdue repayment
  const repayments = await base44.entities.Repayment.filter({ loan_id });
  const nextDue = repayments
    .filter(r => r.status === 'scheduled' || r.status === 'overdue')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

  if (nextDue) {
    await base44.entities.Repayment.update(nextDue.id, {
      status: 'paid',
      paid_date: today,
      payment_method: 'mobile_money',
      transaction_ref: txnRef,
    });
  } else {
    await base44.entities.Repayment.create({
      loan_id,
      user_id: user.id,
      amount: payAmount,
      due_date: today,
      paid_date: today,
      status: 'paid',
      payment_method: 'mobile_money',
      transaction_ref: txnRef,
    });
  }

  // Update loan balance
  const newBalance = Math.max(0, (targetLoan.outstanding_balance || targetLoan.total_repayable || 0) - payAmount);
  const newStatus = newBalance <= 0 ? 'closed' : targetLoan.status;

  await base44.entities.LoanApplication.update(loan_id, {
    outstanding_balance: newBalance,
    status: newStatus,
  });

  // Create notification
  await base44.asServiceRole.entities.Notification.create({
    user_id: user.id,
    title: 'Loan Repayment Received',
    message: `UGX ${payAmount.toLocaleString()} repayment via ${provider.toUpperCase()} processed. Ref: ${txnRef}. ${newBalance > 0 ? `Remaining balance: UGX ${newBalance.toLocaleString()}` : 'Loan fully repaid!'}`,
    type: 'payment',
    is_read: false,
  });

  return Response.json({
    success: true,
    txn_ref: txnRef,
    provider,
    amount_paid: payAmount,
    new_balance: newBalance,
    loan_closed: newBalance <= 0,
    timestamp: new Date().toISOString(),
  });
});