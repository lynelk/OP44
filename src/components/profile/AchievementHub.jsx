import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Lock, ChevronDown, ChevronUp } from 'lucide-react';

// All possible badges in the system
const ALL_BADGES = [
  // Debt Payoff Milestones
  { id: 'debt_25', emoji: '🎯', name: '25% Debt Cleared', category: 'Debt Payoff', description: 'Paid off 25% of total debt', badge: '🥉 Bronze Debtor' },
  { id: 'debt_50', emoji: '⚡', name: 'Halfway There!', category: 'Debt Payoff', description: 'Paid off 50% of total debt', badge: '🥈 Silver Debtor' },
  { id: 'debt_75', emoji: '🔥', name: '75% Freedom', category: 'Debt Payoff', description: 'Paid off 75% of total debt', badge: '🥇 Gold Debtor' },
  { id: 'debt_free', emoji: '🎉', name: 'Debt Free!', category: 'Debt Payoff', description: 'Completely debt free!', badge: '💎 Diamond Freedom' },
  { id: 'power_payer', emoji: '💸', name: 'Power Payer', category: 'Debt Payoff', description: 'Made a surplus debt redirect payment', badge: '🎯 Power Payer Badge' },
  // Savings Circles
  { id: 'circle_joiner', emoji: '🤝', name: 'Circle Joiner', category: 'Savings Circles', description: 'Joined your first savings circle', badge: '🌱 Community Starter' },
  { id: 'circle_contributor', emoji: '💪', name: 'Consistent Contributor', category: 'Savings Circles', description: 'Made 3 consecutive monthly contributions', badge: '⭐ Reliable Member' },
  { id: 'circle_top', emoji: '🏆', name: 'Top Contributor', category: 'Savings Circles', description: 'Ranked #1 in a savings circle', badge: '👑 Circle Champion' },
  // Savings Goals
  { id: 'goal_created', emoji: '🎯', name: 'Goal Setter', category: 'Savings Goals', description: 'Created your first savings goal', badge: '🌟 Dreamer Badge' },
  { id: 'goal_completed', emoji: '✅', name: 'Goal Achiever', category: 'Savings Goals', description: 'Completed a savings goal', badge: '🏅 Goal Getter' },
  // Challenges
  { id: 'challenge_streak', emoji: '🔥', name: '7-Day Streak', category: 'Challenges', description: 'Saved for 7 consecutive days', badge: '🔥 Streak Master' },
  { id: 'challenge_complete', emoji: '🎖️', name: 'Challenge Champion', category: 'Challenges', description: 'Completed a savings challenge', badge: '🎖️ Challenge Hero' },
  // Credit & Loans
  { id: 'credit_builder', emoji: '📈', name: 'Credit Builder', category: 'Credit', description: 'Improved your credit score', badge: '📈 Score Climber' },
  { id: 'on_time_payer', emoji: '⏰', name: 'On-Time Payer', category: 'Credit', description: '3 consecutive on-time payments', badge: '✅ Reliable Borrower' },
];

const CATEGORIES = ['Debt Payoff', 'Savings Circles', 'Savings Goals', 'Challenges', 'Credit'];

export default function AchievementHub() {
  const [badges, setBadges] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [goals, setGoals] = useState([]);
  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.GamificationBadge.filter({}),
      base44.entities.UserSavingsChallenge.filter({}),
      base44.entities.SavingsGoal.filter({}),
      base44.entities.GroupMember.filter({}),
    ]).then(([b, c, g, gm]) => {
      setBadges(b); setChallenges(c); setGoals(g); setGroups(gm);
      setLoading(false);
    });
  }, []);

  // Determine earned badge IDs from actual data
  const earnedBadgeIds = new Set();

  badges.forEach(b => {
    const name = (b.badge_name || '').toLowerCase();
    if (name.includes('debt') || name.includes('freedom')) earnedBadgeIds.add('debt_free');
    if (name.includes('power payer')) earnedBadgeIds.add('power_payer');
    if (name.includes('25%') || name.includes('bronze')) earnedBadgeIds.add('debt_25');
    if (name.includes('50%') || name.includes('halfway') || name.includes('silver')) earnedBadgeIds.add('debt_50');
    if (name.includes('75%') || name.includes('gold')) earnedBadgeIds.add('debt_75');
    earnedBadgeIds.add(b.badge_name?.toLowerCase().replace(/\s+/g, '_'));
  });

  if (challenges.some(c => c.current_streak >= 7)) earnedBadgeIds.add('challenge_streak');
  if (challenges.some(c => c.status === 'completed')) earnedBadgeIds.add('challenge_complete');
  if (goals.length > 0) earnedBadgeIds.add('goal_created');
  if (goals.some(g => g.status === 'completed')) earnedBadgeIds.add('goal_completed');
  if (groups.length > 0) earnedBadgeIds.add('circle_joiner');

  const earnedCount = ALL_BADGES.filter(b => earnedBadgeIds.has(b.id)).length;
  const totalCount = ALL_BADGES.length;
  const progressPct = Math.round((earnedCount / totalCount) * 100);

  const visibleBadges = expanded ? ALL_BADGES : ALL_BADGES.slice(0, 6);

  if (loading) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-300" />
            <p className="font-bold text-white">Achievement Hub</p>
          </div>
          <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">
            {earnedCount}/{totalCount} Earned
          </span>
        </div>
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-blue-100">
            <span>{progressPct}% Complete</span>
            <span>{totalCount - earnedCount} badges to unlock</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Badge Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          {visibleBadges.map(badge => {
            const earned = earnedBadgeIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-xl p-3 text-center transition-all ${earned
                  ? 'bg-gradient-to-b from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800'
                  : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="text-2xl mb-1 relative">
                  {earned ? badge.emoji : <span className="grayscale opacity-40">{badge.emoji}</span>}
                  {!earned && (
                    <Lock className="w-3 h-3 text-gray-400 absolute -bottom-0.5 -right-0.5" />
                  )}
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{badge.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{badge.category}</p>
                {earned && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">✓ Earned</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Show More/Less toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-sm text-[#0D1BFF] dark:text-[#32B4FF] font-medium py-1"
        >
          {expanded ? (
            <><ChevronUp className="w-4 h-4" /> Show Less</>
          ) : (
            <><ChevronDown className="w-4 h-4" /> View All {totalCount} Badges</>
          )}
        </button>
      </div>
    </div>
  );
}