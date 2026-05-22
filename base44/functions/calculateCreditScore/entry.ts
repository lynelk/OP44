import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Fetch all relevant data in parallel
    const [loans, repayments, kycDocs, savingsPockets, expenses] = await Promise.all([
      base44.entities.LoanApplication.filter({ user_id: userId }),
      base44.entities.Repayment.filter({ user_id: userId }),
      base44.entities.KYCDocument.filter({ user_id: userId }),
      base44.entities.SavingsPocket.filter({ user_id: userId }),
      base44.entities.Expense.filter({ user_id: userId })
    ]);

    let score = 300; // Base score
    const reasonCodes = [];
    const breakdown = {
      kyc_score: 0,
      repayment_score: 0,
      loan_history_score: 0,
      savings_boost: 0,
      expense_boost: 0,
      income_score: 0
    };

    // ─── 1. KYC Score (max 100 pts) ───────────────────────────────────────────
    const approvedDocs = kycDocs.filter(d => d.status === 'approved');
    const kycPoints = Math.min(approvedDocs.length * 25, 100);
    breakdown.kyc_score = kycPoints;
    score += kycPoints;

    if (approvedDocs.length === 0) {
      reasonCodes.push('NO_KYC_VERIFIED');
    } else if (approvedDocs.length < 3) {
      reasonCodes.push('PARTIAL_KYC');
    }

    // ─── 2. Repayment Behaviour (max 200 pts) ─────────────────────────────────
    if (repayments.length > 0) {
      const paidOnTime = repayments.filter(r => r.status === 'paid' && r.paid_date && r.due_date && r.paid_date <= r.due_date).length;
      const overdue = repayments.filter(r => r.status === 'overdue').length;
      const total = repayments.length;

      const onTimeRate = total > 0 ? paidOnTime / total : 0;
      const repaymentPoints = Math.round(onTimeRate * 200);
      breakdown.repayment_score = repaymentPoints;
      score += repaymentPoints;

      if (overdue > 0) reasonCodes.push(`OVERDUE_PAYMENTS:${overdue}`);
      if (onTimeRate >= 0.9) reasonCodes.push('EXCELLENT_REPAYMENT_HISTORY');
      else if (onTimeRate >= 0.7) reasonCodes.push('GOOD_REPAYMENT_HISTORY');
      else reasonCodes.push('POOR_REPAYMENT_HISTORY');
    } else {
      reasonCodes.push('NO_REPAYMENT_HISTORY');
    }

    // ─── 3. Loan History Score (max 100 pts) ──────────────────────────────────
    const closedLoans = loans.filter(l => l.status === 'closed').length;
    const defaultedLoans = loans.filter(l => l.status === 'defaulted').length;
    const loanHistoryPoints = Math.max(0, Math.min(closedLoans * 20 - defaultedLoans * 50, 100));
    breakdown.loan_history_score = loanHistoryPoints;
    score += loanHistoryPoints;

    if (defaultedLoans > 0) reasonCodes.push(`LOAN_DEFAULTS:${defaultedLoans}`);
    if (closedLoans > 0) reasonCodes.push(`LOANS_FULLY_REPAID:${closedLoans}`);

    // ─── 4. Income Score (max 100 pts) ────────────────────────────────────────
    const monthlyIncome = user.monthly_income || 0;
    const employmentStatus = user.employment_status;
    let incomePoints = 0;

    if (employmentStatus === 'employed') incomePoints += 30;
    else if (employmentStatus === 'self_employed') incomePoints += 20;
    else if (employmentStatus === 'retired') incomePoints += 15;

    if (monthlyIncome > 500000) incomePoints += 70;
    else if (monthlyIncome > 200000) incomePoints += 50;
    else if (monthlyIncome > 100000) incomePoints += 30;
    else if (monthlyIncome > 50000) incomePoints += 15;

    incomePoints = Math.min(incomePoints, 100);
    breakdown.income_score = incomePoints;
    score += incomePoints;

    if (!monthlyIncome) reasonCodes.push('NO_INCOME_DECLARED');

    // ─── 5. BOOST: Savings Consistency (max +100 pts) — never negative ────────
    if (savingsPockets.length > 0) {
      const activePockets = savingsPockets.filter(s => s.status === 'active');
      const completedPockets = savingsPockets.filter(s => s.status === 'completed');
      const totalSavingsBalance = savingsPockets.reduce((sum, s) => sum + (s.current_balance || 0), 0);

      let savingsBoost = 0;
      savingsBoost += Math.min(activePockets.length * 10, 30);
      savingsBoost += Math.min(completedPockets.length * 20, 40);
      if (totalSavingsBalance > 1000000) savingsBoost += 30;
      else if (totalSavingsBalance > 500000) savingsBoost += 20;
      else if (totalSavingsBalance > 100000) savingsBoost += 10;

      savingsBoost = Math.min(savingsBoost, 100);
      breakdown.savings_boost = savingsBoost;
      score += savingsBoost;

      if (savingsBoost > 0) reasonCodes.push(`SAVINGS_BOOST:+${savingsBoost}pts`);
    }

    // ─── 6. BOOST: Responsible Spending (max +50 pts) — never negative ────────
    if (expenses.length > 0) {
      const recentExpenses = expenses.slice(-30); // last 30 records
      const savingsExpenses = recentExpenses.filter(e => e.category === 'savings' || e.category === 'loan_repayment');
      const savingsRatio = recentExpenses.length > 0 ? savingsExpenses.length / recentExpenses.length : 0;

      let expenseBoost = 0;
      if (savingsRatio >= 0.3) expenseBoost = 50;
      else if (savingsRatio >= 0.2) expenseBoost = 30;
      else if (savingsRatio >= 0.1) expenseBoost = 15;

      breakdown.expense_boost = expenseBoost;
      score += expenseBoost;

      if (expenseBoost > 0) reasonCodes.push(`RESPONSIBLE_SPENDING_BOOST:+${expenseBoost}pts`);
    }

    // ─── Cap score at 850 ─────────────────────────────────────────────────────
    score = Math.min(Math.round(score), 850);

    // ─── Determine Risk Band ──────────────────────────────────────────────────
    let riskBand;
    if (score >= 720) riskBand = 'A';
    else if (score >= 620) riskBand = 'B';
    else if (score >= 500) riskBand = 'C';
    else riskBand = 'D';

    // ─── Max loan limit based on score + income ───────────────────────────────
    const incomeMultiplier = { A: 6, B: 4, C: 2.5, D: 1 };
    const maxLoanLimit = Math.round((monthlyIncome || 0) * (incomeMultiplier[riskBand] || 1));

    // ─── Save credit score record ─────────────────────────────────────────────
    const creditScoreRecord = await base44.entities.CreditScore.create({
      user_id: userId,
      score,
      risk_band: riskBand,
      calculated_at: new Date().toISOString(),
      score_breakdown: breakdown,
      reason_codes: reasonCodes,
      max_loan_limit: maxLoanLimit
    });

    // ─── Update user's current score ─────────────────────────────────────────
    await base44.auth.updateMe({
      current_credit_score: score,
      current_risk_band: riskBand
    });

    return Response.json({
      score,
      risk_band: riskBand,
      breakdown,
      reason_codes: reasonCodes,
      max_loan_limit: maxLoanLimit,
      record_id: creditScoreRecord.id
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});