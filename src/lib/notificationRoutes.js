// Maps a notification (or coaching nudge) to an in-app route.
// Prefers an explicit action_url set by the backend, otherwise falls back
// to a sensible destination derived from the notification type.

const TYPE_ROUTE = {
  repayment_due: '/loans/repay',
  loan_approved: '/loans',
  loan_rejected: '/loans',
  kyc_update: '/profile',
  savings_goal: '/savings-goals',
  rosca_contribution: '/rosca',
  rosca_payout: '/rosca',
  gamification: '/profile',
  nudge: '/budget',
  dispute_update: '/disputes',
  system: null,
};

// Maps coaching nudge types to routes (CoachingNudge entity).
const NUDGE_ROUTE = {
  spending_alert: '/budget',
  savings_tip: '/savings',
  repayment_reminder: '/loans/repay',
  credit_score_tip: '/credit-score',
  budget_advice: '/budget',
  goal_encouragement: '/savings-goals',
  rosca_reminder: '/rosca',
  milestone_celebration: '/profile',
};

export function notificationRoute(notif) {
  if (!notif) return null;
  if (notif.action_url) return notif.action_url;
  return TYPE_ROUTE[notif.type] ?? null;
}

export function nudgeRoute(nudge) {
  if (!nudge) return null;
  if (nudge.action_url) return nudge.action_url;
  return NUDGE_ROUTE[nudge.nudge_type] ?? null;
}
