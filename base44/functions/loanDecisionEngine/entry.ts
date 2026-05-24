/**
 * loanDecisionEngine — Unified Loan Decision Engine
 *
 * Aggregates data from:
 *   UserProfile, CreditScore, Repayment, P2PRepayment, SavingsPocket,
 *   SavingsGoal, UserSavingsChallenge, InsurancePolicy, P2PLoan,
 *   LenderInvestment, KYCDocument, LoanProduct, FinancialHealthReport
 *
 * Returns a standardised decision object that can be:
 *   - Mapped directly to a USSD response string (channel="ussd")
 *   - Used to drive UI state on web/app (channel="app", default)
 *
 * POST body:
 *   { amountRequested, tenureMonths, purpose, productId?, channel? }
 *   Admin override: { userId, amountRequested, tenureMonths, purpose, channel? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Interest rate helpers ─────────────────────────────────────────────────────
function calcMonthlyInstallment(principal, monthlyRatePct, months) {
  const r = monthlyRatePct / 100;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

// ── Risk band → interest rate (max 1.5% / month per policy) ──────────────────
const BAND_RATE = { A: 0.8, B: 1.0, C: 1.3, D: 1.5 };

// ── USSD response formatter (160-char friendly) ───────────────────────────────
function formatUssd(decision) {
  if (decision.approved) {
    const inst = Math.round(decision.monthlyInstallment).toLocaleString();
    const amt  = Math.round(decision.approvedAmount).toLocaleString();
    return `APPROVED\nUGX ${amt} for ${decision.tenureMonths} months\nMonthly: UGX ${inst}\nRef: ${decision.loanApplicationId?.slice(-8) || 'N/A'}\nReply 1 to Accept`;
  }
  const reason = decision.declineReasons?.[0] || 'Eligibility criteria not met';
  const tip    = decision.suggestedActions?.[0] || '';
  return `DECLINED\n${reason}${tip ? '\nTip: ' + tip : ''}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44  = createClientFromRequest(req);
    const user    = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const {
      amountRequested, tenureMonths, purpose = 'Personal',
      productId, channel = 'app',
      userId: overrideUserId,
    } = body;

    // Admin can request on behalf of another user
    const targetId = (overrideUserId && user.role === 'admin') ? overrideUserId : user.id;

    if (!amountRequested || !tenureMonths) {
      return Response.json({ error: 'amountRequested and tenureMonths are required' }, { status: 400 });
    }

    // ── 1. Fetch all relevant data in parallel ──────────────────────────────
    const [
      profiles, creditScores, repayments, p2pRepayments,
      savingsPockets, savingsGoals, challenges,
      insurancePolicies, p2pLoans, lenderInvestments,
      kycDocs, loanProducts, healthReports, activeApplications,
    ] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.filter({ user_id: targetId }),
      base44.asServiceRole.entities.CreditScore.filter({ user_id: targetId }),
      base44.asServiceRole.entities.Repayment.filter({ user_id: targetId }),
      base44.asServiceRole.entities.P2PRepayment.filter({ borrower_id: targetId }),
      base44.asServiceRole.entities.SavingsPocket.filter({ user_id: targetId }),
      base44.asServiceRole.entities.SavingsGoal.filter({ user_id: targetId }),
      base44.asServiceRole.entities.UserSavingsChallenge.filter({ user_id: targetId }),
      base44.asServiceRole.entities.InsurancePolicy.filter({ user_id: targetId }),
      base44.asServiceRole.entities.P2PLoan.filter({ borrower_id: targetId }),
      base44.asServiceRole.entities.LenderInvestment.filter({ lender_id: targetId }),
      base44.asServiceRole.entities.KYCDocument.filter({ user_id: targetId }),
      base44.asServiceRole.entities.LoanProduct.filter({ status: 'active' }),
      base44.asServiceRole.entities.FinancialHealthReport.filter({ user_id: targetId }),
      base44.asServiceRole.entities.LoanApplication.filter({ user_id: targetId }),
    ]);

    // ── 2. Extract latest/relevant records ─────────────────────────────────
    const profile    = profiles[0] || {};
    const latestCS   = creditScores.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0] || null;
    const latestFH   = healthReports.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;

    // ── 3. KYC signal ───────────────────────────────────────────────────────
    const approvedDocs    = kycDocs.filter(d => d.status === 'approved');
    const hasNationalId   = approvedDocs.some(d => d.document_type === 'national_id');
    const hasSelfie       = approvedDocs.some(d => d.document_type === 'selfie');
    const hasBankStmt     = approvedDocs.some(d => d.document_type === 'bank_statement');
    const hasEmployment   = approvedDocs.some(d => d.document_type === 'employment_letter');
    const kycLevel        = approvedDocs.length; // 0-5
    const kycVerified     = profile.kyc_status === 'verified' || kycLevel >= 3;

    // ── 4. Repayment signal ─────────────────────────────────────────────────
    const allRepayments   = [...repayments, ...p2pRepayments];
    const paidOnTime      = allRepayments.filter(r => r.status === 'paid' && r.paid_date && r.due_date && r.paid_date <= r.due_date).length;
    const overdueCount    = allRepayments.filter(r => r.status === 'overdue').length;
    const defaultedLoans  = [...(activeApplications || []), ...p2pLoans].filter(l => l.status === 'defaulted' || l.status === 'written_off').length;
    const onTimeRate      = allRepayments.length > 0 ? paidOnTime / allRepayments.length : 1;

    // ── 5. Savings signal ───────────────────────────────────────────────────
    const activePockets      = savingsPockets.filter(p => p.status === 'active');
    const totalSavingsBalance= savingsPockets.reduce((s, p) => s + (p.current_balance || 0), 0);
    const completedGoals     = savingsGoals.filter(g => g.status === 'completed').length;
    const completedChallenge = challenges.filter(c => c.status === 'completed').length;
    const savingsScore       = Math.min(100,
      (activePockets.length * 10) +
      (completedGoals * 15) +
      (completedChallenge * 10) +
      (totalSavingsBalance >= 2000000 ? 30 : totalSavingsBalance >= 500000 ? 20 : totalSavingsBalance > 0 ? 10 : 0)
    );

    // ── 6. Insurance signal ─────────────────────────────────────────────────
    const activePolicies   = insurancePolicies.filter(p => p.status === 'active');
    const insuranceBoost   = Math.min(20, activePolicies.length * 10); // up to 20 pts

    // ── 7. P2P signal ───────────────────────────────────────────────────────
    const completedP2P     = p2pLoans.filter(l => l.status === 'closed').length;
    const activeInvestments= lenderInvestments.filter(i => i.status === 'active').length;
    const p2pBoost         = Math.min(25, completedP2P * 8 + activeInvestments * 5);

    // ── 8. Income & DTI ─────────────────────────────────────────────────────
    const monthlyIncome    = profile.monthly_income || 0;
    const creditScore      = latestCS?.score || 300;
    const riskBand         = latestCS?.risk_band || 'D';
    const interestRate     = BAND_RATE[riskBand] || 1.5;

    const existingObligations = (activeApplications || [])
      .filter(l => ['active', 'disbursed'].includes(l.status))
      .reduce((s, l) => s + (l.monthly_installment || 0), 0);

    const proposedInstallment = calcMonthlyInstallment(amountRequested, interestRate, tenureMonths);
    const totalObligations    = existingObligations + proposedInstallment;
    const dtiRatio            = monthlyIncome > 0 ? (totalObligations / monthlyIncome) * 100 : 100;

    // ── 9. Hard-stop checks ─────────────────────────────────────────────────
    const declineReasons   = [];
    const suggestedActions = [];

    if (!hasNationalId) {
      declineReasons.push('National ID not verified');
      suggestedActions.push('Upload your National ID to unlock loan access');
    }
    if (defaultedLoans > 0) {
      declineReasons.push(`${defaultedLoans} defaulted loan(s) on record`);
      suggestedActions.push('Clear outstanding defaults before applying');
    }
    if (overdueCount >= 3) {
      declineReasons.push(`${overdueCount} overdue repayments`);
      suggestedActions.push('Bring overdue accounts current to improve eligibility');
    }
    if (profile.account_status === 'blacklisted' || profile.account_status === 'suspended') {
      declineReasons.push('Account is restricted');
    }
    if (profile.fraud_flags > 0) {
      declineReasons.push('Fraud flags on account — under review');
    }

    // ── 10. Soft checks & capacity ──────────────────────────────────────────
    if (creditScore < 400) {
      declineReasons.push('Credit score too low (minimum 400)');
      suggestedActions.push('Complete KYC and maintain savings to improve your score');
    }
    if (monthlyIncome === 0) {
      declineReasons.push('No declared income on profile');
      suggestedActions.push('Declare your income on your Profile to unlock credit');
    }
    if (dtiRatio > 60 && monthlyIncome > 0) {
      declineReasons.push(`Debt-to-income ratio too high (${Math.round(dtiRatio)}%)`);
      suggestedActions.push('Reduce existing loan obligations before taking on new credit');
    }
    if (amountRequested > (latestCS?.max_loan_limit || 0) && latestCS?.max_loan_limit > 0) {
      declineReasons.push(`Amount exceeds your limit of UGX ${(latestCS.max_loan_limit).toLocaleString()}`);
      suggestedActions.push('Apply for your pre-approved limit or reduce the amount requested');
    }

    // ── 11. Product matching ─────────────────────────────────────────────────
    let matchedProduct = null;
    if (productId) {
      matchedProduct = loanProducts.find(p => p.id === productId) || null;
    }
    if (!matchedProduct) {
      // Auto-select best product for this amount & risk band
      matchedProduct = loanProducts
        .filter(p =>
          amountRequested >= (p.min_amount || 0) &&
          amountRequested <= (p.max_amount || Infinity) &&
          (!p.risk_bands_allowed?.length || p.risk_bands_allowed.includes(riskBand)) &&
          (!p.min_credit_score || creditScore >= p.min_credit_score)
        )
        .sort((a, b) => (a.interest_rate_min || 0) - (b.interest_rate_min || 0))[0] || null;
    }

    if (!matchedProduct) {
      declineReasons.push('No eligible loan product found for this request');
      suggestedActions.push('Check available products and adjust your request');
    }

    // ── 12. Final decision ───────────────────────────────────────────────────
    const approved = declineReasons.length === 0;

    // Compute final terms
    const finalRate         = matchedProduct ? (matchedProduct.interest_rate_min + (matchedProduct.interest_rate_max - matchedProduct.interest_rate_min) * ({ A: 0, B: 0.33, C: 0.66, D: 1 }[riskBand] || 1)) : interestRate;
    const finalInstallment  = approved ? calcMonthlyInstallment(amountRequested, finalRate, tenureMonths) : 0;
    const totalRepayable    = approved ? finalInstallment * tenureMonths : 0;
    const disbursementFee   = approved ? amountRequested * 0.03 : 0;
    const insuranceCost     = approved ? amountRequested * 0.01 : 0;
    const netDisbursement   = approved ? amountRequested - disbursementFee - insuranceCost : 0;

    // ── 13. Create / update LoanApplication ─────────────────────────────────
    let loanApp = null;
    if (approved) {
      loanApp = await base44.asServiceRole.entities.LoanApplication.create({
        user_id: targetId,
        amount_requested: amountRequested,
        amount_approved: amountRequested,
        purpose,
        tenure_months: tenureMonths,
        interest_rate: finalRate,
        risk_band: riskBand,
        credit_score_at_application: creditScore,
        risk_band_at_application: riskBand,
        status: matchedProduct?.auto_approve_eligible && amountRequested <= (matchedProduct.auto_approve_max_amount || Infinity) && tenureMonths <= (matchedProduct.auto_approve_max_tenure_months || Infinity)
          ? 'approved' : 'submitted',
        monthly_installment: Math.round(finalInstallment),
        total_repayable: Math.round(totalRepayable),
        outstanding_balance: Math.round(amountRequested),
        disbursement_fee: Math.round(disbursementFee),
        insurance_cost: Math.round(insuranceCost),
        net_disbursement: Math.round(netDisbursement),
        submitted_by_agent: channel === 'ussd',
        description: `Applied via ${channel}. Product: ${matchedProduct?.name || 'Auto-matched'}.`,
      });
    }

    // ── 14. Build decision output ────────────────────────────────────────────
    const decision = {
      approved,
      channel,
      approvedAmount:      approved ? amountRequested : 0,
      tenureMonths,
      interestRate:        approved ? Math.round(finalRate * 100) / 100 : null,
      monthlyInstallment:  approved ? Math.round(finalInstallment) : null,
      totalRepayable:      approved ? Math.round(totalRepayable) : null,
      disbursementFee:     approved ? Math.round(disbursementFee) : null,
      insuranceCost:       approved ? Math.round(insuranceCost) : null,
      netDisbursement:     approved ? Math.round(netDisbursement) : null,
      loanApplicationId:   loanApp?.id || null,
      loanStatus:          loanApp?.status || null,
      matchedProduct:      matchedProduct ? { id: matchedProduct.id, name: matchedProduct.name } : null,
      declineReasons,
      suggestedActions,
      // Signals for UI
      signals: {
        creditScore,
        riskBand,
        kycLevel,
        kycVerified,
        onTimeRatePct: Math.round(onTimeRate * 100),
        dtiRatio: Math.round(dtiRatio),
        totalSavings: totalSavingsBalance,
        savingsScore,
        insuranceBoost,
        p2pBoost,
        activePolicies: activePolicies.length,
        monthlyIncome,
      },
      // USSD-ready string
      ussdMessage: formatUssd({ approved, approvedAmount: amountRequested, tenureMonths, monthlyInstallment: finalInstallment, loanApplicationId: loanApp?.id, declineReasons, suggestedActions }),
    };

    return Response.json(decision);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});