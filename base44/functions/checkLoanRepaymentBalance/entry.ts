import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const requestedUserId = body.user_id;
  // P0: reject cross-user balance disclosure unless caller is admin
  if (requestedUserId && requestedUserId !== user.id && user.admin_tier == null) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const targetUserId = requestedUserId || user.id;

  // Get active/disbursed loans for user
  const loans = await base44.asServiceRole.entities.LoanApplication.filter({ user_id: targetUserId });
  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'disbursed');

  if (!activeLoans.length) return Response.json({ checked: 0, alerts: 0 });

  // Get upcoming repayments (scheduled, not paid) due within 7 days
  const today = new Date();
  const in7days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split('T')[0];
  const in7Str = in7days.toISOString().split('T')[0];

  const allRepayments = await base44.asServiceRole.entities.Repayment.filter({ user_id: targetUserId });
  const upcomingRepayments = allRepayments.filter(r =>
    r.status === 'scheduled' &&
    r.due_date >= todayStr &&
    r.due_date <= in7Str
  );

  if (!upcomingRepayments.length) return Response.json({ checked: activeLoans.length, alerts: 0, message: 'No upcoming repayments' });

  // Total upcoming due
  const totalDue = upcomingRepayments.reduce((sum, r) => sum + (r.amount || 0), 0);
  const nextRepayment = upcomingRepayments.sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  // Get total savings balance
  const pockets = await base44.asServiceRole.entities.SavingsPocket.filter({ user_id: targetUserId });
  const totalBalance = pockets.reduce((sum, p) => sum + (p.current_balance || 0), 0);

  let alertsCreated = 0;

  if (totalBalance < totalDue) {
    const shortfall = totalDue - totalBalance;
    // Avoid duplicate alerts within same day
    const existing = await base44.asServiceRole.entities.Notification.filter({ user_id: targetUserId, type: 'repayment_due' });
    const alreadySent = existing.some(n => n.created_date?.startsWith(todayStr));

    if (!alreadySent) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: targetUserId,
        title: `⚠️ Low Balance for Loan Repayment`,
        body: `Your savings balance (UGX ${totalBalance.toLocaleString()}) is below your upcoming repayment of UGX ${totalDue.toLocaleString()} due on ${nextRepayment.due_date}. You need UGX ${shortfall.toLocaleString()} more.`,
        type: 'repayment_due',
        priority: 'urgent',
        is_read: false,
        action_url: '/loans/repay',
      });
      alertsCreated++;
    }
  } else if (totalBalance < totalDue * 1.2) {
    // Warn if balance is tight (within 20% margin)
    const existing = await base44.asServiceRole.entities.Notification.filter({ user_id: targetUserId, type: 'repayment_due' });
    const alreadySent = existing.some(n => n.created_date?.startsWith(todayStr) && n.title?.includes('Reminder'));
    if (!alreadySent) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: targetUserId,
        title: `📅 Repayment Reminder`,
        body: `You have a loan repayment of UGX ${totalDue.toLocaleString()} due on ${nextRepayment.due_date}. Your current savings balance is UGX ${totalBalance.toLocaleString()}.`,
        type: 'repayment_due',
        priority: 'high',
        is_read: false,
        action_url: '/loans/repay',
      });
      alertsCreated++;
    }
  }

  return Response.json({
    total_balance: totalBalance,
    total_due: totalDue,
    next_due_date: nextRepayment.due_date,
    alerts_created: alertsCreated,
  });
});