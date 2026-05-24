import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── RISK TIER MAPPING (A/B/C/D → P2P tiers) ───────────────────────────────
function getRiskTier(score, band) {
  if (score >= 780 || band === 'A') return 'platinum';
  if (score >= 680 || band === 'B') return 'gold';
  if (score >= 580) return 'silver';
  if (score >= 480 || band === 'C') return 'bronze';
  return 'restricted';
}

// ─── INTEREST RATE ENGINE ────────────────────────────────────────────────────
function calculateInterestRate(score, band, profile) {
  const baseRate = 3.5; // monthly %

  // Risk premium: lower score = higher premium
  let riskPremium = 0;
  if (band === 'A') riskPremium = 0.5;
  else if (band === 'B') riskPremium = 1.5;
  else if (band === 'C') riskPremium = 2.5;
  else riskPremium = 4.0;

  const liquidityPremium = 0.5;
  const operationalMargin = 0.5;

  // Loyalty discounts
  let loyaltyDiscount = 0;
  if (profile.consecutive_on_time_payments >= 3) loyaltyDiscount += 0.25;
  if (profile.consecutive_on_time_payments >= 6) loyaltyDiscount += 0.25;
  if (profile.total_loans_completed >= 2) loyaltyDiscount += 0.2;
  if (profile.loyalty_points >= 500) loyaltyDiscount += 0.2;
  if (profile.is_employer_linked_repayment) loyaltyDiscount += 0.3;
  if (profile.referral_count >= 2) loyaltyDiscount += 0.1;

  const finalRate = baseRate + riskPremium + liquidityPremium + operationalMargin - loyaltyDiscount;
  return {
    base_rate: baseRate,
    risk_premium: riskPremium,
    liquidity_premium: liquidityPremium,
    operational_margin: operationalMargin,
    loyalty_discount: loyaltyDiscount,
    final_interest_rate: Math.max(finalRate, 2.0) // floor at 2%
  };
}

