/**
 * finance — pure, unit-tested money math shared across the app.
 * Keeping these in one place (instead of inline in pages) makes them testable
 * and keeps borrower-facing estimates consistent with the backend.
 */

/**
 * Monthly instalment for an amortising loan.
 * M = P*r*(1+r)^n / ((1+r)^n - 1), with r=0 → straight-line.
 * @param {number} principal
 * @param {number} monthlyRate decimal per month, e.g. 0.05 for 5%/mo
 * @param {number} months
 * @returns {number} rounded monthly instalment
 */
export function monthlyInstallment(principal, monthlyRate, months) {
  if (!principal || !months || months <= 0) return 0;
  if (!monthlyRate || monthlyRate <= 0) return Math.round(principal / months);
  const pow = Math.pow(1 + monthlyRate, months);
  return Math.round((principal * monthlyRate * pow) / (pow - 1));
}

/** Total repayable over the full term. */
export function totalRepayable(principal, monthlyRate, months) {
  return monthlyInstallment(principal, monthlyRate, months) * months;
}

/**
 * Early-settlement (prepayment) fee and resulting balance.
 * @param {number} outstanding current outstanding balance
 * @param {number} prepayAmount principal the user wants to prepay
 * @param {number} [feeRate=0.02] fee as a fraction of the prepay amount
 */
export function prepaymentBreakdown(outstanding, prepayAmount, feeRate = 0.02) {
  const amount = Math.max(0, Number(prepayAmount) || 0);
  const penalty = Math.round(amount * feeRate);
  const totalCharged = amount + penalty;
  const remaining = Math.max(0, (Number(outstanding) || 0) - amount);
  return { amount, penalty, totalCharged, remaining };
}

/** Estimated periodic interest credited on a savings balance. */
export function savingsInterest(balance, annualRate = 0.06, periodsPerYear = 12) {
  const b = Number(balance) || 0;
  if (b <= 0 || annualRate <= 0) return 0;
  return Math.round(b * (annualRate / periodsPerYear));
}

/**
 * Portfolio concentration via Herfindahl-Hirschman Index (HHI).
 * Returns { hhi, effectiveN } where hhi ∈ (0,1]; lower = more diversified.
 * @param {number[]} amounts invested amounts per position
 */
export function hhi(amounts) {
  const total = amounts.reduce((s, a) => s + (Number(a) || 0), 0);
  if (total <= 0) return { hhi: 0, effectiveN: 0 };
  const sumSq = amounts.reduce((s, a) => {
    const share = (Number(a) || 0) / total;
    return s + share * share;
  }, 0);
  return { hhi: sumSq, effectiveN: sumSq > 0 ? 1 / sumSq : 0 };
}

/** Repayment progress as a 0–100 percentage. */
export function repaymentProgressPct(totalRepayableAmt, outstanding) {
  const total = Number(totalRepayableAmt) || 0;
  if (total <= 0) return 0;
  // outstanding of 0 is valid (fully repaid); only fall back to `total` when it's null/undefined.
  const owed = outstanding == null ? total : Number(outstanding);
  const repaid = total - owed;
  return Math.min(100, Math.max(0, (repaid / total) * 100));
}
