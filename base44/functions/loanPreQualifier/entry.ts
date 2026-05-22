import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * AI-Driven Loan Pre-Screening
 * 
 * Evaluates:
 *  1. Latest FinancialHealthReport (AI-generated pillar scores)
 *  2. CreditScore entity (score + breakdown)
 *  3. Expense history (spending behaviour)
 *  4. Active loans (debt obligations)
 *  5. Savings behaviour (consistency signals)
 *
 * Outputs:
 *  - Computed risk band (A/B/C/D)
 *  - Pre-approved loan limit
 *  - Eligible loan products
 *  - Detailed scoring rationale
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    // ── 1. Fetch all data in parallel ─────────────────────────────────────────
    const [expenses, activeLoans, allRepayments, savingsPockets, creditScoreRecords, healthReports, loanProducts] = await Promise.all([
      base44.entities.Expense.filter({ user_id: userId }),
      base44.entities.LoanApplication.filter({ user_id: userId }),
      base44.entities.Repayment.filter({ user_id: userId }),
      base44.entities.SavingsPocket.filter({ user_id: userId }),
      base44.entities.CreditScore.filter({ user_id: userId }),
      base44.entities.FinancialHealthReport.filter({ user_id: userId }),
      base44.asServiceRole.entities.LoanProduct.filter({}),
    ]);

    // ── 2. Get latest records ─────────────────────────────────────────────────
    const latestCreditScore = creditScoreRecords
      .sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0] || null;

    const latestHealthReport = healthReports
      .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))[0] || null;

    // ── 3. Financial signals ──────────────────────────────────────────────────
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthsAgo   = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const recentExpenses = expenses.filter(e => new Date(e.date) >= threeMonthsAgo);
    const totalSpending3m = recentExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const avgMonthlySpending = totalSpending3m / 3;

    const monthlyIncome = user.monthly_income || 0;
    const disposableIncome = Math.max(0, monthlyIncome - avgMonthlySpending);

    // Active loan obligations
    const activeLoansList = activeLoans.filter(l => ['active', 'disbursed'].includes(l.status));
    const totalMonthlyObligations = activeLoansList.reduce((s, l) => s + (l.monthly_installment || 0), 0);
    const netDisposable = Math.max(0, disposableIncome - totalMonthlyObligations);

    // Repayment history analysis
    const paidRepayments = allRepayments.filter(r => r.status === 'paid');
    const overdueRepayments = allRepayments.filter(r => r.status === 'overdue');
    const totalRepayments = allRepayments.length;
    const onTimeRate = totalRepayments > 0 ? (paidRepayments.length / totalRepayments) * 100 : 100;

    // Savings consistency (months with at least one active pocket)
    const activePockets = savingsPockets.filter(p => p.status === 'active' || p.status === 'completed');
    const totalSavings = activePockets.reduce((s, p) => s + (p.current_balance || 0), 0);
    const hasSavingsHistory = activePockets.length > 0;

    // ── 4. AI-Driven Composite Scoring ───────────────────────────────────────
    // Each signal → 0-100 score, then weighted composite

    // Signal A: Credit score (0-100 normalised from 300-850 range)
    const rawCreditScore = latestCreditScore?.score || 300;
    const creditScoreNorm = Math.min(100, Math.max(0, ((rawCreditScore - 300) / 550) * 100));

    // Signal B: Repayment behaviour
    const repaymentScore = overdueRepayments.length > 0
      ? Math.max(0, onTimeRate - (overdueRepayments.length * 10))
      : onTimeRate;

    // Signal C: Health report pillars (if available)
    const healthCreditPillar  = latestHealthReport?.credit_pillar_score   || creditScoreNorm;
    const healthSavingsPillar = latestHealthReport?.savings_pillar_score  || (hasSavingsHistory ? 60 : 30);
    const healthSpendingPillar= latestHealthReport?.spending_pillar_score || (monthlyIncome > 0 ? Math.min(100, (disposableIncome / monthlyIncome) * 100) : 40);
    const healthDebtPillar    = latestHealthReport?.debt_pillar_score     || (overdueRepayments.length === 0 ? 80 : 30);
    const healthOverall       = latestHealthReport?.overall_score         || null;

    // Signal D: Debt-to-income ratio
    const dtiRatio = monthlyIncome > 0 ? (totalMonthlyObligations / monthlyIncome) * 100 : 0;
    const dtiScore = Math.max(0, 100 - (dtiRatio * 2)); // 50% DTI = 0 score

    // Signal E: Income stability
    const incomeScore = monthlyIncome >= 2000000 ? 100
      : monthlyIncome >= 1000000 ? 80
      : monthlyIncome >= 500000  ? 60
      : monthlyIncome >= 200000  ? 40
      : monthlyIncome > 0        ? 20 : 10;

    // Signal F: Savings behaviour
    const savingsScore = totalSavings >= 5000000 ? 100
      : totalSavings >= 1000000 ? 80
      : totalSavings >= 500000  ? 60
      : totalSavings >= 100000  ? 40
      : totalSavings > 0        ? 25 : 10;

    // ── 5. Weighted Composite Score ───────────────────────────────────────────
    const weights = {
      creditScore:    0.25,
      repayment:      0.20,
      healthCredit:   0.10,
      healthSavings:  0.08,
      healthSpending: 0.08,
      healthDebt:     0.09,
      dti:            0.10,
      income:         0.05,
      savings:        0.05,
    };

    const compositeScore = Math.round(
      creditScoreNorm      * weights.creditScore +
      repaymentScore       * weights.repayment +
      healthCreditPillar   * weights.healthCredit +
      healthSavingsPillar  * weights.healthSavings +
      healthSpendingPillar * weights.healthSpending +
      healthDebtPillar     * weights.healthDebt +
      dtiScore             * weights.dti +
      incomeScore          * weights.income +
      savingsScore         * weights.savings
    );

    // ── 6. Assign Risk Band ───────────────────────────────────────────────────
    let computedRiskBand;
    if      (compositeScore >= 75) computedRiskBand = 'A';
    else if (compositeScore >= 55) computedRiskBand = 'B';
    else if (compositeScore >= 35) computedRiskBand = 'C';
    else                           computedRiskBand = 'D';

    // Override: hard disqualifiers
    if (overdueRepayments.length >= 3) computedRiskBand = 'D';
    if (dtiRatio > 60)                 computedRiskBand = computedRiskBand === 'A' ? 'B' : computedRiskBand;

    // Use existing credit score risk band if available and worse (conservative)
    const existingBand = latestCreditScore?.risk_band;
    const bandRank = { A: 4, B: 3, C: 2, D: 1 };
    const finalRiskBand = existingBand
      ? (bandRank[existingBand] < bandRank[computedRiskBand] ? existingBand : computedRiskBand)
      : computedRiskBand;

    // ── 7. Pre-Approved Loan Limit ────────────────────────────────────────────
    const riskMultipliers   = { A: 6, B: 4, C: 2.5, D: 1.2 };
    const riskInterestRates = { A: 0.05, B: 0.07, C: 0.10, D: 0.15 };
    const dsr = 0.40; // 40% debt service ratio
    const n   = 12;
    const r   = riskInterestRates[finalRiskBand];
    const pvFactor = r > 0 ? (1 - Math.pow(1 + r, -n)) / r : n;

    const maxByDSR      = Math.max(0, netDisposable * dsr) * pvFactor;
    const maxByIncome   = monthlyIncome * riskMultipliers[finalRiskBand];
    const maxByCreditLimit = latestCreditScore?.max_loan_limit || Infinity;

    const rawLimit = Math.min(maxByDSR, maxByIncome, maxByCreditLimit);
    // Round to nearest 50,000 UGX
    const preApprovedLimit = Math.round(rawLimit / 50000) * 50000;

    // ── 8. AI Rationale (structured) ─────────────────────────────────────────
    const rationale = [];
    if (rawCreditScore >= 700) rationale.push('Strong credit score boosts eligibility.');
    else if (rawCreditScore < 450) rationale.push('Low credit score limits borrowing capacity.');
    if (onTimeRate >= 90) rationale.push('Excellent repayment history.');
    else if (overdueRepayments.length > 0) rationale.push(`${overdueRepayments.length} overdue repayment(s) noted.`);
    if (dtiRatio > 40) rationale.push(`High debt-to-income ratio (${dtiRatio.toFixed(0)}%) reduces headroom.`);
    if (totalSavings > 0) rationale.push(`Savings history of UGX ${(totalSavings / 1000).toFixed(0)}K signals financial discipline.`);
    if (latestHealthReport) rationale.push(`AI health report overall score: ${latestHealthReport.overall_score}/100 (${latestHealthReport.grade}).`);
    if (monthlyIncome === 0) rationale.push('No declared income — limit may be underestimated. Update your profile.');

    // ── 9. Eligible loan products ─────────────────────────────────────────────
    const eligibleProducts = loanProducts.filter(p => {
      if (p.status !== 'active') return false;
      if (rawCreditScore < (p.min_credit_score || 0)) return false;
      if (preApprovedLimit < (p.min_amount || 0)) return false;
      if (p.risk_bands_allowed?.length > 0 && !p.risk_bands_allowed.includes(finalRiskBand)) return false;
      return true;
    }).map(p => ({
      ...p,
      qualified_amount: Math.min(preApprovedLimit, p.max_amount),
      offered_rate: p.interest_rate_min + (
        finalRiskBand === 'A' ? 0 :
        finalRiskBand === 'B' ? (p.interest_rate_max - p.interest_rate_min) * 0.33 :
        finalRiskBand === 'C' ? (p.interest_rate_max - p.interest_rate_min) * 0.66 :
        (p.interest_rate_max - p.interest_rate_min)
      ),
    }));

    // ── 10. Update CreditScore record with new computed band ──────────────────
    if (latestCreditScore) {
      await base44.entities.CreditScore.update(latestCreditScore.id, {
        risk_band: finalRiskBand,
        max_loan_limit: preApprovedLimit,
      });
    }

    return Response.json({
      success: true,
      // Inputs summary
      monthly_income: monthlyIncome,
      avg_monthly_spending: Math.round(avgMonthlySpending),
      disposable_income: Math.round(disposableIncome),
      active_loan_obligations: Math.round(totalMonthlyObligations),
      net_disposable: Math.round(netDisposable),
      debt_to_income_ratio: Math.round(dtiRatio),
      on_time_repayment_rate: Math.round(onTimeRate),
      total_savings: Math.round(totalSavings),
      // Scoring breakdown
      scoring: {
        composite_score: compositeScore,
        credit_score_signal: Math.round(creditScoreNorm),
        repayment_signal: Math.round(repaymentScore),
        health_credit_pillar: Math.round(healthCreditPillar),
        health_savings_pillar: Math.round(healthSavingsPillar),
        health_spending_pillar: Math.round(healthSpendingPillar),
        health_debt_pillar: Math.round(healthDebtPillar),
        dti_signal: Math.round(dtiScore),
        income_signal: incomeScore,
        savings_signal: savingsScore,
      },
      // Outputs
      computed_risk_band: computedRiskBand,
      final_risk_band: finalRiskBand,
      pre_approved_limit: preApprovedLimit,
      credit_score: rawCreditScore,
      health_overall_score: healthOverall,
      rationale,
      eligible_products: eligibleProducts,
      income_declared: monthlyIncome > 0,
      has_health_report: !!latestHealthReport,
      has_credit_score: !!latestCreditScore,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});