// ─── LOAN OFFER CALCULATOR ──────────────────────────────────────────────────
function calculateLoanOffer(amount, tenureMonths, monthlyRate) {
  const r = monthlyRate / 100;
  const monthly = r === 0 ? amount / tenureMonths
    : (amount * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  const total = monthly * tenureMonths;
  const originationFee = amount * 0.03;
  const insurance = amount * 0.01;
  return {
    monthly_installment: Math.round(monthly),
    total_repayable: Math.round(total),
    origination_fee: Math.round(originationFee),
    insurance_cost: Math.round(insurance),
    net_disbursement: Math.round(amount - originationFee - insurance)
  };
}

// ─── TRUST SCORE ENGINE ─────────────────────────────────────────────────────
function calculateTrustScore(profile, creditScore) {
  let score = 0;
  score += Math.min(30, (creditScore?.score || 300) / 850 * 30);
  score += Math.min(20, profile.consecutive_on_time_payments * 3);
  score += Math.min(15, profile.total_loans_completed * 5);
  score += Math.min(10, profile.referral_count * 2);
  score -= profile.fraud_flags * 10;
  score -= profile.complaint_count * 2;
  if (profile.is_employer_linked_repayment) score += 5;
  if (profile.kyc_status === 'verified') score += 10;
  if (profile.aml_status === 'cleared') score += 5;
  score += Math.min(5, profile.loyalty_points / 200);

  const trustScore = Math.max(0, Math.min(100, Math.round(score)));
  let reputationLevel = 'new';
  if (trustScore >= 80) reputationLevel = 'elite';
  else if (trustScore >= 60) reputationLevel = 'trusted';
  else if (trustScore >= 40) reputationLevel = 'established';
  else if (trustScore >= 20) reputationLevel = 'building';

  return { trust_score: trustScore, reputation_level: reputationLevel };
}

// ─── REVENUE DISTRIBUTION ───────────────────────────────────────────────────
async function distributeRevenue(base44, loanId, repaymentId, grossInterest, config) {
  const lenderPct = config.lender_pct || 55;
  const platformPct = config.platform_pct || 30;
  const reservePct = config.reserve_pct || 15;

  const lenderShare = Math.round(grossInterest * lenderPct / 100);
  const platformShare = Math.round(grossInterest * platformPct / 100);
  const reserveShare = Math.round(grossInterest * reservePct / 100);

  await base44.asServiceRole.entities.RevenueTransaction.create({
    loan_id: loanId,
    repayment_id: repaymentId,
    transaction_type: 'interest_income',
    gross_interest: grossInterest,
    lender_share: lenderShare,
    platform_share: platformShare,
    reserve_share: reserveShare,
    lender_share_pct: lenderPct,
    platform_share_pct: platformPct,
    reserve_share_pct: reservePct,
    status: 'distributed',
    distributed_at: new Date().toISOString()
  });

  // Update lender investments pro-rata
  const investments = await base44.asServiceRole.entities.LenderInvestment.filter({ loan_id: loanId });
  for (const inv of investments) {
    const invShare = Math.round(lenderShare * (inv.ownership_pct / 100));
    await base44.asServiceRole.entities.LenderInvestment.update(inv.id, {
      actual_return_earned: (inv.actual_return_earned || 0) + invShare
    });
  }

  return { lender_share: lenderShare, platform_share: platformShare, reserve_share: reserveShare };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, ...params } = body;

    // ── 1. REGISTER PROFILE ──────────────────────────────────────────────────
    if (action === 'register_profile') {
      const existing = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (existing.length > 0) {
        return Response.json({ profile: existing[0], already_exists: true });
      }
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const profile = await base44.entities.UserProfile.create({
        user_id: user.id,
        account_type: params.account_type || 'borrower',
        phone_number: params.phone_number,
        national_id: params.national_id,
        address: params.address,
        district: params.district,
        date_of_birth: params.date_of_birth,
        gender: params.gender,
        employment_status: params.employment_status,
        employer_name: params.employer_name,
        job_title: params.job_title,
        monthly_income: params.monthly_income,
        income_source: params.income_source,
        mobile_money_provider: params.mobile_money_provider,
        mobile_money_account: params.mobile_money_account,
        bank_name: params.bank_name,
        bank_account_number: params.bank_account_number,
        bank_branch: params.bank_branch,
        account_status: 'pending_verification',
        kyc_status: 'not_started',
        verification_started_at: new Date().toISOString(),
        verification_expires_at: expiresAt,
        profile_completion_pct: 60
      });
      return Response.json({ profile });
    }

    // ── 2. SCORE & QUALIFY BORROWER ─────────────────────────────────────────
    if (action === 'score_borrower') {
      const [profiles, scores] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: user.id }),
        base44.asServiceRole.entities.CreditScore.filter({ user_id: user.id })
      ]);
      const profile = profiles[0];
      if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });

      const latestScore = scores.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0];
      const score = latestScore?.score || 400;
      const band = latestScore?.risk_band || 'C';

      const tier = getRiskTier(score, band);
      const rates = calculateInterestRate(score, band, profile);
      const trustData = calculateTrustScore(profile, latestScore);

      // Max loan limit based on income and risk tier
      const multipliers = { platinum: 12, gold: 9, silver: 6, bronze: 3, restricted: 0 };
      const maxLimit = Math.round((profile.monthly_income || 0) * multipliers[tier]);

      await base44.entities.UserProfile.update(profile.id, {
        risk_tier: tier,
        trust_score: trustData.trust_score,
        reputation_level: trustData.reputation_level
      });

      return Response.json({
        score, band, tier, rates, trust_score: trustData.trust_score,
        reputation_level: trustData.reputation_level,
        max_loan_limit: maxLimit,
        is_eligible: tier !== 'restricted' && maxLimit > 0
      });
    }

    // ── 3. APPLY FOR P2P LOAN ────────────────────────────────────────────────
    if (action === 'apply_loan') {
      const [profiles, scores, activeLoans] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: user.id }),
        base44.asServiceRole.entities.CreditScore.filter({ user_id: user.id }),
        base44.entities.P2PLoan.filter({ borrower_id: user.id })
      ]);

      const profile = profiles[0];
      if (!profile) return Response.json({ error: 'Complete your profile first' }, { status: 400 });
      if (profile.kyc_status !== 'verified') return Response.json({ error: 'KYC verification required before borrowing' }, { status: 403 });

      const existing = activeLoans.filter(l => ['active', 'disbursed', 'awaiting_funding', 'funded'].includes(l.status));
      if (existing.length > 0) return Response.json({ error: 'You have an active loan. Repay it before applying.' }, { status: 400 });

      const latestScore = scores.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0];
      const score = latestScore?.score || 400;
      const band = latestScore?.risk_band || 'C';
      const tier = getRiskTier(score, band);

      if (tier === 'restricted') return Response.json({ error: 'Credit score too low for P2P lending' }, { status: 400 });

      const multipliers = { platinum: 12, gold: 9, silver: 6, bronze: 3 };
      const maxLimit = Math.round((profile.monthly_income || 0) * multipliers[tier] || 0);

      if (params.amount > maxLimit) return Response.json({ error: `Loan amount exceeds your limit of UGX ${maxLimit.toLocaleString()}` }, { status: 400 });

      const rates = calculateInterestRate(score, band, profile);
      const offer = calculateLoanOffer(params.amount, params.tenure_months, rates.final_interest_rate);

      // Generate repayment schedule
      const schedule = [];
      const today = new Date();
      for (let i = 1; i <= params.tenure_months; i++) {
        const dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + i);
        schedule.push({ installment: i, amount: offer.monthly_installment, due_date: dueDate.toISOString().split('T')[0] });
      }

      const fundingDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const loanRef = `P2P-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

      const loan = await base44.entities.P2PLoan.create({
        borrower_id: user.id,
        borrower_profile_id: profile.id,
        loan_ref: loanRef,
        amount_requested: params.amount,
        amount_approved: params.amount,
        purpose: params.purpose,
        purpose_category: params.purpose_category || 'personal',
        tenure_months: params.tenure_months,
        status: 'pending_approval',
        risk_band: band,
        risk_tier: tier,
        credit_score_at_application: score,
        ...rates,
        ...offer,
        outstanding_balance: offer.total_repayable,
        funding_threshold_pct: 80,
        funding_deadline: fundingDeadline,
        grace_period_days: 3,
        is_marketplace_listed: false,
        description: params.description || ''
      });

      // Create repayment schedule in parallel
      await Promise.all(schedule.map(s => base44.entities.P2PRepayment.create({
        loan_id: loan.id,
        borrower_id: user.id,
        amount: s.amount,
        due_date: s.due_date,
        status: 'scheduled',
        principal_portion: Math.round(params.amount / params.tenure_months),
        interest_portion: Math.round(offer.monthly_installment - params.amount / params.tenure_months)
      })));

      return Response.json({ loan, offer, rates, schedule });
    }

    // ── 4. FUND LOAN (Lender) — Escrow-backed ───────────────────────────────
    if (action === 'fund_loan') {
      const [profiles, loanArr] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: user.id }),
        base44.asServiceRole.entities.P2PLoan.filter({ id: params.loan_id })
      ]);
      const profile = profiles[0];
      const p2pLoan = loanArr[0];

      if (!profile) return Response.json({ error: 'Complete lender profile first' }, { status: 400 });
      if (profile.kyc_status !== 'verified') return Response.json({ error: 'KYC verification required before investing' }, { status: 403 });
      if (!['awaiting_funding'].includes(p2pLoan?.status)) return Response.json({ error: 'Loan not available for funding' }, { status: 400 });

      const existingInvestments = await base44.asServiceRole.entities.LenderInvestment.filter({ loan_id: params.loan_id });
      const totalEscrowed = existingInvestments.reduce((s, i) => s + i.amount_invested, 0);

      // Diversification: max 40% per lender
      const maxAllowed = p2pLoan.amount_approved * 0.4;
      if (params.amount > maxAllowed) return Response.json({ error: `Max exposure per loan is UGX ${maxAllowed.toLocaleString()} (40%)` }, { status: 400 });

      const remaining = p2pLoan.amount_approved - totalEscrowed;
      if (params.amount > remaining) return Response.json({ error: `Only UGX ${remaining.toLocaleString()} remaining to fund` }, { status: 400 });

      const ownershipPct = (params.amount / p2pLoan.amount_approved) * 100;
      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + p2pLoan.tenure_months);

      // Create investment in escrow state
      const investment = await base44.entities.LenderInvestment.create({
        lender_id: user.id,
        lender_profile_id: profile.id,
        loan_id: params.loan_id,
        investment_type: 'manual',
        amount_invested: params.amount,
        ownership_pct: ownershipPct,
        expected_return: Math.round(params.amount * (p2pLoan.final_interest_rate / 100) * p2pLoan.tenure_months),
        lender_share_pct: 55,
        platform_share_pct: 30,
        reserve_share_pct: 15,
        status: 'active',
        invested_at: new Date().toISOString(),
        maturity_date: maturityDate.toISOString().split('T')[0]
      });

      // Update escrowed amount on loan
      const newEscrowed = totalEscrowed + params.amount;
      const threshold = p2pLoan.amount_approved * (p2pLoan.funding_threshold_pct / 100);
      const thresholdMet = newEscrowed >= threshold;

      if (thresholdMet) {
        // Mark loan as funded — escrow threshold met
        await base44.asServiceRole.entities.P2PLoan.update(params.loan_id, {
          status: 'funded',
          amount_funded: newEscrowed,
          escrowed_amount: newEscrowed
        });

        // Auto-trigger disbursement: build repayment schedule and disburse
        const now = new Date();
        const disburseAmount = p2pLoan.amount_approved;
        const disbFee = Math.round(disburseAmount * 0.03);
        const insurance = Math.round(disburseAmount * 0.01);
        const netDisb = disburseAmount - disbFee - insurance;
        const monthlyRate = (p2pLoan.final_interest_rate || 5) / 100;
        const tenure = p2pLoan.tenure_months;
        const monthly = monthlyRate === 0 ? disburseAmount / tenure
          : Math.round((disburseAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1));
        const total = monthly * tenure;

        // Generate full P2PRepayment schedule (replace draft schedules)
        const existingRepayments = await base44.asServiceRole.entities.P2PRepayment.filter({ loan_id: params.loan_id, status: 'scheduled' });
        const disbursedAt = now.toISOString();
        const nextRepayDate = new Date(now);
        nextRepayDate.setMonth(nextRepayDate.getMonth() + 1);

        // If no repayments exist yet, create them now
        if (existingRepayments.length === 0) {
          const schedule = [];
          for (let i = 1; i <= tenure; i++) {
            const d = new Date(now);
            d.setMonth(d.getMonth() + i);
            schedule.push({
              loan_id: params.loan_id,
              borrower_id: p2pLoan.borrower_id,
              amount: monthly,
              principal_portion: Math.round(disburseAmount / tenure),
              interest_portion: Math.round(monthly - disburseAmount / tenure),
              due_date: d.toISOString().split('T')[0],
              status: 'scheduled',
            });
          }
          await Promise.all(schedule.map(s => base44.asServiceRole.entities.P2PRepayment.create(s)));
        }

        // Mark as disbursed
        await base44.asServiceRole.entities.P2PLoan.update(params.loan_id, {
          status: 'disbursed',
          disbursed_at: disbursedAt,
          disbursement_method: 'mobile_money',
          origination_fee: disbFee,
          insurance_cost: insurance,
          net_disbursement: netDisb,
          total_repayable: total,
          monthly_installment: monthly,
          outstanding_balance: total,
          next_repayment_date: nextRepayDate.toISOString().split('T')[0],
          is_marketplace_listed: false,
        });

        // Notify borrower
        await base44.asServiceRole.entities.Notification.create({
          user_id: p2pLoan.borrower_id,
          title: '💸 P2P Loan Disbursed!',
          message: `Your loan of UGX ${disburseAmount.toLocaleString()} has been fully funded and UGX ${netDisb.toLocaleString()} disbursed to your account. First repayment due ${nextRepayDate.toISOString().split('T')[0]}.`,
          type: 'loan',
          is_read: false,
        }).catch(() => null);

      } else {
        // Still collecting — update escrowed amount
        await base44.asServiceRole.entities.P2PLoan.update(params.loan_id, {
          amount_funded: newEscrowed,
          escrowed_amount: newEscrowed
        });
      }

      return Response.json({ investment, total_funded: newEscrowed, threshold_met: thresholdMet, auto_disbursed: thresholdMet });
    }

    // ── 5. DISBURSE LOAN ─────────────────────────────────────────────────────
    if (action === 'disburse_loan') {
      if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
      const loans = await base44.asServiceRole.entities.P2PLoan.filter({ id: params.loan_id });
      const loan = loans[0];
      if (!loan || loan.status !== 'funded') return Response.json({ error: 'Loan must be fully funded' }, { status: 400 });

      await base44.asServiceRole.entities.P2PLoan.update(params.loan_id, {
        status: 'active',
        disbursed_at: new Date().toISOString(),
        disbursement_method: params.method || 'mobile_money',
        is_marketplace_listed: false
      });

      return Response.json({ success: true, message: 'Loan disbursed and marked Active' });
    }

    // ── 6. RECORD REPAYMENT ──────────────────────────────────────────────────
    if (action === 'record_repayment') {
      const [loans, repayments] = await Promise.all([
        base44.entities.P2PLoan.filter({ borrower_id: user.id }),
        base44.entities.P2PRepayment.filter({ loan_id: params.loan_id, status: 'scheduled' })
      ]);
      const loan = loans.find(l => l.id === params.loan_id);
      if (!loan) return Response.json({ error: 'Loan not found' }, { status: 404 });

      const nextDue = repayments.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
      if (!nextDue) return Response.json({ error: 'No pending installments' }, { status: 400 });

      const today = new Date();
      const dueDate = new Date(nextDue.due_date);
      const daysLate = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
      const lateFee = daysLate > (loan.grace_period_days || 3) ? Math.round(nextDue.amount * 0.02) : 0;

      await base44.entities.P2PRepayment.update(nextDue.id, {
        status: 'paid',
        paid_date: today.toISOString().split('T')[0],
        payment_method: params.payment_method || 'mobile_money',
        transaction_ref: params.transaction_ref || `TXN-${Date.now()}`,
        days_late: daysLate,
        late_fee_portion: lateFee
      });

      const newBalance = Math.max(0, (loan.outstanding_balance || 0) - nextDue.amount);
      const isClosed = newBalance === 0;
      await base44.entities.P2PLoan.update(params.loan_id, {
        outstanding_balance: newBalance,
        status: isClosed ? 'closed' : 'active',
        late_fee_applied: (loan.late_fee_applied || 0) + lateFee
      });

      // Distribute revenue
      const revenueData = await distributeRevenue(base44, params.loan_id, nextDue.id, nextDue.interest_portion, {
        lender_pct: 55, platform_pct: 30, reserve_pct: 15
      });

      // Update profile trust score
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (profiles[0]) {
        const newConsecutive = daysLate === 0 ? (profiles[0].consecutive_on_time_payments || 0) + 1 : 0;
        const newPoints = (profiles[0].loyalty_points || 0) + (daysLate === 0 ? 10 : 0);
        await base44.entities.UserProfile.update(profiles[0].id, {
          consecutive_on_time_payments: newConsecutive,
          total_loans_completed: isClosed ? (profiles[0].total_loans_completed || 0) + 1 : profiles[0].total_loans_completed,
          loyalty_points: newPoints
        });
      }

      return Response.json({ success: true, new_balance: newBalance, is_closed: isClosed, late_fee: lateFee, revenue: revenueData });
    }

    // ── 7. GET MARKETPLACE LOANS ─────────────────────────────────────────────
    if (action === 'get_marketplace') {
      const allLoans = await base44.asServiceRole.entities.P2PLoan.filter({ status: 'awaiting_funding', is_marketplace_listed: true });
      return Response.json({ loans: allLoans });
    }

    // ── 8. GET MY P2P DASHBOARD ──────────────────────────────────────────────
    if (action === 'get_dashboard') {
      const [profiles, loans, investments, rewards] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: user.id }),
        base44.entities.P2PLoan.filter({ borrower_id: user.id }),
        base44.entities.LenderInvestment.filter({ lender_id: user.id }),
        base44.entities.LoyaltyReward.filter({ user_id: user.id })
      ]);
      return Response.json({ profile: profiles[0] || null, loans, investments, rewards });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});