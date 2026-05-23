import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── GnuGrid: Get OAuth Token ─────────────────────────────────────────────────
async function getGnugridToken() {
  const baseUrl = Deno.env.get('GNUGRID_BASE_URL');
  const clientId = Deno.env.get('GNUGRID_CLIENT_ID');
  const clientSecret = Deno.env.get('GNUGRID_CLIENT_SECRET');
  if (!baseUrl || !clientId || !clientSecret) return null;

  const res = await fetch(`${baseUrl}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) { console.warn(`GnuGrid auth failed: ${await res.text()}`); return null; }
  const d = await res.json();
  return d.access_token || null;
}

// ─── GnuGrid: Credit Score (CRB + MNO) ───────────────────────────────────────
async function fetchGnugridCreditScore({ national_id, phone_number }) {
  const baseUrl = Deno.env.get('GNUGRID_BASE_URL');
  const token = await getGnugridToken();
  if (!token || !baseUrl) return null;

  const payload = { entity_type: 0, client_consented: 'Yes', type: phone_number && national_id ? 'CRB.MNO' : national_id ? 'CRB' : 'MNO' };
  if (national_id) { payload.identifier = national_id; payload.identification_type = 'ii_country_id'; }
  if (phone_number) payload.phone_number = phone_number;

  const res = await fetch(`${baseUrl}/v1/credit-enquiries/credit-scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.status === 'error') { console.warn(`GnuGrid credit score error: ${JSON.stringify(data)}`); return null; }
  return data.data || data;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const targetUserId = body.user_id || user.id;

    if (body.user_id && body.user_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [loans, repayments, kycDocs, savingsPockets, expenses, profile, p2pLoans, p2pRepayments, lenderInvestments] = await Promise.all([
      base44.asServiceRole.entities.LoanApplication.filter({ user_id: targetUserId }),
      base44.asServiceRole.entities.Repayment.filter({ user_id: targetUserId }),
      base44.asServiceRole.entities.KYCDocument.filter({ user_id: targetUserId }),
      base44.asServiceRole.entities.SavingsPocket.filter({ user_id: targetUserId }),
      base44.asServiceRole.entities.Expense.filter({ user_id: targetUserId }),
      base44.asServiceRole.entities.UserProfile.filter({ user_id: targetUserId }),
      base44.asServiceRole.entities.P2PLoan.filter({ borrower_id: targetUserId }),
      base44.asServiceRole.entities.P2PRepayment.filter({ borrower_id: targetUserId }),
      base44.asServiceRole.entities.LenderInvestment.filter({ lender_id: targetUserId }),
    ]);

    const userProfile = profile[0] || {};

    // ── GnuGrid CRB + MNO lookup ──
    let crbData = null;
    if (userProfile.national_id || userProfile.phone_number) {
      crbData = await fetchGnugridCreditScore({
        national_id: userProfile.national_id,
        phone_number: userProfile.phone_number,
      });
    }

    let score = 300;
    const reasonCodes = [];
    const breakdown = { kyc_score: 0, repayment_score: 0, loan_history_score: 0, savings_boost: 0, expense_boost: 0, income_score: 0, crb_score: 0, p2p_score: 0 };

    // 1. KYC Score (max 100 pts)
    const approvedDocs = kycDocs.filter(d => d.status === 'approved');
    const kycPoints = Math.min(approvedDocs.length * 25, 100);
    breakdown.kyc_score = kycPoints; score += kycPoints;
    if (approvedDocs.length === 0) reasonCodes.push('NO_KYC_VERIFIED');
    else if (approvedDocs.length < 3) reasonCodes.push('PARTIAL_KYC');
    else reasonCodes.push('FULL_KYC_VERIFIED');

    // 2. Repayment Behaviour (max 150 pts)
    const allRepayments = [...repayments, ...p2pRepayments];
    if (allRepayments.length > 0) {
      const paidOnTime = allRepayments.filter(r => r.status === 'paid' && r.paid_date && r.due_date && r.paid_date <= r.due_date).length;
      const overdueCount = allRepayments.filter(r => r.status === 'overdue').length;
      const onTimeRate = paidOnTime / allRepayments.length;
      const repayPoints = Math.round(onTimeRate * 150);
      breakdown.repayment_score = repayPoints; score += repayPoints;
      if (overdueCount > 0) reasonCodes.push(`OVERDUE_PAYMENTS:${overdueCount}`);
      if (onTimeRate >= 0.95) reasonCodes.push('EXCELLENT_REPAYMENT');
      else if (onTimeRate >= 0.80) reasonCodes.push('GOOD_REPAYMENT');
      else reasonCodes.push('POOR_REPAYMENT');
    } else { reasonCodes.push('NO_REPAYMENT_HISTORY'); }

    // 3. Loan History (max 100 pts)
    const allLoans = [...loans, ...p2pLoans];
    const closedLoans = allLoans.filter(l => l.status === 'closed').length;
    const defaultedLoans = allLoans.filter(l => l.status === 'defaulted' || l.status === 'written_off').length;
    const loanHistoryPoints = Math.max(0, Math.min(closedLoans * 20 - defaultedLoans * 50, 100));
    breakdown.loan_history_score = loanHistoryPoints; score += loanHistoryPoints;
    if (defaultedLoans > 0) reasonCodes.push(`LOAN_DEFAULTS:${defaultedLoans}`);

    // 4. Income (max 100 pts)
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
    breakdown.income_score = incomePoints; score += incomePoints;
    if (!monthlyIncome) reasonCodes.push('NO_INCOME_DECLARED');

    // 5. GnuGrid CRB Score Boost (max 150 pts)
    if (crbData) {
      const crbSection = crbData.CRB || {};
      const mnoSection = crbData.MNO || {};
      const crbScoreVal = parseFloat(crbSection?.Scoring?.Score || 0);
      const mnoScoreVal = parseFloat(mnoSection?.Scoring?.Score || 0);
      const combinedCrbScore = Math.max(crbScoreVal, mnoScoreVal);
      const crbMax = 900; // GnuGrid max is ~900
      const crbPoints = Math.min(Math.round((combinedCrbScore / crbMax) * 150), 150);
      breakdown.crb_score = crbPoints; score += crbPoints;
      reasonCodes.push(`CRB_SCORE:${combinedCrbScore}`);
      if (crbSection?.Scoring?.Rating) reasonCodes.push(`CRB_RATING:${crbSection.Scoring.Rating}`);
      const adverseAccounts = crbSection?.Credit_Accounts?.Adverse_Accounts || 0;
      if (adverseAccounts > 0) { reasonCodes.push('CRB_ADVERSE_ACCOUNTS'); score -= 30; }
      const fraudCases = (crbSection?.Financial_Fraud?.[0]?.Cases || 0);
      if (fraudCases > 0) { reasonCodes.push('CRB_FRAUD_FLAG'); score -= 80; }
      const worstDays = crbSection?.Credit_Accounts?.Worst_Days_in_Arreas || 0;
      if (worstDays > 90) { reasonCodes.push('CRB_LONG_ARREARS'); score -= 20; }
      // MNO income proxy
      const monthlyTurnover = mnoSection?.Income_Proxy?.Monthly_Turnover_Amount || 0;
      if (monthlyTurnover > 500000) { score += 15; reasonCodes.push('MNO_GOOD_TURNOVER'); }
    } else {
      reasonCodes.push('CRB_NOT_AVAILABLE');
    }

    // 6. P2P (max 75 pts)
    const completedInv = lenderInvestments.filter(i => i.status === 'completed');
    const activeInv = lenderInvestments.filter(i => i.status === 'active');
    let p2pPoints = Math.min(completedInv.length * 15, 45) + Math.min(activeInv.length * 5, 20);
    p2pPoints = Math.min(p2pPoints, 75);
    breakdown.p2p_score = p2pPoints; score += p2pPoints;
    if (p2pPoints > 0) reasonCodes.push(`P2P_INVESTOR:+${p2pPoints}pts`);

    // 7. Savings Boost (max 100 pts)
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
      breakdown.savings_boost = savingsBoost; score += savingsBoost;
      if (savingsBoost > 0) reasonCodes.push(`SAVINGS_BOOST:+${savingsBoost}pts`);
    }

    // 8. Responsible Spending (max 50 pts)
    if (expenses.length > 0) {
      const recent = expenses.slice(-30);
      const posExp = recent.filter(e => ['savings', 'loan_repayment'].includes(e.category));
      const ratio = posExp.length / recent.length;
      let expBoost = ratio >= 0.3 ? 50 : ratio >= 0.2 ? 30 : ratio >= 0.1 ? 15 : 0;
      breakdown.expense_boost = expBoost; score += expBoost;
      if (expBoost > 0) reasonCodes.push(`RESPONSIBLE_SPENDING:+${expBoost}pts`);
    }

    // ── Cap & Risk Band ──
    score = Math.min(Math.max(Math.round(score), 300), 850);
    const riskBand = score >= 720 ? 'A' : score >= 620 ? 'B' : score >= 500 ? 'C' : 'D';
    const trustTier = score >= 720 ? 'platinum' : score >= 620 ? 'gold' : score >= 500 ? 'silver' : score >= 400 ? 'bronze' : 'restricted';
    const reputationLevel = score >= 750 ? 'elite' : score >= 650 ? 'trusted' : score >= 550 ? 'established' : score >= 450 ? 'building' : 'new';
    const incomeMultiplier = { A: 6, B: 4, C: 2.5, D: 1 };
    const maxLoanLimit = Math.round(monthlyIncome * (incomeMultiplier[riskBand] || 1));

    // ── Persist ──
    const creditScoreRecord = await base44.asServiceRole.entities.CreditScore.create({
      user_id: targetUserId, score, risk_band: riskBand,
      calculated_at: new Date().toISOString(),
      score_breakdown: breakdown, reason_codes: reasonCodes, max_loan_limit: maxLoanLimit,
    });

    if (userProfile.id) {
      await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
        trust_score: score, risk_tier: trustTier, reputation_level: reputationLevel,
        kyc_status: approvedDocs.length >= 3 ? 'verified' : userProfile.kyc_status,
      });
    }

    return Response.json({
      score, risk_band: riskBand, risk_tier: trustTier, reputation_level: reputationLevel,
      breakdown, reason_codes: reasonCodes, max_loan_limit: maxLoanLimit,
      crb_available: !!crbData,
      crb_summary: crbData ? {
        crb_score: crbData.CRB?.Scoring?.Score,
        crb_band: crbData.CRB?.Scoring?.Band,
        crb_rating: crbData.CRB?.Scoring?.Rating,
        probability_of_default: crbData.CRB?.Scoring?.Probability_of_Default_Percent,
        mno_score: crbData.MNO?.Scoring?.Score,
        mno_band: crbData.MNO?.Scoring?.Band,
      } : null,
      record_id: creditScoreRecord.id,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});