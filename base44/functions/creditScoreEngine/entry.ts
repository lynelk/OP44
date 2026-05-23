/**
 * CreditScoreEngine — Centralized Trust Score aggregator
 *
 * Aggregates data from:
 *   - Traditional loan repayments (LoanApplication + Repayment)
 *   - P2P lending/borrowing activity (P2PLoan + P2PRepayment + LenderInvestment)
 *   - Savings history (SavingsPocket + SavingsGoal + GoalContribution)
 *   - GNUGRID CRB external bureau
 *   - KYC verification status
 *   - Income & employment data
 *
 * Stores the computed Trust Score on UserProfile.trust_score for platform-wide consistency.
 *
 * Usage:
 *   POST { user_id?: string }           — recalculate for a specific user (admin only for others)
 *   POST { recalculate_all: true }      — batch recalculate all active users (admin only)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── GNUGRID CRB Lookup ────────────────────────────────────────────────────────
async function fetchGnugridCRB({ national_id, phone_number, full_name }) {
  const baseUrl = Deno.env.get('GNUGRID_BASE_URL');
  const apiKey = Deno.env.get('GNUGRID_API_KEY');
  if (!baseUrl || !apiKey) return null;

  const res = await fetch(`${baseUrl}/v1/credit-check`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ national_id, phone_number, full_name }),
  });
  if (!res.ok) { console.warn(`GNUGRID failed (${res.status}): ${await res.text()}`); return null; }
  return await res.json();
}

// ─── Core Scoring Function ────────────────────────────────────────────────────
async function computeTrustScore(base44, targetUserId, userName) {
  const [
    loans, repayments, kycDocs, savingsPockets, savingsGoals,
    goalContributions, expenses, profile, p2pLoans, p2pRepayments, lenderInvestments
  ] = await Promise.all([
    base44.asServiceRole.entities.LoanApplication.filter({ user_id: targetUserId }),
    base44.asServiceRole.entities.Repayment.filter({ user_id: targetUserId }),
    base44.asServiceRole.entities.KYCDocument.filter({ user_id: targetUserId }),
    base44.asServiceRole.entities.SavingsPocket.filter({ user_id: targetUserId }),
    base44.asServiceRole.entities.SavingsGoal.filter({ user_id: targetUserId }),
    base44.asServiceRole.entities.GoalContribution.filter({ user_id: targetUserId }),
    base44.asServiceRole.entities.Expense.filter({ user_id: targetUserId }),
    base44.asServiceRole.entities.UserProfile.filter({ user_id: targetUserId }),
    base44.asServiceRole.entities.P2PLoan.filter({ borrower_id: targetUserId }),
    base44.asServiceRole.entities.P2PRepayment.filter({ borrower_id: targetUserId }),
    base44.asServiceRole.entities.LenderInvestment.filter({ lender_id: targetUserId }),
  ]);

  const userProfile = profile[0] || {};

  // GNUGRID CRB lookup
  let crbData = null;
  if (userProfile.national_id || userProfile.phone_number) {
    crbData = await fetchGnugridCRB({
      national_id: userProfile.national_id,
      phone_number: userProfile.phone_number,
      full_name: userName,
    });
  }

  let score = 300;
  const reasonCodes = [];
  const breakdown = {
    kyc_score: 0,
    repayment_score: 0,
    loan_history_score: 0,
    income_score: 0,
    crb_score: 0,
    p2p_score: 0,
    savings_boost: 0,
    savings_goal_boost: 0,
    expense_boost: 0,
  };

  // 1. KYC Score (max 100 pts)
  const approvedDocs = kycDocs.filter(d => d.status === 'approved');
  const kycPoints = Math.min(approvedDocs.length * 25, 100);
  breakdown.kyc_score = kycPoints;
  score += kycPoints;
  if (approvedDocs.length === 0) reasonCodes.push('NO_KYC_VERIFIED');
  else if (approvedDocs.length < 3) reasonCodes.push('PARTIAL_KYC');
  else reasonCodes.push('FULL_KYC_VERIFIED');

  // 2. Repayment Behaviour — All Loans (max 150 pts)
  const allRepayments = [...repayments, ...p2pRepayments];
  if (allRepayments.length > 0) {
    const paidOnTime = allRepayments.filter(r => r.status === 'paid' && r.paid_date && r.due_date && r.paid_date <= r.due_date).length;
    const overdueCount = allRepayments.filter(r => r.status === 'overdue').length;
    const onTimeRate = paidOnTime / allRepayments.length;
    const repayPoints = Math.round(onTimeRate * 150);
    breakdown.repayment_score = repayPoints;
    score += repayPoints;
    if (overdueCount > 0) reasonCodes.push(`OVERDUE_PAYMENTS:${overdueCount}`);
    if (onTimeRate >= 0.95) reasonCodes.push('EXCELLENT_REPAYMENT');
    else if (onTimeRate >= 0.80) reasonCodes.push('GOOD_REPAYMENT');
    else if (onTimeRate >= 0.60) reasonCodes.push('FAIR_REPAYMENT');
    else reasonCodes.push('POOR_REPAYMENT');
  } else {
    reasonCodes.push('NO_REPAYMENT_HISTORY');
  }

  // 3. Loan History (max 100 pts)
  const allLoans = [...loans, ...p2pLoans];
  const closedLoans = allLoans.filter(l => l.status === 'closed').length;
  const defaultedLoans = allLoans.filter(l => l.status === 'defaulted' || l.status === 'written_off').length;
  const loanHistoryPoints = Math.max(0, Math.min(closedLoans * 20 - defaultedLoans * 50, 100));
  breakdown.loan_history_score = loanHistoryPoints;
  score += loanHistoryPoints;
  if (defaultedLoans > 0) reasonCodes.push(`LOAN_DEFAULTS:${defaultedLoans}`);
  if (closedLoans >= 5) reasonCodes.push('SEASONED_BORROWER');

  // 4. Income & Employment (max 100 pts)
  const monthlyIncome = userProfile.monthly_income || 0;
  let incomePoints = 0;
  if (userProfile.employment_status === 'employed') incomePoints += 30;
  else if (userProfile.employment_status === 'self_employed') incomePoints += 20;
  else if (userProfile.employment_status === 'retired') incomePoints += 15;
  if (monthlyIncome > 1000000) incomePoints += 70;
  else if (monthlyIncome > 500000) incomePoints += 55;
  else if (monthlyIncome > 200000) incomePoints += 40;
  else if (monthlyIncome > 100000) incomePoints += 25;
  else if (monthlyIncome > 50000) incomePoints += 10;
  incomePoints = Math.min(incomePoints, 100);
  breakdown.income_score = incomePoints;
  score += incomePoints;
  if (!monthlyIncome) reasonCodes.push('NO_INCOME_DECLARED');

  // 5. GNUGRID CRB Boost (max 150 pts)
  if (crbData) {
    const crbScore = crbData.credit_score || crbData.score || 0;
    const crbMax = crbData.max_score || 1000;
    const crbPoints = Math.round((crbScore / crbMax) * 150);
    breakdown.crb_score = crbPoints;
    score += crbPoints;
    reasonCodes.push(`CRB_SCORE:${crbScore}`);
    if (crbData.has_active_arrears) { reasonCodes.push('CRB_ACTIVE_ARREARS'); score -= 30; }
    if (crbData.has_fraud_flag) { reasonCodes.push('CRB_FRAUD_FLAG'); score -= 80; }
    if (crbData.crb_rating) reasonCodes.push(`CRB_RATING:${crbData.crb_rating}`);
  } else {
    reasonCodes.push('CRB_NOT_AVAILABLE');
  }

  // 6. P2P Lending Track Record (max 75 pts)
  const completedInvestments = lenderInvestments.filter(i => i.status === 'completed');
  const activeInvestments = lenderInvestments.filter(i => i.status === 'active');
  const totalInvested = lenderInvestments.reduce((s, i) => s + (i.amount_invested || 0), 0);
  let p2pPoints = Math.min(completedInvestments.length * 15, 45) + Math.min(activeInvestments.length * 5, 20);
  if (totalInvested > 5000000) p2pPoints += 10;
  p2pPoints = Math.min(p2pPoints, 75);
  breakdown.p2p_score = p2pPoints;
  score += p2pPoints;
  if (p2pPoints > 0) reasonCodes.push(`P2P_INVESTOR:+${p2pPoints}pts`);

  // 7. Savings Pocket Consistency (max 100 pts)
  if (savingsPockets.length > 0) {
    const activePockets = savingsPockets.filter(s => s.status === 'active');
    const completedPockets = savingsPockets.filter(s => s.status === 'completed');
    const totalBalance = savingsPockets.reduce((s, p) => s + (p.current_balance || 0), 0);
    let savingsBoost = Math.min(activePockets.length * 10, 30) + Math.min(completedPockets.length * 20, 40);
    if (totalBalance > 2000000) savingsBoost += 30;
    else if (totalBalance > 1000000) savingsBoost += 20;
    else if (totalBalance > 500000) savingsBoost += 15;
    else if (totalBalance > 100000) savingsBoost += 10;
    savingsBoost = Math.min(savingsBoost, 100);
    breakdown.savings_boost = savingsBoost;
    score += savingsBoost;
    if (savingsBoost > 0) reasonCodes.push(`SAVINGS_BOOST:+${savingsBoost}pts`);
  }

  // 8. Savings Goals Achievement (max 50 pts)
  const completedGoals = savingsGoals.filter(g => g.status === 'completed').length;
  const consistentContributions = goalContributions.length;
  let goalBoost = Math.min(completedGoals * 15, 30) + Math.min(Math.floor(consistentContributions / 5), 20);
  goalBoost = Math.min(goalBoost, 50);
  breakdown.savings_goal_boost = goalBoost;
  score += goalBoost;
  if (goalBoost > 0) reasonCodes.push(`SAVINGS_GOALS:+${goalBoost}pts`);

  // 9. Responsible Spending (max 50 pts)
  if (expenses.length > 0) {
    const recent = expenses.slice(-30);
    const positiveExpenses = recent.filter(e => ['savings', 'loan_repayment'].includes(e.category));
    const ratio = recent.length > 0 ? positiveExpenses.length / recent.length : 0;
    let expenseBoost = ratio >= 0.3 ? 50 : ratio >= 0.2 ? 30 : ratio >= 0.1 ? 15 : 0;
    breakdown.expense_boost = expenseBoost;
    score += expenseBoost;
    if (expenseBoost > 0) reasonCodes.push(`RESPONSIBLE_SPENDING:+${expenseBoost}pts`);
  }

  // ── Cap score ──
  score = Math.min(Math.max(Math.round(score), 300), 850);

  // ── Risk Band & Trust Tier ──
  const riskBand = score >= 720 ? 'A' : score >= 620 ? 'B' : score >= 500 ? 'C' : 'D';
  const trustTier = score >= 720 ? 'platinum' : score >= 620 ? 'gold' : score >= 500 ? 'silver' : score >= 400 ? 'bronze' : 'restricted';
  const reputationLevel = score >= 750 ? 'elite' : score >= 650 ? 'trusted' : score >= 550 ? 'established' : score >= 450 ? 'building' : 'new';

  const incomeMultiplier = { A: 6, B: 4, C: 2.5, D: 1 };
  const maxLoanLimit = Math.round(monthlyIncome * (incomeMultiplier[riskBand] || 1));

  // ── Persist CreditScore record ──
  const creditRecord = await base44.asServiceRole.entities.CreditScore.create({
    user_id: targetUserId,
    score,
    risk_band: riskBand,
    calculated_at: new Date().toISOString(),
    score_breakdown: breakdown,
    reason_codes: reasonCodes,
    max_loan_limit: maxLoanLimit,
  });

  // ── Update UserProfile.trust_score (single source of truth) ──
  if (userProfile.id) {
    await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
      trust_score: score,
      risk_tier: trustTier,
      reputation_level: reputationLevel,
      kyc_status: approvedDocs.length >= 3 ? 'verified' : userProfile.kyc_status,
    });
  }

  return {
    user_id: targetUserId,
    score,
    risk_band: riskBand,
    risk_tier: trustTier,
    reputation_level: reputationLevel,
    breakdown,
    reason_codes: reasonCodes,
    max_loan_limit: maxLoanLimit,
    crb_available: !!crbData,
    record_id: creditRecord.id,
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { user_id, recalculate_all } = body;

    // ── Batch recalculation (admin only) ──
    if (recalculate_all) {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ account_status: 'active' });
      const results = [];
      for (const profile of profiles) {
        const result = await computeTrustScore(base44, profile.user_id, profile.user_id);
        results.push({ user_id: profile.user_id, score: result.score, risk_band: result.risk_band });
      }
      return Response.json({ batch: true, count: results.length, results });
    }

    // ── Single user recalculation ──
    const targetUserId = user_id || user.id;
    if (user_id && user_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin access required to score other users' }, { status: 403 });
    }

    const result = await computeTrustScore(base44, targetUserId, user.full_name);
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});