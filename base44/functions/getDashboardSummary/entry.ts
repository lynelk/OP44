import { base44 } from '../base44Client';

/**
 * Aggregates all data needed by the Dashboard in a single server-side call.
 * Runs all entity queries in parallel, eliminating 7 sequential round-trips and
 * the artificial sleep() gaps the client used to avoid rate limits.
 */
export default async function getDashboardSummary(data: any, context: any) {
  const user = context.auth?.user;
  if (!user?.id) return { error: 'Unauthorized' };

  const uid = user.id;

  const [loans, notifications, scores, pockets, badges, lenderInv, policies] = await Promise.all([
    base44.asServiceRole.entities.LoanApplication.filter({ user_id: uid }),
    base44.asServiceRole.entities.Notification.filter({ user_id: uid, is_read: false }),
    base44.asServiceRole.entities.CreditScore.filter({ user_id: uid }, '-calculated_at', 1),
    base44.asServiceRole.entities.SavingsPocket.filter({ user_id: uid }),
    base44.asServiceRole.entities.GamificationBadge.filter({ user_id: uid }),
    base44.asServiceRole.entities.LenderInvestment.filter({ lender_id: uid }),
    base44.asServiceRole.entities.InsurancePolicy.filter({ user_id: uid }),
  ]);

  const p2pTotal = lenderInv.reduce((s: number, i: any) => s + (i.amount_invested || 0), 0);
  const savingsTotal = pockets.reduce((s: number, p: any) => s + (p.current_balance || 0), 0);
  const insuranceTotal = policies.reduce((s: number, p: any) => s + (p.total_premiums_paid || 0), 0);

  return {
    loans,
    notifications,
    creditScore: scores[0] ?? null,
    pockets,
    badges,
    totalInvestments: p2pTotal + savingsTotal + insuranceTotal,
  };
}
