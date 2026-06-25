import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Rule-based budget shortfall prediction — no LLM credits consumed.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const expenses = await base44.entities.Expense.filter({ user_id: user.id });
  const budgets = await base44.entities.BudgetCategory.filter({ user_id: user.id });

  if (expenses.length === 0) {
    return Response.json({ message: 'Not enough data', forecasts: [], suggestions: [] });
  }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = monthKey(now);

  const budgetMap = {};
  budgets.forEach(b => { budgetMap[b.category] = b.monthly_limit; });

  // Group current month spend by category
  const currentSpend = {};
  expenses.forEach(e => {
    const d = new Date(e.date || e.created_date);
    if (monthKey(d) === currentMonth) {
      currentSpend[e.category] = (currentSpend[e.category] || 0) + (e.amount || 0);
    }
  });

  // Avg monthly spend per category over last 3 months
  const historicSpend = {};
  const historicCount = {};
  expenses.forEach(e => {
    const d = new Date(e.date || e.created_date);
    const mk = monthKey(d);
    if (mk !== currentMonth) {
      if (!historicSpend[e.category]) { historicSpend[e.category] = 0; historicCount[e.category] = new Set(); }
      historicSpend[e.category] += (e.amount || 0);
      historicCount[e.category].add(mk);
    }
  });

  const forecasts = [];
  const allCategories = new Set([...Object.keys(currentSpend), ...Object.keys(budgetMap)]);

  for (const cat of allCategories) {
    const spent = currentSpend[cat] || 0;
    const limit = budgetMap[cat] || null;
    const avgMonths = historicCount[cat]?.size || 1;
    const avgMonthly = historicSpend[cat] ? historicSpend[cat] / avgMonths : spent;

    // Project rest-of-month spend based on daily rate so far
    const dailyRate = dayOfMonth > 0 ? spent / dayOfMonth : 0;
    const projected = Math.round(spent + dailyRate * daysRemaining);

    let trend = 'on_track';
    let suggestion = null;

    if (limit) {
      const pct = (projected / limit) * 100;
      if (pct >= 100) {
        trend = 'over_budget';
        suggestion = `You are projected to exceed your ${cat.replace('_', ' ')} budget by UGX ${(projected - limit).toLocaleString()}. Reduce spending now.`;
      } else if (pct >= 80) {
        trend = 'at_risk';
        suggestion = `Your ${cat.replace('_', ' ')} spending is at ${Math.round(pct)}% of budget. Be cautious this week.`;
      }
    }

    if (trend !== 'on_track') {
      forecasts.push({ category: cat, current_spend: spent, projected_month_end: projected, budget_limit: limit, trend, suggestion });
    }
  }

  const overallStatus = forecasts.some(f => f.trend === 'over_budget') ? 'at_risk'
    : forecasts.some(f => f.trend === 'at_risk') ? 'caution' : 'on_track';

  const summary = overallStatus === 'on_track'
    ? 'You are on track with your budget this month.'
    : `${forecasts.length} category(s) are at risk of overspending this month.`;

  const topSuggestion = forecasts[0]?.suggestion || 'Keep tracking your expenses to stay on budget.';

  return Response.json({ overall_status: overallStatus, summary, forecasts, top_suggestion: topSuggestion });
});