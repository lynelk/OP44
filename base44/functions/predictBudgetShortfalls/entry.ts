import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch last 3 months of expenses and budget categories
  const expenses = await base44.entities.Expense.filter({ user_id: user.id });
  const budgets = await base44.entities.BudgetCategory.filter({ user_id: user.id });

  if (expenses.length === 0) {
    return Response.json({ message: 'Not enough data', forecasts: [], suggestions: [] });
  }

  // Group expenses by category and month
  const now = new Date();
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = monthKey(now);

  const categoryMonthSpend = {};
  expenses.forEach(e => {
    const d = new Date(e.date || e.created_date);
    const mk = monthKey(d);
    if (!categoryMonthSpend[e.category]) categoryMonthSpend[e.category] = {};
    if (!categoryMonthSpend[e.category][mk]) categoryMonthSpend[e.category][mk] = 0;
    categoryMonthSpend[e.category][mk] += (e.amount || 0);
  });

  const budgetMap = {};
  budgets.forEach(b => { budgetMap[b.category] = b.monthly_limit; });

  // Build summary for LLM
  const categorySummaries = Object.entries(categoryMonthSpend).map(([cat, months]) => {
    const monthEntries = Object.entries(months).sort();
    const recent = monthEntries.slice(-3);
    const currentSpend = months[currentMonth] || 0;
    const limit = budgetMap[cat] || null;
    const avgSpend = recent.reduce((s, [, v]) => s + v, 0) / (recent.length || 1);
    return { category: cat, current_month_spend: currentSpend, avg_monthly_spend: Math.round(avgSpend), budget_limit: limit };
  });

  const prompt = `You are a personal finance AI for a Ugandan user. Analyze this spending data and predict budget shortfalls for the current month.

Spending data by category (amounts in UGX):
${JSON.stringify(categorySummaries, null, 2)}

Today is ${now.toISOString().split('T')[0]} (day ${now.getDate()} of the month).
Days remaining in month: ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()}

For each category that is trending toward overspending or already over budget, provide a forecast and suggestion. Be specific and actionable. Use UGX amounts. Keep suggestions practical for a Ugandan user.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        overall_status: { type: 'string', enum: ['on_track', 'caution', 'at_risk'] },
        summary: { type: 'string' },
        forecasts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              current_spend: { type: 'number' },
              projected_month_end: { type: 'number' },
              budget_limit: { type: 'number' },
              overspend_risk_pct: { type: 'number' },
              trend: { type: 'string', enum: ['over_budget', 'at_risk', 'on_track'] },
              suggestion: { type: 'string' }
            }
          }
        },
        top_suggestion: { type: 'string' }
      }
    }
  });

  return Response.json(result);
});