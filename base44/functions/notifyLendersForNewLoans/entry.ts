import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Accept either a direct loan_id payload (from entity automation) or entity event
    let loanId = body.loan_id || body.event?.entity_id || null;
    let loan = body.data || null;

    if (!loan && loanId) {
      loan = await base44.asServiceRole.entities.P2PLoan.get(loanId).catch(() => null);
    }

    if (!loan) {
      return Response.json({ error: 'Loan data not found' }, { status: 400 });
    }

    // Only notify for loans that are newly listed (awaiting_funding)
    if (loan.status !== 'awaiting_funding') {
      return Response.json({ skipped: true, reason: 'Loan not in awaiting_funding status', status: loan.status });
    }

    const loanBand = loan.risk_band;
    const loanPurpose = loan.purpose_category;
    const loanAmount = loan.amount_approved || loan.amount_requested;

    // Fetch all lender profiles that want notifications
    const allProfiles = await base44.asServiceRole.entities.UserProfile.filter({ lender_notify_in_app: true });

    // Filter profiles: must be lender/both AND have preferred bands that include this loan's band
    const matchingProfiles = allProfiles.filter(profile => {
      const isLender = profile.account_type === 'lender' || profile.account_type === 'both';
      if (!isLender) return false;

      // Check preferred risk bands — if empty, all bands match
      const bands = profile.preferred_risk_bands || [];
      const bandMatch = bands.length === 0 || bands.includes(loanBand);
      if (!bandMatch) return false;

      // Check loan amount range preference
      if (profile.lender_min_investment && loanAmount < profile.lender_min_investment) return false;
      if (profile.lender_max_investment && loanAmount > profile.lender_max_investment) return false;

      // Check purpose category preference
      const purposePrefs = profile.lender_notify_purpose_categories || [];
      if (purposePrefs.length > 0 && loanPurpose && !purposePrefs.includes(loanPurpose)) return false;

      return true;
    });

    if (matchingProfiles.length === 0) {
      return Response.json({ success: true, notified: 0, loan_id: loan.id, band: loanBand });
    }

    const bandEmoji = { A: '🟢', B: '🔵', C: '🟡', D: '🔴' }[loanBand] || '⚪';
    const deepLink = `/p2p/marketplace?loan=${loan.id}`;
    const loanRef = loan.loan_ref || loan.id?.slice(0, 8).toUpperCase();
    const amountFormatted = loanAmount ? `UGX ${loanAmount.toLocaleString()}` : 'New loan';
    const rateText = loan.final_interest_rate ? `${loan.final_interest_rate.toFixed(1)}%/mo` : '';
    const tenureText = loan.tenure_months ? `${loan.tenure_months} months` : '';

    let notified = 0;

    // Send in-app notifications in batches of 20
    const BATCH = 20;
    for (let i = 0; i < matchingProfiles.length; i += BATCH) {
      const batch = matchingProfiles.slice(i, i + BATCH);
      await Promise.all(batch.map(async (profile) => {
        await base44.asServiceRole.entities.Notification.create({
          user_id: profile.user_id,
          title: `${bandEmoji} New Band ${loanBand} Loan Listed — ${amountFormatted}`,
          message: `Loan #${loanRef} is now open for funding. ${rateText ? `Rate: ${rateText}` : ''} ${tenureText ? `· ${tenureText}` : ''} · ${loan.purpose || 'General purpose'}. Tap to invest with one click.`,
          type: 'lender_opportunity',
          is_read: false,
          action_url: deepLink,
          action_label: 'Invest Now →',
        });
        notified++;
      }));
    }

    return Response.json({
      success: true,
      notified,
      loan_id: loan.id,
      loan_ref: loanRef,
      band: loanBand,
      amount: loanAmount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});