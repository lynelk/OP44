import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // CREATE a new group challenge
    if (action === 'create') {
      const { group_id, title, description, challenge_type, target_amount, individual_target, daily_minimum, start_date, end_date, badge_emoji, badge_name, reward_type, reward_value } = body;

      const challenge = await base44.entities.GroupChallenge.create({
        group_id,
        title,
        description,
        challenge_type,
        target_amount,
        individual_target,
        daily_minimum,
        start_date,
        end_date,
        badge_emoji: badge_emoji || '🏆',
        badge_name: badge_name || title,
        reward_type: reward_type || 'badge',
        reward_value,
        status: new Date(start_date) <= new Date() ? 'active' : 'upcoming',
        created_by: user.id,
        participants_count: 1
      });

      // Auto-enroll the creator
      await base44.entities.UserSavingsChallenge.create({
        user_id: user.id,
        challenge_id: challenge.id,
        group_challenge_id: challenge.id,
        challenge_title: title,
        challenge_type,
        target_amount: individual_target || target_amount,
        daily_minimum,
        start_date,
        end_date,
        badge_emoji: badge_emoji || '🏆',
        badge_name: badge_name || title,
        status: 'active',
        total_saved_in_challenge: 0,
        current_streak: 0,
        rank: 1
      });

      return Response.json({ success: true, challenge });
    }

    // JOIN a group challenge
    if (action === 'join') {
      const { group_challenge_id } = body;
      const challenge = await base44.entities.GroupChallenge.get(group_challenge_id);
      if (!challenge) return Response.json({ error: 'Challenge not found' }, { status: 404 });
      if (challenge.status !== 'active' && challenge.status !== 'upcoming') {
        return Response.json({ error: 'Challenge is not joinable' }, { status: 400 });
      }

      // Check not already joined
      const existing = await base44.entities.UserSavingsChallenge.filter({ group_challenge_id, user_id: user.id });
      if (existing.length > 0) return Response.json({ error: 'Already joined' }, { status: 400 });

      const entry = await base44.entities.UserSavingsChallenge.create({
        user_id: user.id,
        challenge_id: challenge.id,
        group_challenge_id: challenge.id,
        challenge_title: challenge.title,
        challenge_type: challenge.challenge_type,
        target_amount: challenge.individual_target || challenge.target_amount,
        daily_minimum: challenge.daily_minimum,
        start_date: challenge.start_date,
        end_date: challenge.end_date,
        badge_emoji: challenge.badge_emoji,
        badge_name: challenge.badge_name,
        status: 'active',
        total_saved_in_challenge: 0,
        current_streak: 0
      });

      // Increment participants count
      await base44.entities.GroupChallenge.update(challenge.id, {
        participants_count: (challenge.participants_count || 0) + 1
      });

      return Response.json({ success: true, entry });
    }

    // LOG a contribution toward a group challenge
    if (action === 'contribute') {
      const { group_challenge_id, amount } = body;
      const entries = await base44.entities.UserSavingsChallenge.filter({ group_challenge_id, user_id: user.id });
      if (!entries.length) return Response.json({ error: 'Not enrolled in this challenge' }, { status: 404 });

      const entry = entries[0];
      const today = new Date().toISOString().split('T')[0];
      const newTotal = (entry.total_saved_in_challenge || 0) + amount;

      // Update streak
      let newStreak = entry.current_streak || 0;
      if (entry.last_saved_date !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        newStreak = entry.last_saved_date === yesterday ? newStreak + 1 : 1;
      }

      const isCompleted = entry.target_amount && newTotal >= entry.target_amount;
      const updated = await base44.entities.UserSavingsChallenge.update(entry.id, {
        total_saved_in_challenge: newTotal,
        last_saved_date: today,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, entry.longest_streak || 0),
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? new Date().toISOString() : entry.completed_at
      });

      // Recalculate ranks for all participants
      const allEntries = await base44.entities.UserSavingsChallenge.filter({ group_challenge_id });
      const sorted = [...allEntries].sort((a, b) => (b.total_saved_in_challenge || 0) - (a.total_saved_in_challenge || 0));
      await Promise.all(sorted.map((e, i) =>
        base44.entities.UserSavingsChallenge.update(e.id, { rank: i + 1 })
      ));

      // Award reward if completed and reward_type != badge
      if (isCompleted) {
        const challenge = await base44.entities.GroupChallenge.get(group_challenge_id);
        if (challenge && challenge.reward_type && challenge.reward_type !== 'badge') {
          await base44.entities.LoyaltyReward.create({
            user_id: user.id,
            reward_type: challenge.reward_type,
            reward_reason: 'consecutive_loans',
            reward_value: challenge.reward_value || 0,
            status: 'active',
            description: `Reward for completing group challenge: ${challenge.title}`
          });
        }
      }

      return Response.json({ success: true, entry: updated, newStreak, isCompleted });
    }

    // GET leaderboard for a group challenge
    if (action === 'leaderboard') {
      const { group_challenge_id } = body;
      const entries = await base44.entities.UserSavingsChallenge.filter({ group_challenge_id });
      const sorted = entries.sort((a, b) => (b.total_saved_in_challenge || 0) - (a.total_saved_in_challenge || 0));

      // Fetch user details
      const allUsers = await base44.asServiceRole.entities.User.list();
      const userMap = {};
      allUsers.forEach(u => { userMap[u.id] = u; });

      const leaderboard = sorted.map((e, i) => ({
        rank: i + 1,
        user_id: e.user_id,
        user_name: userMap[e.user_id]?.full_name || 'Unknown',
        total_saved: e.total_saved_in_challenge || 0,
        current_streak: e.current_streak || 0,
        status: e.status,
        entry_id: e.id
      }));

      return Response.json({ success: true, leaderboard });
    }

    // COMPLETE a challenge and pick winner
    if (action === 'complete') {
      const { group_challenge_id } = body;
      const challenge = await base44.entities.GroupChallenge.get(group_challenge_id);
      if (!challenge) return Response.json({ error: 'Challenge not found' }, { status: 404 });
      if (challenge.created_by !== user.id) return Response.json({ error: 'Only creator can complete' }, { status: 403 });

      const entries = await base44.entities.UserSavingsChallenge.filter({ group_challenge_id });
      const sorted = entries.sort((a, b) => (b.total_saved_in_challenge || 0) - (a.total_saved_in_challenge || 0));
      const winner = sorted[0];

      await base44.entities.GroupChallenge.update(group_challenge_id, {
        status: 'completed',
        winner_user_id: winner?.user_id
      });

      // Award winner
      if (winner && challenge.reward_type && challenge.reward_type !== 'badge') {
        await base44.entities.LoyaltyReward.create({
          user_id: winner.user_id,
          reward_type: challenge.reward_type,
          reward_reason: 'consecutive_loans',
          reward_value: challenge.reward_value || 0,
          status: 'active',
          description: `Winner reward: ${challenge.title}`
        });
      }

      return Response.json({ success: true, winner_user_id: winner?.user_id });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});