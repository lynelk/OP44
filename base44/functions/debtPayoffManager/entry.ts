import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { method = 'snowball', extra_monthly_payment = 0, redirect_amount = 0, target_loan_id = null } = body;

  // Get all active loans
  const loans = await base44.entities.LoanApplication.filter({});
  const activeLoans = loans.filter(l => ['active', 'disbursed', 'approved'].includes(l.status) && (l.outstanding_balance || l.total_repayable) > 0);

  if (!activeLoans.length) return Response.json({ debts: [], plan: [], total_debt: 0 });

  // Get savings pockets
  const pockets = await base44.entities.SavingsPocket.filter({});
  const totalSurplusSavings = pockets.reduce((sum, p) => {
    // Surplus = balance above minimum reserve (keep at least 1 month installment per loan as reserve)
    return sum + Math.max(0, (p.current_balance || 0) - 50000);
  }, 0);

  // Build debt list
  const debts = activeLoans.map(loan => ({
    id: loan.id,
    name: loan.purpose || 'Personal Loan',
    balance: loan.outstanding_balance || loan.total_repayable || loan.amount_approved || 0,
    monthly_payment: loan.monthly_installment || 0,
    interest_rate: loan.interest_rate || 15, // default 15%
    tenure_remaining: loan.tenure_months || 3,
    status: loan.status,
  }));

  // Sort by method
  let sortedDebts;
  if (method === 'snowball') {
    sortedDebts = [...debts].sort((a, b) => a.balance - b.balance); // smallest first
  } else {
    sortedDebts = [...debts].sort((a, b) => b.interest_rate - a.interest_rate); // highest interest first
  }

  // Calculate payoff plan
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMonthlyMin = debts.reduce((sum, d) => sum + d.monthly_payment, 0);
  const effectiveExtra = extra_monthly_payment > 0 ? extra_monthly_payment : 0;

  // Simulate payoff timeline
  const plan = [];
  let remainingDebts = sortedDebts.map(d => ({ ...d }));
  let month = 0;
  let totalInterestPaid = 0;

  while (remainingDebts.some(d => d.balance > 0) && month < 120) {
    month++;
    let extraAvailable = effectiveExtra;

    // Pay minimums on all
    for (const debt of remainingDebts) {
      if (debt.balance <= 0) continue;
      const interestThisMonth = (debt.balance * (debt.interest_rate / 100)) / 12;
      const payment = Math.min(debt.monthly_payment, debt.balance + interestThisMonth);
      totalInterestPaid += interestThisMonth;
      debt.balance = Math.max(0, debt.balance - (payment - interestThisMonth));
    }

    // Apply extra to priority debt
    for (const debt of remainingDebts) {
      if (debt.balance <= 0 || extraAvailable <= 0) continue;
      const payExtra = Math.min(extraAvailable, debt.balance);
      debt.balance = Math.max(0, debt.balance - payExtra);
      extraAvailable -= payExtra;
      if (debt.balance === 0) break; // paid off, remaining extra rolls to next
    }

    remainingDebts = remainingDebts.filter(d => d.balance > 0);
    if (month <= 36) {
      plan.push({ month, debts_remaining: remainingDebts.length, total_balance: remainingDebts.reduce((s, d) => s + d.balance, 0) });
    }
  }

  // Baseline (no extra)
  let baselineMonths = 0;
  let baselineDebts = sortedDebts.map(d => ({ ...d }));
  while (baselineDebts.some(d => d.balance > 0) && baselineMonths < 120) {
    baselineMonths++;
    for (const debt of baselineDebts) {
      if (debt.balance <= 0) continue;
      const interest = (debt.balance * (debt.interest_rate / 100)) / 12;
      debt.balance = Math.max(0, debt.balance - (debt.monthly_payment - interest));
    }
    baselineDebts = baselineDebts.filter(d => d.balance > 0);
  }

  // Handle redirect to specific loan
  let redirectResult = null;
  if (redirect_amount > 0 && target_loan_id) {
    const targetLoan = await base44.entities.LoanApplication.list().then(ls => ls.find(l => l.id === target_loan_id));
    if (targetLoan) {
      // Deduct from first pocket with sufficient balance
      for (const pocket of pockets) {
        if ((pocket.current_balance || 0) >= redirect_amount) {
          await base44.entities.SavingsPocket.update(pocket.id, {
            current_balance: (pocket.current_balance || 0) - redirect_amount,
          });
          // Record as repayment
          await base44.entities.Repayment.create({
            loan_id: target_loan_id,
            user_id: user.id,
            amount: redirect_amount,
            due_date: new Date().toISOString().split('T')[0],
            paid_date: new Date().toISOString().split('T')[0],
            status: 'paid',
            payment_method: 'wallet',
            transaction_ref: `SURPLUS-${Date.now()}`,
          });
          // Update loan outstanding balance
          await base44.entities.LoanApplication.update(target_loan_id, {
            outstanding_balance: Math.max(0, (targetLoan.outstanding_balance || targetLoan.total_repayable || 0) - redirect_amount),
          });
          redirectResult = { success: true, pocket: pocket.name, amount: redirect_amount };
          break;
        }
      }
      if (!redirectResult) {
        redirectResult = { success: false, error: 'Insufficient balance in any pocket' };
      }
    }
  }

  return Response.json({
    method,
    debts: sortedDebts,
    total_debt: totalDebt,
    total_monthly_minimum: totalMonthlyMin,
    total_surplus_savings: totalSurplusSavings,
    payoff_months_standard: baselineMonths,
    payoff_months_with_extra: month,
    months_saved: Math.max(0, baselineMonths - month),
    total_interest_paid: Math.round(totalInterestPaid),
    plan: plan.slice(0, 24),
    redirect_result: redirectResult,
  });
});