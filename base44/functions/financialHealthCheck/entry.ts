import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // ── 1. Gather raw data ──────────────────────────────────────────────────────
  const [creditScores, savings, expenses, loans, repayments] = await Promise.all([
    base44.entities.CreditScore.filter({ user_id: user.id }),
    base44.entities.SavingsPocket.filter({ user_id: user.id }),
    base44.entities.Expense.filter({ user_id: user.id }),
    base44.entities.LoanApplication.filter({ user_id: user.id }),
    base44.entities.Repayment.filter({ user_id: user.id }),
  ]);

  // ── 2. Rule-based calculations ──────────────────────────────────────────────
  // Credit
  const latestCredit = creditScores.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0];
  const creditScore = latestCredit?.score || 0;
  const creditPillar = Math.min(100, Math.round((creditScore / 850) * 100));

  // Savings
  const totalSavings = savings.reduce((s, p) => s + (p.current_balance || 0), 0);
  const avgGoalProgress = savings.length > 0
    ? savings.reduce((s, p) => s + Math.min(100, p.goal_amount > 0 ? (p.current_balance / p.goal_amount) * 100 : 0), 0) / savings.length
    : 0;
  const savingsPillar = Math.min(100, Math.round(
    (Math.min(50, avgGoalProgress / 2)) +
    (Math.min(30, savings.length * 10)) +
    (totalSavings > 100000 ? 20 : totalSavings > 50000 ? 10 : 0)
  ));

  // Spending (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
  const totalExpenses30 = recentExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const categoryTotals = recentExpenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
  // Score spending: penalise if >80% in one category, reward diversity
  const categoryCount = Object.keys(categoryTotals).length;
  const topCategoryRatio = totalExpenses30 > 0 ? (categoryTotals[topCategory] || 0) / totalExpenses30 : 0;
  const spendingPillar = Math.min(100, Math.round(
    (categoryCount >= 4 ? 40 : categoryCount * 10) +
    (topCategoryRatio < 0.4 ? 40 : topCategoryRatio < 0.6 ? 25 : 10) +
    (totalExpenses30 === 0 ? 0 : 20)
  ));

  // Debt / Repayments
  const activeLoans = loans.filter(l => ['active', 'disbursed'].includes(l.status));
  const overdueReps = repayments.filter(r => r.status === 'overdue');
  const paidReps = repayments.filter(r => r.status === 'paid');
  const totalReps = repayments.filter(r => ['paid', 'overdue'].includes(r.status));
  const onTimeRate = totalReps.length > 0 ? Math.round((paidReps.length / totalReps.length) * 100) : 100;
  const debtPillar = Math.min(100, Math.round(
    (onTimeRate * 0.5) +
    (overdueReps.length === 0 ? 30 : overdueReps.length <= 2 ? 15 : 0) +
    (activeLoans.length <= 1 ? 20 : activeLoans.length <= 2 ? 10 : 0)
  ));

  // Overall score (weighted)
  const overallScore = Math.round(
    creditPillar * 0.30 +
    savingsPillar * 0.25 +
    spendingPillar * 0.20 +
    debtPillar * 0.25
  );

  const grade =
    overallScore >= 80 ? 'Excellent' :
    overallScore >= 65 ? 'Good' :
    overallScore >= 50 ? 'Fair' :
    overallScore >= 35 ? 'Needs Work' : 'Critical';

  // Rule flags
  const flags = [];
  if (overdueReps.length > 0) flags.push(`${overdueReps.length} overdue repayment(s) dragging your score`);
  if (savings.length === 0) flags.push('No savings pockets created yet');
  if (avgGoalProgress < 20 && savings.length > 0) flags.push('Savings goals are less than 20% complete');
  if (topCategoryRatio > 0.6 && totalExpenses30 > 0) flags.push(`Over 60% of spending is in "${topCategory}"`);
  if (creditScore < 400) flags.push('Credit score is below 400 — focus on repayments');
  if (activeLoans.length > 2) flags.push('Multiple active loans increase financial risk');

  // ── 3. AI narrative ─────────────────────────────────────────────────────────
  const prompt = `You are a friendly financial wellness coach for an African fintech app called OpFin.
Analyse this user's financial data and write:
1. A short personalised 2-3 sentence summary of their financial health (conversational, encouraging tone)
2. Exactly 4 specific, actionable tips tailored to their situation

User data:
- Overall health score: ${overallScore}/100 (${grade})
- Credit score: ${creditScore}/850
- Credit pillar: ${creditPillar}/100
- Savings pillar: ${savingsPillar}/100 (${savings.length} pockets, avg goal progress ${Math.round(avgGoalProgress)}%, total UGX ${totalSavings.toLocaleString()})
- Spending pillar: ${spendingPillar}/100 (UGX ${totalExpenses30.toLocaleString()} spent in last 30 days, top category: ${topCategory})
- Debt pillar: ${debtPillar}/100 (${activeLoans.length} active loans, ${overdueReps.length} overdue, on-time rate ${onTimeRate}%)
- Warnings: ${flags.length > 0 ? flags.join('; ') : 'None'}

Respond ONLY with valid JSON:
{"summary": "...", "tips": ["tip1", "tip2", "tip3", "tip4"]}`;

  const aiResult = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        tips: { type: 'array', items: { type: 'string' } }
      }
    }
  });

  // ── 4. Persist report ───────────────────────────────────────────────────────
  const reportData = {
    user_id: user.id,
    overall_score: overallScore,
    grade,
    credit_score: creditScore,
    credit_pillar_score: creditPillar,
    savings_pillar_score: savingsPillar,
    spending_pillar_score: spendingPillar,
    debt_pillar_score: debtPillar,
    ai_summary: aiResult?.summary || '',
    ai_tips: aiResult?.tips || [],
    rule_flags: flags,
    total_savings: totalSavings,
    savings_goal_progress: Math.round(avgGoalProgress),
    total_expenses_last30: totalExpenses30,
    top_expense_category: topCategory,
    active_loans: activeLoans.length,
    overdue_repayments: overdueReps.length,
    on_time_repayment_rate: onTimeRate,
    generated_at: new Date().toISOString(),
  };

  // Upsert: delete old reports for user, create fresh
  const oldReports = await base44.entities.FinancialHealthReport.filter({ user_id: user.id });
  for (const r of oldReports) {
    await base44.entities.FinancialHealthReport.delete(r.id);
  }
  const report = await base44.entities.FinancialHealthReport.create(reportData);

  return Response.json({ report });
});