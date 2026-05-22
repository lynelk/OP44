import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const monthlyIncome = user.monthly_income || 0;
    const creditScore = user.current_credit_score || 300;
    const riskBand = user.current_risk_band || 'D';

    // Fetch expense data for last 3 months to calculate avg spending
    const expenses = await base44.entities.Expense.filter({ user_id: userId });
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recentExpenses = expenses.filter(e => new Date(e.date) >= threeMonthsAgo);

    // Calculate average monthly spending
    const totalSpending = recentExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const avgMonthlySpending = recentExpenses.length > 0 ? totalSpending / 3 : 0;

    // Disposable income
    const disposableIncome = Math.max(0, monthlyIncome - avgMonthlySpending);

    // Debt-to-income: fetch active loans
    const activeLoans = await base44.entities.LoanApplication.filter({ user_id: userId });
    const activeLoanInstallments = activeLoans
      .filter(l => ['active', 'disbursed'].includes(l.status))
      .reduce((sum, l) => sum + (l.monthly_installment || 0), 0);

    const netDisposable = Math.max(0, disposableIncome - activeLoanInstallments);

    // Max Borrowing Capacity using risk-band multiplier
    const multipliers = { A: 6, B: 4, C: 2.5, D: 1 };
    const debtServiceRatio = 0.4; // max 40% of net disposable goes to new loan repayment
    const maxMonthlyRepayment = netDisposable * debtServiceRatio;
    const interestRates = { A: 0.05, B: 0.07, C: 0.10, D: 0.15 };
    const rate = interestRates[riskBand] || 0.10;
    const baseMultiplier = multipliers[riskBand] || 1;

    // P = PMT * [(1-(1+r)^-n)/r]  → max loan for 12-month term
    const n = 12;
    const r = rate;
    const pvFactor = r > 0 ? (1 - Math.pow(1 + r, -n)) / r : n;
    const maxBorrowingCapacity = Math.round(
      Math.min(
        maxMonthlyRepayment * pvFactor,
        monthlyIncome * baseMultiplier
      )
    );

    // Fetch eligible loan products
    const loanProducts = await base44.asServiceRole.entities.LoanProduct.filter({});
    const eligibleProducts = loanProducts.filter(p => {
      if (p.status !== 'active') return false;
      if (creditScore < (p.min_credit_score || 0)) return false;
      if (maxBorrowingCapacity < p.min_amount) return false;
      if (p.risk_bands_allowed && p.risk_bands_allowed.length > 0) {
        if (!p.risk_bands_allowed.includes(riskBand)) return false;
      }
      return true;
    }).map(p => ({
      ...p,
      qualified_amount: Math.min(maxBorrowingCapacity, p.max_amount),
      interest_rate: p.interest_rate_min + (
        riskBand === 'A' ? 0 :
        riskBand === 'B' ? (p.interest_rate_max - p.interest_rate_min) * 0.33 :
        riskBand === 'C' ? (p.interest_rate_max - p.interest_rate_min) * 0.66 :
        p.interest_rate_max - p.interest_rate_min
      )
    }));

    return Response.json({
      success: true,
      monthly_income: monthlyIncome,
      avg_monthly_spending: Math.round(avgMonthlySpending),
      disposable_income: Math.round(disposableIncome),
      active_loan_installments: Math.round(activeLoanInstallments),
      net_disposable: Math.round(netDisposable),
      max_borrowing_capacity: maxBorrowingCapacity,
      credit_score: creditScore,
      risk_band: riskBand,
      eligible_products: eligibleProducts,
      income_declared: monthlyIncome > 0
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});