import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const [expenses, goals, loans] = await Promise.all([
      base44.entities.Expense.filter({ user_id: user.id }),
      base44.entities.SavingsGoal.filter({ user_id: user.id }),
      base44.entities.LoanApplication.filter({ user_id: user.id }),
    ]);

    const thisMonthExp = expenses.filter(e => e.date?.startsWith(currentMonth));
    const lastMonthExp = expenses.filter(e => e.date?.startsWith(lastMonth));

    const byCategory = {};
    thisMonthExp.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
    });

    const lastByCategory = {};
    lastMonthExp.forEach(e => {
      lastByCategory[e.category] = (lastByCategory[e.category] || 0) + (e.amount || 0);
    });

    const totalThisMonth = thisMonthExp.reduce((s, e) => s + (e.amount || 0), 0);
    const totalLastMonth = lastMonthExp.reduce((s, e) => s + (e.amount || 0), 0);

    const tips = [];
    const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);

    // Tip: biggest spending category
    if (sorted.length > 0) {
      const [topCat, topAmt] = sorted[0];
      const pct = totalThisMonth > 0 ? Math.round((topAmt / totalThisMonth) * 100) : 0;
      if (pct > 35) {
        tips.push({
          icon: '⚠️',
          type: 'warning',
          title: `High ${topCat.replace('_', ' ')} spend`,
          body: `${topCat.replace('_', ' ')} accounts for ${pct}% of this month's spending (UGX ${topAmt.toLocaleString()}). Consider setting a budget limit.`,
        });
      }
    }

    // Tip: spending up vs last month
    if (totalLastMonth > 0 && totalThisMonth > totalLastMonth * 1.2) {
      const increase = Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100);
      tips.push({
        icon: '📈',
        type: 'warning',
        title: 'Spending up this month',
        body: `You've spent ${increase}% more than last month. UGX ${(totalThisMonth - totalLastMonth).toLocaleString()} extra so far.`,
      });
    }

    // Tip: entertainment spending
    if (byCategory['entertainment'] > 100000) {
      tips.push({
        icon: '🎬',
        type: 'tip',
        title: 'Cut entertainment costs',
        body: `You spent UGX ${byCategory['entertainment'].toLocaleString()} on entertainment this month. A 20% reduction would free up UGX ${Math.round(byCategory['entertainment'] * 0.2).toLocaleString()}.`,
      });
    }

    // Tip: slow savings goals
    const slowGoals = goals.filter(g => {
      if (g.status !== 'active' || g.target_amount <= 0) return false;
      const pct = (g.current_amount || 0) / g.target_amount;
      return pct < 0.15 && g.automation_type === 'none';
    });
    if (slowGoals.length > 0) {
      tips.push({
        icon: '🎯',
        type: 'action',
        title: 'Automate your savings',
        body: `"${slowGoals[0].name}" is progressing slowly. Enable auto round-ups or a fixed daily transfer to reach your goal faster.`,
      });
    }

    // Tip: near-completion goals
    const nearDone = goals.find(g => {
      if (g.status !== 'active' || g.target_amount <= 0) return false;
      const pct = (g.current_amount || 0) / g.target_amount;
      return pct >= 0.8 && pct < 1;
    });
    if (nearDone) {
      const remaining = nearDone.target_amount - (nearDone.current_amount || 0);
      tips.push({
        icon: '🏆',
        type: 'positive',
        title: `Almost there on "${nearDone.name}"`,
        body: `Only UGX ${remaining.toLocaleString()} left to complete this goal. One final push and you're done!`,
      });
    }

    // Tip: no savings goal set
    if (goals.filter(g => g.status === 'active').length === 0) {
      tips.push({
        icon: '💡',
        type: 'action',
        title: 'Create a savings goal',
        body: 'You have no active savings goals. Start small — even a UGX 50,000 emergency fund makes a big difference.',
      });
    }

    // Tip: active loan repayment advice
    const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'disbursed');
    if (activeLoans.length > 0 && totalThisMonth > 0) {
      const totalRepayments = activeLoans.reduce((s, l) => s + (l.monthly_installment || 0), 0);
      const debtRatio = totalRepayments / (user.monthly_income || 1);
      if (user.monthly_income && debtRatio > 0.4) {
        tips.push({
          icon: '🔴',
          type: 'warning',
          title: 'High debt-to-income ratio',
          body: `Your loan repayments (UGX ${totalRepayments.toLocaleString()}/mo) exceed 40% of declared income. Avoid new loans until balance is reduced.`,
        });
      }
    }

    // Positive: good month
    if (totalThisMonth < totalLastMonth * 0.85 && totalLastMonth > 0) {
      tips.push({
        icon: '🌟',
        type: 'positive',
        title: 'Great financial discipline!',
        body: `You're spending less than last month. UGX ${(totalLastMonth - totalThisMonth).toLocaleString()} saved so far this month. Keep it up!`,
      });
    }

    if (tips.length === 0) {
      tips.push({
        icon: '📊',
        type: 'tip',
        title: 'Keep tracking',
        body: 'Log more transactions to unlock personalised insights and spending analysis.',
      });
    }

    return Response.json({ success: true, tips: tips.slice(0, 4) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});