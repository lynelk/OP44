import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date().toISOString().split('T')[0];

    // Find all scheduled repayments with due_date < today
    const allScheduled = await base44.asServiceRole.entities.Repayment.filter({ status: 'scheduled' });
    const overdue = allScheduled.filter(r => r.due_date < today);

    let flagged = 0;
    let reminders = 0;

    // Batch-fetch all affected loans in one query to avoid N+1
    const affectedLoanIds = [...new Set(overdue.map(r => r.loan_id))];
    const allAffectedLoans = await base44.asServiceRole.entities.LoanApplication.filter({});
    const loanMap = {};
    allAffectedLoans.forEach(l => { loanMap[l.id] = l; });

    // Process in parallel batches of 10 to avoid timeout
    const BATCH_SIZE = 10;
    for (let i = 0; i < overdue.length; i += BATCH_SIZE) {
      const batch = overdue.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (repayment) => {
        await base44.asServiceRole.entities.Repayment.update(repayment.id, { status: 'overdue' });

        const loan = loanMap[repayment.loan_id];
        if (!loan) return;
        if (['closed', 'defaulted', 'flagged'].includes(loan.status)) return;

        const reminderCount = (loan.reminder_count || 0) + 1;
        const daysOverdue = Math.floor((new Date(today) - new Date(repayment.due_date)) / (1000 * 60 * 60 * 24));
        const shouldFlag = reminderCount >= 3 || daysOverdue >= 14;

        await base44.asServiceRole.entities.LoanApplication.update(loan.id, {
          reminder_count: reminderCount,
          last_reminder_sent_date: new Date().toISOString(),
          ...(shouldFlag && { status: 'flagged', escalated_to_collections: true }),
        });

        const message = shouldFlag
          ? `⚠️ Your loan repayment of UGX ${repayment.amount?.toLocaleString()} is ${daysOverdue} days overdue. Your account has been escalated to our collections team. Please contact us immediately.`
          : `Reminder ${reminderCount}: Your loan repayment of UGX ${repayment.amount?.toLocaleString()} was due on ${repayment.due_date}. Please make payment to avoid account escalation.`;

        await base44.asServiceRole.entities.Notification.create({
          user_id: loan.user_id,
          title: shouldFlag ? '🚨 Loan Escalated to Collections' : `⏰ Payment Reminder #${reminderCount}`,
          message,
          type: shouldFlag ? 'error' : 'warning',
          is_read: false,
        });

        if (shouldFlag) flagged++;
        else reminders++;
      }));
    }

    return Response.json({
      success: true,
      overdue_repayments: overdue.length,
      reminders_sent: reminders,
      loans_flagged: flagged,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});