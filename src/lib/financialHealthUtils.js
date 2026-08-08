// Client-side replacement for financialHealthCheck backend function.
// Rule-based — no LLM credits used.
import { base44 } from '@/api/base44Client';

export async function runFinancialHealthCheckClient() {
  const me = await base44.auth.me();
  if (!me) throw new Error('Unauthorized');

  const [creditScores, savings, expenses, loans, repayments] = await Promise.all([
    base44.entities.CreditScore.filter({ user_id: me.id }),
    base44.entities.SavingsPocket.filter({ user_id: me.id }),
    base44.entities.Expense.filter({ user_id: me.id }),
    base44.entities.LoanApplication.filter({ user_id: me.id }),
    base44.entities.Repayment.filter({ user_id: me.id }),
  ]);

  const latestCredit = creditScores.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0];
  const creditScore = latestCredit?.score || 0;
  const creditPillar = Math.min(100, Math.round((creditScore / 850) * 100));

  const totalSavings = savings.reduce((s, p) => s + (p.current_balance || 0), 0);
  const avgGoalProgress = savings.length > 0
    ? savings.reduce((s, p) => s + Math.min(100, p.goal_amount > 0 ? (p.current_balance / p.goal_amount) * 100 : 0), 0) / savings.length
    : 0;
  const savingsPillar = Math.min(100, Math.round(
    (Math.min(50, avgGoalProgress / 2)) +
    (Math.min(30, savings.length * 10)) +
    (totalSavings > 100000 ? 20 : totalSavings > 50000 ? 10 : 0)
  ));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
  const totalExpenses30 = recentExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const categoryTotals = recentExpenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
  const categoryCount = Object.keys(categoryTotals).length;
  const topCategoryRatio = totalExpenses30 > 0 ? (categoryTotals[topCategory] || 0) / totalExpenses30 : 0;
  const spendingPillar = Math.min(100, Math.round(
    (categoryCount >= 4 ? 40 : categoryCount * 10) +
    (topCategoryRatio < 0.4 ? 40 : topCategoryRatio < 0.6 ? 25 : 10) +
    (totalExpenses30 === 0 ? 0 : 20)
  ));

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

  const overallScore = Math.round(
    creditPillar * 0.30 + savingsPillar * 0.25 + spendingPillar * 0.20 + debtPillar * 0.25
  );

  const grade =
    overallScore >= 80 ? 'Excellent' :
    overallScore >= 65 ? 'Good' :
    overallScore >= 50 ? 'Fair' :
    overallScore >= 35 ? 'Needs Work' : 'Critical';

  const flags = [];
  if (overdueReps.length > 0) flags.push(`${overdueReps.length} overdue repayment(s) dragging your score`);
  if (savings.length === 0) flags.push('No savings pockets created yet');
  if (avgGoalProgress < 20 && savings.length > 0) flags.push('Savings goals are less than 20% complete');
  if (topCategoryRatio > 0.6 && totalExpenses30 > 0) flags.push(`Over 60% of spending is in "${topCategory}"`);
  if (creditScore < 400) flags.push('Credit score is below 400 — focus on repayments');
  if (activeLoans.length > 2) flags.push('Multiple active loans increase financial risk');

  const tips = [];
  if (overdueReps.length > 0) tips.push('Clear your overdue repayments immediately to protect your credit score.');
  if (savings.length === 0) tips.push('Open a savings pocket and set a goal to start building your financial cushion.');
  if (topCategoryRatio > 0.6) tips.push(`Diversify your spending — "${topCategory}" is taking up too much of your budget.`);
  if (creditScore < 500) tips.push('Complete your KYC documents and maintain consistent savings to boost your score.');
  if (tips.length < 4) tips.push('Log your expenses regularly to unlock more personalised insights.');
  if (tips.length < 4) tips.push('Set up auto-save on your savings pocket to build your balance effortlessly.');
  if (tips.length < 4) tips.push('Check your credit score monthly and track progress over time.');
  if (tips.length < 4) tips.push('Review your budget limits and adjust them to match your income patterns.');

  const summaries = {
    Excellent: 'Your financial health is excellent! You\'re managing your money well across all areas.',
    Good: 'Your finances are in good shape. A few tweaks can push you into the excellent range.',
    Fair: 'You\'re making progress but there are some areas that need attention.',
    'Needs Work': 'Your financial health needs some improvement. Focus on the tips below.',
    Critical: 'Your finances need urgent attention. Start with the most critical action below.',
  };

  const aiSummary = summaries[grade] || 'Keep working on your financial health.';

  const reportData = {
    user_id: me.id,
    overall_score: overallScore,
    grade,
    credit_score: creditScore,
    credit_pillar_score: creditPillar,
    savings_pillar_score: savingsPillar,
    spending_pillar_score: spendingPillar,
    debt_pillar_score: debtPillar,
    ai_summary: aiSummary,
    ai_tips: tips.slice(0, 4),
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

  const oldReports = await base44.entities.FinancialHealthReport.filter({ user_id: me.id });
  for (const r of oldReports) {
    await base44.entities.FinancialHealthReport.delete(r.id);
  }
  const report = await base44.entities.FinancialHealthReport.create(reportData);

  return { report };
}