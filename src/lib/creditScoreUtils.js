// Client-side replacement for calculateCreditScore backend function.
// Rule-based — no backend function calls, no LLM credits.
import { base44 } from '@/api/base44Client';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function clampScore(n) {
  return Math.max(300, Math.min(850, Math.round(n)));
}

function bandForScore(score) {
  if (score >= 700) return 'A';
  if (score >= 580) return 'B';
  if (score >= 450) return 'C';
  return 'D';
}

function maxLoanForBand(band, income) {
  const multipliers = { A: 6, B: 4, C: 2.5, D: 1 };
  const base = (income || 200000) * (multipliers[band] || 1);
  return Math.round(base / 50000) * 50000;
}

export async function calculateCreditScoreClient() {
  const me = await base44.auth.me();
  if (!me) throw new Error('Unauthorized');

  const settled = await Promise.allSettled([
    base44.entities.UserProfile.filter({ user_id: me.id }),
    base44.entities.KYCDocument.filter({ user_id: me.id }),
    base44.entities.Repayment.filter({ user_id: me.id }),
    base44.entities.LoanApplication.filter({ user_id: me.id }),
    base44.entities.SavingsPocket.filter({ user_id: me.id }),
    base44.entities.Expense.filter({ user_id: me.id }),
  ]);

  settled.forEach((r, i) => {
    if (r.status === 'rejected') console.warn(`[CreditScore] entity ${i} failed:`, r.reason?.message || r.reason);
  });

  const val = (i, fallback = []) => settled[i].status === 'fulfilled' ? settled[i].value : fallback;
  const profiles = val(0);
  const kycDocs = val(1);
  const repayments = val(2);
  const loans = val(3);
  const pockets = val(4);
  const expenses = val(5);

  const profile = profiles[0] || {};
  const income = profile.monthly_income || 0;

  // --- KYC Score (0-150) ---
  const approvedKyc = kycDocs.filter(d => d.status === 'approved');
  const kycTypes = new Set(approvedKyc.map(d => d.document_type));
  const kycScore = Math.min(150, kycTypes.size * 30 + (profile.kyc_status === 'verified' ? 60 : 0));

  // --- Repayment Score (0-250) ---
  const completedReps = repayments.filter(r => ['paid', 'overdue'].includes(r.status));
  const paidReps = repayments.filter(r => r.status === 'paid');
  const overdueReps = repayments.filter(r => r.status === 'overdue');
  const onTimeRate = completedReps.length > 0 ? paidReps.length / completedReps.length : 1;
  const repaymentScore = Math.round(
    (onTimeRate * 180) +
    (overdueReps.length === 0 ? 70 : overdueReps.length <= 2 ? 30 : 0)
  );

  // --- Loan History Score (0-150) ---
  const completedLoans = loans.filter(l => l.status === 'closed');
  const activeLoans = loans.filter(l => ['active', 'disbursed'].includes(l.status));
  const defaultedLoans = loans.filter(l => l.status === 'defaulted');
  const loanHistoryScore = Math.min(150,
    (completedLoans.length * 40) +
    (defaultedLoans.length === 0 ? 50 : 0) +
    (activeLoans.length <= 2 ? 30 : 0)
  );

  // --- Savings Boost (0-120) ---
  const totalSavings = pockets.reduce((s, p) => s + (p.current_balance || 0), 0);
  const activePockets = pockets.filter(p => p.status === 'active').length;
  const savingsBoost = Math.min(120,
    (activePockets * 25) +
    (totalSavings > 500000 ? 45 : totalSavings > 100000 ? 25 : totalSavings > 0 ? 10 : 0)
  );

  // --- Expense Boost (0-80) ---
  const thirtyDaysAgo = new Date(Date.now() - 30 * MS_PER_DAY);
  const recentExpenses = expenses.filter(e => e.date && new Date(e.date) >= thirtyDaysAgo);
  const expenseBoost = Math.min(80, recentExpenses.length >= 10 ? 80 : recentExpenses.length * 8);

  // --- Income Score (0-100) ---
  const incomeScore = income > 1000000 ? 100 : income > 500000 ? 70 : income > 200000 ? 45 : income > 0 ? 20 : 0;

  const rawScore = 300 + kycScore + repaymentScore + loanHistoryScore + savingsBoost + expenseBoost + incomeScore;
  const score = clampScore(rawScore);
  const risk_band = bandForScore(score);
  const max_loan_limit = maxLoanForBand(risk_band, income);

  // --- Reason Codes ---
  const reason_codes = [];
  if (kycTypes.size < 3) reason_codes.push('Complete more KYC documents to boost your score');
  if (overdueReps.length > 0) reason_codes.push(`${overdueReps.length} overdue repayment(s) — clear them to improve`);
  if (completedLoans.length === 0) reason_codes.push('No completed loans yet — repayment history builds your score');
  if (totalSavings === 0) reason_codes.push('Start a savings pocket to add a savings boost');
  if (income === 0) reason_codes.push('Declare your monthly income in your profile');
  if (recentExpenses.length < 5) reason_codes.push('Log expenses regularly to improve spending insights');
  if (defaultedLoans.length > 0) reason_codes.push('A past default is affecting your score — focus on on-time payments');

  const scoreData = {
    user_id: me.id,
    score,
    risk_band,
    calculated_at: new Date().toISOString(),
    score_breakdown: {
      kyc_score: kycScore,
      repayment_score: repaymentScore,
      loan_history_score: loanHistoryScore,
      savings_boost: savingsBoost,
      expense_boost: expenseBoost,
      income_score: incomeScore,
    },
    reason_codes,
    max_loan_limit,
  };

  await base44.entities.CreditScore.create(scoreData);
  return scoreData;
}