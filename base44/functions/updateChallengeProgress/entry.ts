import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = body?.data?.user_id || user.id;
  const pocketId = body?.data?.id; // pocket that was updated
  const depositAmount = body?.data?.current_balance && body?.old_data?.current_balance
    ? (body.data.current_balance - body.old_data.current_balance)
    : (body.deposit_amount || 0);

  if (depositAmount <= 0) return Response.json({ updated: 0, message: 'No deposit detected' });

  const today = new Date().toISOString().split('T')[0];

  // Get user's active challenges
  const challenges = await base44.asServiceRole.entities.UserSavingsChallenge.filter({
    user_id: userId,
    status: 'active',
  });

  let updated = 0;
  let badgesAwarded = 0;

  for (const challenge of challenges) {
    // If challenge is linked to a specific pocket, only update for that pocket
    if (challenge.pocket_id && challenge.pocket_id !== pocketId) continue;

    const updates = {};
    const newTotalSaved = (challenge.total_saved_in_challenge || 0) + depositAmount;
    updates.total_saved_in_challenge = newTotalSaved;

    // Handle streak logic
    if (challenge.challenge_type === 'streak_30day' || challenge.challenge_type === 'weekly_streak') {
      const lastSaved = challenge.last_saved_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const minDeposit = challenge.daily_minimum || 1000;

      if (depositAmount >= minDeposit) {
        if (today === lastSaved) {
          // Already saved today, no streak increment
        } else if (!lastSaved || lastSaved === yesterday) {
          // Consecutive day
          const newStreak = (challenge.current_streak || 0) + 1;
          updates.current_streak = newStreak;
          updates.longest_streak = Math.max(newStreak, challenge.longest_streak || 0);
          updates.last_saved_date = today;
        } else {
          // Streak broken
          updates.current_streak = 1;
          updates.last_saved_date = today;
        }
      }
    }

    // Check completion
    let completed = false;
    if (challenge.challenge_type === 'streak_30day' && (updates.current_streak || challenge.current_streak) >= (challenge.target_days || 30)) {
      completed = true;
    } else if (challenge.challenge_type === 'milestone_100k' && newTotalSaved >= 100000) {
      completed = true;
    } else if (challenge.challenge_type === 'milestone_500k' && newTotalSaved >= 500000) {
      completed = true;
    } else if (challenge.challenge_type === 'milestone_1m' && newTotalSaved >= 1000000) {
      completed = true;
    } else if (challenge.target_amount && newTotalSaved >= challenge.target_amount) {
      completed = true;
    }

    if (completed && challenge.status !== 'completed') {
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();

      // Award badge
      await base44.asServiceRole.entities.GamificationBadge.create({
        user_id: userId,
        badge_type: 'savings_goal_reached',
        badge_name: challenge.badge_name || challenge.challenge_title,
        description: `Completed the ${challenge.challenge_title} challenge!`,
        points_awarded: 150,
        earned_at: new Date().toISOString(),
      });

      // Send congratulation notification
      await base44.asServiceRole.entities.Notification.create({
        user_id: userId,
        title: `🎉 Challenge Complete! ${challenge.badge_emoji || '🏆'} ${challenge.badge_name}`,
        body: `Congratulations! You completed the "${challenge.challenge_title}" challenge and earned the ${challenge.badge_name} badge!`,
        type: 'gamification',
        priority: 'high',
        is_read: false,
        action_url: '/savings-challenges',
      });
      badgesAwarded++;
    }

    await base44.asServiceRole.entities.UserSavingsChallenge.update(challenge.id, updates);
    updated++;
  }

  return Response.json({ updated, badges_awarded: badgesAwarded });
});