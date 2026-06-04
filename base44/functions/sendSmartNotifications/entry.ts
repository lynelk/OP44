import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role for scheduled/automated runs
    const allUsers = await base44.asServiceRole.entities.User.list();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let notificationsSent = 0;

    // Pre-fetch all data in bulk to avoid N+1 queries per user
    const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const monthStartISO = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const isMonday = today.getDay() === 1;
    const isPastTwentieth = today.getDate() >= 20;

    const [allMembers, allGroups, allContributions, allBudgets, allExpenses, allLoans] = await Promise.all([
      base44.asServiceRole.entities.GroupMember.filter({ status: 'active' }),
      base44.asServiceRole.entities.SavingsGroup.filter({ status: 'active' }),
      base44.asServiceRole.entities.GroupContribution.filter({ created_date: { $gte: monthStartISO } }, '-created_date', 5000),
      base44.asServiceRole.entities.BudgetCategory.filter({ month_year: monthYear }),
      base44.asServiceRole.entities.Expense.filter({ date: { $gte: monthStart, $lte: monthEnd } }, '-date', 10000),
      base44.asServiceRole.entities.LoanApplication.filter({ status: 'active' }, '-created_date', 5000),
    ]);

    // Build lookup maps
    const groupMap = {};
    allGroups.forEach(g => { groupMap[g.id] = g; });

    const contribByGroupUser = {};
    allContributions.forEach(c => {
      const key = `${c.group_id}:${c.user_id}`;
      if (!contribByGroupUser[key]) contribByGroupUser[key] = [];
      contribByGroupUser[key].push(c);
    });

    const expensesByUser = {};
    allExpenses.forEach(e => {
      if (!expensesByUser[e.user_id]) expensesByUser[e.user_id] = [];
      expensesByUser[e.user_id].push(e);
    });

    const loansByUser = {};
    allLoans.forEach(l => {
      if (!loansByUser[l.user_id]) loansByUser[l.user_id] = [];
      loansByUser[l.user_id].push(l);
    });

    const membersByUser = {};
    allMembers.forEach(m => {
      if (!membersByUser[m.user_id]) membersByUser[m.user_id] = [];
      membersByUser[m.user_id].push(m);
    });

    const budgetsByUser = {};
    allBudgets.forEach(b => {
      if (!budgetsByUser[b.user_id]) budgetsByUser[b.user_id] = [];
      budgetsByUser[b.user_id].push(b);
    });

    // Process users in batches of 20
    const BATCH_SIZE = 20;
    for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
      const batch = allUsers.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (user) => {
        const userId = user.id;

        // ── 1. SAVINGS CIRCLE CONTRIBUTION DUE DATES ──────────────────────────
        if (isPastTwentieth) {
          const memberships = membersByUser[userId] || [];
          for (const membership of memberships) {
            const g = groupMap[membership.group_id];
            if (!g) continue;
            const key = `${g.id}:${userId}`;
            const thisMonthContribs = (contribByGroupUser[key] || []).filter(c => c.created_date >= monthStartISO);
            if (thisMonthContribs.length === 0) {
              await base44.asServiceRole.entities.Notification.create({
                user_id: userId,
                title: '💰 Savings Circle Reminder',
                body: `Don't forget your monthly contribution to "${g.name}"! Due by end of month.`,
                type: 'rosca_contribution',
                is_read: false,
                action_url: `/savings-groups/${g.id}`,
              });
              notificationsSent++;
            }
          }
        }

        // ── 2. BUDGET OVERSPENDING ALERTS ─────────────────────────────────────
        const budgetLimits = budgetsByUser[userId] || [];
        const userExpenses = (expensesByUser[userId] || []).filter(e => e.date >= monthStart && e.date <= monthEnd);
        for (const budget of budgetLimits) {
          const catExpenses = userExpenses.filter(e => e.category === budget.category);
          const totalSpent = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
          const pct = budget.monthly_limit > 0 ? (totalSpent / budget.monthly_limit) * 100 : 0;
          const threshold = budget.alert_threshold || 80;
          if (pct >= 100) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: userId,
              title: `🚨 Budget Exceeded: ${budget.category.replace('_', ' ')}`,
              body: `You've spent UGX ${totalSpent.toLocaleString()} — ${Math.round(pct)}% of your ${budget.category.replace('_', ' ')} budget (UGX ${budget.monthly_limit.toLocaleString()}).`,
              type: 'nudge', is_read: false, action_url: '/budget',
            });
            notificationsSent++;
          } else if (pct >= threshold) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: userId,
              title: `⚠️ Budget Warning: ${budget.category.replace('_', ' ')}`,
              body: `You've used ${Math.round(pct)}% of your ${budget.category.replace('_', ' ')} budget this month. UGX ${(budget.monthly_limit - totalSpent).toLocaleString()} remaining.`,
              type: 'nudge', is_read: false, action_url: '/budget',
            });
            notificationsSent++;
          }
        }

        // ── 3. DEBT PAYOFF PROGRESS REMINDERS (Mondays only) ──────────────────
        if (isMonday) {
          const activeLoans = (loansByUser[userId] || []).filter(l => ['active', 'disbursed', 'overdue'].includes(l.status));
          if (activeLoans.length > 0) {
            const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0);
            await base44.asServiceRole.entities.Notification.create({
              user_id: userId,
              title: '📊 Weekly Debt Payoff Check-in',
              body: `You have ${activeLoans.length} active loan(s) with UGX ${totalOutstanding.toLocaleString()} outstanding. Check your debt payoff strategy!`,
              type: 'nudge', is_read: false, action_url: '/debt-payoff',
            });
            notificationsSent++;
          }
        }
      }));
    }

    return Response.json({ success: true, notifications_sent: notificationsSent, run_at: today.toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});