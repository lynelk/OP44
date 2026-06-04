/**
 * finance — pure, unit-tested money math shared across the app.
 * Keeping these in one place (instead of inline in pages) makes them testable
 * and keeps borrower-facing estimates consistent with the backend.
 */

/** Monthly instalment for an amortising loan. */
export function monthlyInstallment(
  principal: number,
  monthlyRate: number,
  months: number,
): number {
  if (!principal || !months || months <= 0) return 0;
  if (!monthlyRate || monthlyRate <= 0) return Math.round(principal / months);
  const pow = Math.pow(1 + monthlyRate, months);
  return Math.round((principal * monthlyRate * pow) / (pow - 1));
}

/** Total repayable over the full term. */
export function totalRepayable(
  principal: number,
  monthlyRate: number,
  months: number,
): number {
  return monthlyInstallment(principal, monthlyRate, months) * months;
}

export interface PrepaymentResult {
  amount: number;
  penalty: number;
  totalCharged: number;
  remaining: number;
}

/**
 * Early-settlement (prepayment) fee and resulting balance.
 * @param outstanding current outstanding balance
 * @param prepayAmount principal the user wants to prepay
 * @param feeRate fee as a fraction of the prepay amount (default 2%)
 */
export function prepaymentBreakdown(
  outstanding: number,
  prepayAmount: number,
  feeRate = 0.02,
): PrepaymentResult {
  const amount = Math.max(0, Number(prepayAmount) || 0);
  const penalty = Math.round(amount * feeRate);
  const totalCharged = amount + penalty;
  const remaining = Math.max(0, (Number(outstanding) || 0) - amount);
  return { amount, penalty, totalCharged, remaining };
}

/** Estimated periodic interest credited on a savings balance. */
export function savingsInterest(
  balance: number,
  annualRate = 0.06,
  periodsPerYear = 12,
): number {
  const b = Number(balance) || 0;
  if (b <= 0 || annualRate <= 0) return 0;
  return Math.round(b * (annualRate / periodsPerYear));
}

export interface HHIResult {
  hhi: number;
  effectiveN: number;
}

/**
 * Portfolio concentration via Herfindahl-Hirschman Index (HHI).
 * Returns { hhi, effectiveN } where hhi ∈ (0,1]; lower = more diversified.
 */
export function hhi(amounts: number[]): HHIResult {
  const total = amounts.reduce((s, a) => s + (Number(a) || 0), 0);
  if (total <= 0) return { hhi: 0, effectiveN: 0 };
  const sumSq = amounts.reduce((s, a) => {
    const share = (Number(a) || 0) / total;
    return s + share * share;
  }, 0);
  return { hhi: sumSq, effectiveN: sumSq > 0 ? 1 / sumSq : 0 };
}

/** Repayment progress as a 0–100 percentage. */
export function repaymentProgressPct(
  totalRepayableAmt: number,
  outstanding: number | null | undefined,
): number {
  const total = Number(totalRepayableAmt) || 0;
  if (total <= 0) return 0;
  const owed = outstanding == null ? total : Number(outstanding);
  const repaid = total - owed;
  return Math.min(100, Math.max(0, (repaid / total) * 100));
}
