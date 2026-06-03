import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Points configuration
const REFERRER_POINTS = 500;   // points for referrer when invitee gets first disbursement
const INVITEE_POINTS = 250;    // bonus points for the new user
const POINTS_PER_UGX = 0.01;  // 1 point = 100 UGX in fee discount

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── GET MY REFERRAL INFO ────────────────────────────────────────────────
    if (action === 'get_my_referral') {
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      let profile = profiles[0];

      // Auto-generate referral code if missing
      if (!profile?.referral_code) {
        const code = 'REF' + user.id.slice(-6).toUpperCase();
        if (profile) {
          await base44.entities.UserProfile.update(profile.id, { referral_code: code });
          profile = { ...profile, referral_code: code };
        }
      }

      const events = await base44.asServiceRole.entities.ReferralEvent.filter({ referrer_id: user.id });
      const awarded = events.filter(e => e.status === 'awarded');
      const pending = events.filter(e => e.status === 'pending');

      const appBase = 'https://app.opfin.co';
      const referralLink = `${appBase}/register?ref=${profile?.referral_code || ''}`;

      return Response.json({
        success: true,
        referral_code: profile?.referral_code,
        referral_link: referralLink,
        loyalty_points: profile?.loyalty_points || 0,
        successful_referrals: profile?.successful_referrals_count || 0,
        pending_referrals: pending.length,
        awarded_events: awarded.length,
        points_value_ugx: Math.floor((profile?.loyalty_points || 0) / POINTS_PER_UGX / 1000) * 1000,
      });
    }

    // ── REGISTER REFERRAL (called on signup with ?ref= param) ──────────────
    if (action === 'register_referral') {
      const { referral_code } = body;
      if (!referral_code) return Response.json({ error: 'referral_code required' }, { status: 400 });

      // Find referrer profile by referral_code (scoped query)
      const [referrerProfiles, myProfiles] = await Promise.all([
        base44.asServiceRole.entities.UserProfile.filter({ referral_code }),
        base44.entities.UserProfile.filter({ user_id: user.id }),
      ]);
      const referrerProfile = referrerProfiles[0];
      if (!referrerProfile) return Response.json({ error: 'Invalid referral code' }, { status: 404 });
      if (referrerProfile.user_id === user.id) return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });

      // Check not already registered
      const myProfile = myProfiles[0];
      if (myProfile?.referred_by) return Response.json({ error: 'Already registered via referral' }, { status: 400 });

      // Mark invitee's profile with referred_by
      if (myProfile) {
        await base44.entities.UserProfile.update(myProfile.id, { referred_by: referral_code });
      }

      // Create pending referral event
      await base44.asServiceRole.entities.ReferralEvent.create({
        referrer_id: referrerProfile.user_id,
        invitee_id: user.id,
        referral_code_used: referral_code,
        status: 'pending',
        points_awarded_referrer: REFERRER_POINTS,
        points_awarded_invitee: INVITEE_POINTS,
      });

      return Response.json({ success: true, message: 'Referral registered. Points awarded when your first loan is disbursed.' });
    }

    // ── AWARD POINTS ON FIRST RENTAL PAYMENT ───────────────────────────────
    if (action === 'award_on_rental_payment') {
      const { rental_payment_id, borrower_user_id } = body;
      if (!borrower_user_id) return Response.json({ error: 'borrower_user_id required' }, { status: 400 });

      // Find pending referral for this invitee
      const events = await base44.asServiceRole.entities.ReferralEvent.filter({ invitee_id: borrower_user_id, status: 'pending' });
      if (!events.length) return Response.json({ success: true, message: 'No pending referral to award' });

      const event = events[0];
      const [referrerProfiles2, inviteeProfiles2] = await Promise.all([
        base44.asServiceRole.entities.UserProfile.filter({ user_id: event.referrer_id }),
        base44.asServiceRole.entities.UserProfile.filter({ user_id: borrower_user_id }),
      ]);
      const referrerProfile = referrerProfiles2[0];
      const inviteeProfile = inviteeProfiles2[0];

      const now = new Date().toISOString();

      // Credit referrer
      if (referrerProfile) {
        await base44.asServiceRole.entities.UserProfile.update(referrerProfile.id, {
          loyalty_points: (referrerProfile.loyalty_points || 0) + REFERRER_POINTS,
          successful_referrals_count: (referrerProfile.successful_referrals_count || 0) + 1,
        });
        await base44.asServiceRole.entities.Notification.create({
          user_id: event.referrer_id,
          title: '🎉 Referral Reward Earned!',
          body: `Your referral completed their first rental payment. You've earned ${REFERRER_POINTS} loyalty points!`,
          type: 'gamification',
          is_read: false,
        });
      }

      // Credit invitee
      if (inviteeProfile) {
        await base44.asServiceRole.entities.UserProfile.update(inviteeProfile.id, {
          loyalty_points: (inviteeProfile.loyalty_points || 0) + INVITEE_POINTS,
        });
        await base44.asServiceRole.entities.Notification.create({
          user_id: borrower_user_id,
          title: '🎁 Welcome Bonus Points!',
          body: `You've received ${INVITEE_POINTS} loyalty points for completing your first rental payment. Use them to reduce fees!`,
          type: 'gamification',
          is_read: false,
        });
      }

      // Mark event as awarded
      await base44.asServiceRole.entities.ReferralEvent.update(event.id, {
        status: 'awarded',
        loan_application_id: rental_payment_id,
        awarded_date: now,
      });

      return Response.json({ success: true, referrer_points: REFERRER_POINTS, invitee_points: INVITEE_POINTS });
    }

    // ── AWARD POINTS ON LOAN DISBURSEMENT (legacy) ─────────────────────────
    if (action === 'award_on_disbursement') {
      const { loan_id, borrower_user_id } = body;
      if (!borrower_user_id) return Response.json({ error: 'borrower_user_id required' }, { status: 400 });

      // Find pending referral for this invitee
      const events = await base44.asServiceRole.entities.ReferralEvent.filter({ invitee_id: borrower_user_id, status: 'pending' });
      if (!events.length) return Response.json({ success: true, message: 'No pending referral to award' });

      const event = events[0];
      const [referrerProfiles3, inviteeProfiles3] = await Promise.all([
        base44.asServiceRole.entities.UserProfile.filter({ user_id: event.referrer_id }),
        base44.asServiceRole.entities.UserProfile.filter({ user_id: borrower_user_id }),
      ]);
      const referrerProfile = referrerProfiles3[0];
      const inviteeProfile = inviteeProfiles3[0];

      const now = new Date().toISOString();

      // Credit referrer
      if (referrerProfile) {
        await base44.asServiceRole.entities.UserProfile.update(referrerProfile.id, {
          loyalty_points: (referrerProfile.loyalty_points || 0) + REFERRER_POINTS,
          successful_referrals_count: (referrerProfile.successful_referrals_count || 0) + 1,
        });
        await base44.asServiceRole.entities.Notification.create({
          user_id: event.referrer_id,
          title: '🎉 Referral Reward Earned!',
          body: `Your referral received their first loan disbursement. You've earned ${REFERRER_POINTS} loyalty points!`,
          type: 'gamification',
          is_read: false,
        });
      }

      // Credit invitee
      if (inviteeProfile) {
        await base44.asServiceRole.entities.UserProfile.update(inviteeProfile.id, {
          loyalty_points: (inviteeProfile.loyalty_points || 0) + INVITEE_POINTS,
        });
        await base44.asServiceRole.entities.Notification.create({
          user_id: borrower_user_id,
          title: '🎁 Welcome Bonus Points!',
          body: `You've received ${INVITEE_POINTS} loyalty points as a referral bonus. Use them to reduce loan fees!`,
          type: 'gamification',
          is_read: false,
        });
      }

      // Mark event as awarded
      await base44.asServiceRole.entities.ReferralEvent.update(event.id, {
        status: 'awarded',
        loan_application_id: loan_id,
        awarded_date: now,
      });

      return Response.json({ success: true, referrer_points: REFERRER_POINTS, invitee_points: INVITEE_POINTS });
    }

    // ── GET DASHBOARD (summary for UI) ───────────────────────────────────────
    if (action === 'get_dashboard') {
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      const profile = profiles[0];
      const events = await base44.asServiceRole.entities.ReferralEvent.filter({ referrer_id: user.id });
      const awarded = events.filter(e => e.status === 'awarded');
      const pending = events.filter(e => e.status === 'pending');

      return Response.json({
        success: true,
        referral_code: profile?.referral_code || null,
        loyalty_points: profile?.loyalty_points || 0,
        successful_referrals: profile?.successful_referrals_count || 0,
        pending_referrals: pending.length,
        awarded_referrals: awarded.length,
      });
    }

    // ── CALCULATE POINTS VALUE ───────────────────────────────────────────────
    if (action === 'calculate_redemption') {
      const { points_to_redeem, loan_amount } = body;
      if (!points_to_redeem || !loan_amount) return Response.json({ error: 'points_to_redeem and loan_amount required' }, { status: 400 });

      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      const profile = profiles[0];
      const available = profile?.loyalty_points || 0;
      const toRedeem = Math.min(points_to_redeem, available);
      const discountUgx = Math.floor(toRedeem / POINTS_PER_UGX);
      const maxDiscount = Math.floor(loan_amount * 0.5); // max 50% of origination fee (3%)
      const actualDiscount = Math.min(discountUgx, maxDiscount);
      const actualPoints = Math.ceil(actualDiscount * POINTS_PER_UGX);

      return Response.json({
        success: true,
        available_points: available,
        points_to_redeem: actualPoints,
        discount_ugx: actualDiscount,
        remaining_points: available - actualPoints,
        conversion_rate: `100 points = UGX ${Math.round(1 / POINTS_PER_UGX).toLocaleString()}`,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});