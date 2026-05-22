import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  // Called from automation with entity event payload, or manually for a user
  const userId = body?.data?.user_id || user.id;
  const triggeredCategory = body?.data?.category;

  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startOfMonth = `${monthYear}-01`;

  // Get budget limits for this user
  const budgets = await base44.asServiceRole.entities.BudgetCategory.filter({ user_id: userId });
  if (!budgets.length) return Response.json({ checked: 0, alerts_created: 0 });

  // Get expenses this month
  const allExpenses = await base44.asServiceRole.entities.Expense.filter({ user_id: userId });
  const thisMonthExpenses = allExpenses.filter(e => e.date >= startOfMonth);

  let alertsCreated = 0;

  for (const budget of budgets) {
    // If triggered by specific expense, only check that category
    if (triggeredCategory && budget.category !== triggeredCategory) continue;

    const spent = thisMonthExpenses
      .filter(e => e.category === budget.category)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const threshold = budget.alert_threshold || 80;
    const pct = budget.monthly_limit > 0 ? (spent / budget.monthly_limit) * 100 : 0;

    if (pct >= threshold && pct < 100) {
      // Check we haven't already sent this alert this month
      const existingAlerts = await base44.asServiceRole.entities.Notification.filter({
        user_id: userId,
        type: 'nudge',
      });
      const alreadyAlerted = existingAlerts.some(n =>
        n.title?.includes(budget.category) &&
        n.created_date?.startsWith(monthYear)
      );
      if (!alreadyAlerted) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: userId,
          title: `⚠️ ${budget.category.charAt(0).toUpperCase() + budget.category.slice(1)} Budget ${pct.toFixed(0)}% Used`,
          body: `You've spent UGX ${spent.toLocaleString()} of your UGX ${budget.monthly_limit.toLocaleString()} ${budget.category} budget this month. Consider slowing down.`,
          type: 'nudge',
          priority: pct >= 95 ? 'urgent' : 'high',
          is_read: false,
          action_url: '/budget',
        });
        alertsCreated++;
      }
    } else if (pct >= 100) {
      const existingOver = await base44.asServiceRole.entities.Notification.filter({ user_id: userId, type: 'nudge' });
      const alreadyOver = existingOver.some(n =>
        n.title?.includes('exceeded') && n.title?.includes(budget.category) &&
        n.created_date?.startsWith(monthYear)
      );
      if (!alreadyOver) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: userId,
          title: `🚨 ${budget.category.charAt(0).toUpperCase() + budget.category.slice(1)} Budget Exceeded!`,
          body: `You've exceeded your ${budget.category} budget! Spent UGX ${spent.toLocaleString()} vs limit of UGX ${budget.monthly_limit.toLocaleString()}.`,
          type: 'nudge',
          priority: 'urgent',
          is_read: false,
          action_url: '/budget',
        });
        alertsCreated++;
      }
    }
  }

  return Response.json({ checked: budgets.length, alerts_created: alertsCreated, month: monthYear });
});