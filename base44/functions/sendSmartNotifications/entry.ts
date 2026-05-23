import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role for scheduled/automated runs
    const allUsers = await base44.asServiceRole.entities.User.list();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let notificationsSent = 0;

    for (const user of allUsers) {
      const userId = user.id;
      const userEmail = user.email;
      const userName = user.full_name || 'there';

      // ── 1. SAVINGS CIRCLE CONTRIBUTION DUE DATES ──────────────────────────
      try {
        const memberships = await base44.asServiceRole.entities.GroupMember.filter({ user_id: userId, status: 'active' });
        for (const membership of memberships) {
          const group = await base44.asServiceRole.entities.SavingsGroup.filter({ id: membership.group_id });
          const g = group[0];
          if (!g || g.status !== 'active') continue;

          // Check if user has contributed this month
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
          const contributions = await base44.asServiceRole.entities.GroupContribution.filter({ group_id: g.id, user_id: userId });
          const thisMonthContribs = contributions.filter(c => c.created_date >= monthStart);

          // Alert if no contribution yet and we're past the 20th of the month
          if (thisMonthContribs.length === 0 && today.getDate() >= 20) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: userId,
              title: '💰 Savings Circle Reminder',
              message: `Don't forget your monthly contribution to "${g.name}"! Due by end of month.`,
              type: 'savings_reminder',
              is_read: false,
              action_url: `/savings-groups/${g.id}`,
            });
            notificationsSent++;
          }
        }
      } catch (_) { /* skip if no groups */ }

      // ── 2. BUDGET OVERSPENDING ALERTS ─────────────────────────────────────
      try {
        const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const budgetLimits = await base44.asServiceRole.entities.BudgetCategory.filter({ user_id: userId, month_year: monthYear });

        for (const budget of budgetLimits) {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
          const expenses = await base44.asServiceRole.entities.Expense.filter({ user_id: userId, category: budget.category });
          const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
          const totalSpent = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
          const pct = budget.monthly_limit > 0 ? (totalSpent / budget.monthly_limit) * 100 : 0;
          const threshold = budget.alert_threshold || 80;

          if (pct >= 100) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: userId,
              title: `🚨 Budget Exceeded: ${budget.category.replace('_', ' ')}`,
              message: `You've spent UGX ${totalSpent.toLocaleString()} — ${Math.round(pct)}% of your ${budget.category.replace('_', ' ')} budget (UGX ${budget.monthly_limit.toLocaleString()}).`,
              type: 'budget_alert',
              is_read: false,
              action_url: '/budget',
            });
            notificationsSent++;
          } else if (pct >= threshold) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: userId,
              title: `⚠️ Budget Warning: ${budget.category.replace('_', ' ')}`,
              message: `You've used ${Math.round(pct)}% of your ${budget.category.replace('_', ' ')} budget this month. UGX ${(budget.monthly_limit - totalSpent).toLocaleString()} remaining.`,
              type: 'budget_warning',
              is_read: false,
              action_url: '/budget',
            });
            notificationsSent++;
          }
        }
      } catch (_) { /* skip if no budgets */ }

      // ── 3. DEBT PAYOFF PROGRESS REMINDERS ─────────────────────────────────
      try {
        const loans = await base44.asServiceRole.entities.LoanApplication.filter({ user_id: userId });
        const activeLoans = loans.filter(l => ['active', 'disbursed', 'overdue'].includes(l.status));

        if (activeLoans.length > 0) {
          // Only remind on Mondays (day 1) to avoid spam
          if (today.getDay() === 1) {
            const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0);
            await base44.asServiceRole.entities.Notification.create({
              user_id: userId,
              title: '📊 Weekly Debt Payoff Check-in',
              message: `You have ${activeLoans.length} active loan(s) with UGX ${totalOutstanding.toLocaleString()} outstanding. Check your debt payoff strategy!`,
              type: 'debt_reminder',
              is_read: false,
              action_url: '/debt-payoff',
            });
            notificationsSent++;
          }
        }
      } catch (_) { /* skip if no loans */ }
    }

    return Response.json({ success: true, notifications_sent: notificationsSent, run_at: today.toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});