import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const uid = user.id;

  const [loans, notifications, scores, pockets, badges, lenderInv, policies, referralEvents, profile] = await Promise.all([
    base44.asServiceRole.entities.LoanApplication.filter({ user_id: uid }),
    base44.asServiceRole.entities.Notification.filter({ user_id: uid, is_read: false }),
    base44.asServiceRole.entities.CreditScore.filter({ user_id: uid }, '-calculated_at', 1),
    base44.asServiceRole.entities.SavingsPocket.filter({ user_id: uid }),
    base44.asServiceRole.entities.GamificationBadge.filter({ user_id: uid }),
    base44.asServiceRole.entities.LenderInvestment.filter({ lender_id: uid }),
    base44.asServiceRole.entities.InsurancePolicy.filter({ user_id: uid }),
    base44.asServiceRole.entities.ReferralEvent.filter({ referrer_id: uid }),
    base44.asServiceRole.entities.UserProfile.filter({ user_id: uid }, undefined, 1),
  ]);

  const p2pTotal = lenderInv.reduce((s, i) => s + (i.amount_invested || 0), 0);
  const savingsTotal = pockets.reduce((s, p) => s + (p.current_balance || 0), 0);
  const insuranceTotal = policies.reduce((s, p) => s + (p.total_premiums_paid || 0), 0);

  const userProfile = profile[0] ?? null;
  const referralCode = userProfile?.referral_code || `OPF${uid.slice(-6).toUpperCase()}`;
  const referralLink = `${req.headers.get('origin') || 'https://opfin.app'}/register?ref=${referralCode}`;
  const successfulReferrals = referralEvents.filter(e => e.status === 'awarded').length;
  const pendingReferrals = referralEvents.filter(e => e.status === 'pending').length;
  const loyaltyPoints = userProfile?.loyalty_points || 0;
  const pointsValueUgx = Math.floor(loyaltyPoints * 5); // 1 pt = 5 UGX

  return Response.json({
    loans,
    notifications,
    creditScore: scores[0] ?? null,
    pockets,
    badges,
    totalInvestments: p2pTotal + savingsTotal + insuranceTotal,
    referral: {
      referral_code: referralCode,
      referral_link: referralLink,
      successful_referrals: successfulReferrals,
      pending_referrals: pendingReferrals,
      loyalty_points: loyaltyPoints,
      points_value_ugx: pointsValueUgx,
    },
  });
});