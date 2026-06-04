import { describe, it, expect } from 'vitest';
import {
  monthlyInstallment, totalRepayable, prepaymentBreakdown,
  savingsInterest, hhi, repaymentProgressPct,
} from './finance';

describe('monthlyInstallment', () => {
  it('uses straight-line when rate is zero', () => {
    expect(monthlyInstallment(1200, 0, 12)).toBe(100);
  });
  it('amortises with interest (5%/mo, 6mo, 100k)', () => {
    // Known amortisation: ~19,702 per month
    expect(monthlyInstallment(100000, 0.05, 6)).toBe(19702);
  });
  it('returns 0 for invalid inputs', () => {
    expect(monthlyInstallment(0, 0.05, 6)).toBe(0);
    expect(monthlyInstallment(100000, 0.05, 0)).toBe(0);
  });
});

describe('totalRepayable', () => {
  it('is instalment × months', () => {
    expect(totalRepayable(1200, 0, 12)).toBe(1200);
    expect(totalRepayable(100000, 0.05, 6)).toBe(19702 * 6);
  });
});

describe('prepaymentBreakdown', () => {
  it('computes a 2% fee and remaining balance', () => {
    const r = prepaymentBreakdown(500000, 200000);
    expect(r.amount).toBe(200000);
    expect(r.penalty).toBe(4000);
    expect(r.totalCharged).toBe(204000);
    expect(r.remaining).toBe(300000);
  });
  it('never goes negative on overpayment', () => {
    const r = prepaymentBreakdown(100000, 250000);
    expect(r.remaining).toBe(0);
  });
  it('honours a custom fee rate', () => {
    expect(prepaymentBreakdown(100000, 100000, 0.05).penalty).toBe(5000);
  });
});

describe('savingsInterest', () => {
  it('computes monthly interest at 6% p.a.', () => {
    expect(savingsInterest(100000)).toBe(500);
  });
  it('returns 0 for empty balance', () => {
    expect(savingsInterest(0)).toBe(0);
  });
});

describe('hhi', () => {
  it('is 1 for a single position', () => {
    expect(hhi([1000]).hhi).toBeCloseTo(1, 5);
  });
  it('approaches 1/n for equal positions', () => {
    const { hhi: h, effectiveN } = hhi([100, 100, 100, 100]);
    expect(h).toBeCloseTo(0.25, 5);
    expect(effectiveN).toBeCloseTo(4, 5);
  });
  it('handles empty portfolio', () => {
    expect(hhi([]).hhi).toBe(0);
  });
});

describe('repaymentProgressPct', () => {
  it('is 0 at start and 100 when cleared', () => {
    expect(repaymentProgressPct(120000, 120000)).toBe(0);
    expect(repaymentProgressPct(120000, 0)).toBe(100);
  });
  it('is 50 at the halfway point', () => {
    expect(repaymentProgressPct(120000, 60000)).toBe(50);
  });
  it('clamps out-of-range values', () => {
    expect(repaymentProgressPct(120000, 200000)).toBe(0);
    expect(repaymentProgressPct(0, 0)).toBe(0);
  });
});
