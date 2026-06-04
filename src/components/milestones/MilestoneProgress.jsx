import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import MilestoneCelebration from '@/components/ui/MilestoneCelebration';

const MILESTONES = [
  { id: 'first_100k_saved',   badge: 'first_savings',          emoji: '🐣', name: 'First 100K Saved',       desc: 'Save UGX 100,000 total',      check: ({ totalSavings }) => totalSavings >= 100000,     progress: ({ totalSavings }) => Math.min(100, (totalSavings / 100000) * 100),     target: '100K savings' },
  { id: 'save_500k',          badge: 'savings_goal_reached',   emoji: '💰', name: '500K Milestone',          desc: 'Accumulate UGX 500,000',      check: ({ totalSavings }) => totalSavings >= 500000,     progress: ({ totalSavings }) => Math.min(100, (totalSavings / 500000) * 100),     target: '500K savings' },
  { id: 'loan_repaid',        badge: 'first_loan_repaid',      emoji: '✅', name: 'First Loan Repaid',       desc: 'Fully repay a loan',          check: ({ closedLoans }) => closedLoans >= 1,            progress: ({ closedLoans }) => closedLoans >= 1 ? 100 : 0,                        target: '1 closed loan' },
  { id: 'ontime_streak_3',    badge: 'on_time_streak_3',       emoji: '🔥', name: '3-Month Streak',          desc: '3 on-time repayments in a row',check: ({ onTimeReps }) => onTimeReps >= 3,              progress: ({ onTimeReps }) => Math.min(100, (onTimeReps / 3) * 100),              target: '3 on-time repayments' },
  { id: 'ontime_streak_6',    badge: 'on_time_streak_6',       emoji: '⚡', name: '6-Month Streak',          desc: '6 on-time repayments in a row',check: ({ onTimeReps }) => onTimeReps >= 6,              progress: ({ onTimeReps }) => Math.min(100, (onTimeReps / 6) * 100),              target: '6 on-time repayments' },
  { id: 'budget_master',      badge: 'budget_master',          emoji: '📊', name: 'Budget Master',           desc: 'Log 10+ expenses',            check: ({ expenseCount }) => expenseCount >= 10,         progress: ({ expenseCount }) => Math.min(100, (expenseCount / 10) * 100),         target: '10 expenses logged' },
  { id: 'insurance_enrolled', badge: 'rosca_joined',           emoji: '🛡️', name: 'Insured',                 desc: 'Enroll in an insurance plan', check: ({ activePolicies }) => activePolicies >= 1,       progress: ({ activePolicies }) => activePolicies >= 1 ? 100 : 0,                  target: '1 active policy' },
];

export default function MilestoneProgress({ userId }) {
  const [stats, setStats] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [savings, loans, repayments, expenses, policies, badges] = await Promise.all([
        base44.entities.SavingsPocket.filter({ user_id: userId }),
        base44.entities.LoanApplication.filter({ user_id: userId }),
        base44.entities.Repayment.filter({ user_id: userId }),
        base44.entities.Expense.filter({ user_id: userId }),
        base44.entities.InsurancePolicy.filter({ user_id: userId, status: 'active' }),
        base44.entities.GamificationBadge.filter({ user_id: userId }),
      ]);

      const totalSavings = savings.reduce((s, p) => s + (p.current_balance || 0), 0);
      const closedLoans = loans.filter(l => l.status === 'closed').length;
      const onTimeReps = repayments.filter(r => r.status === 'paid').length;
      const expenseCount = expenses.length;
      const activePolicies = policies.length;

      const computed = { totalSavings, closedLoans, onTimeReps, expenseCount, activePolicies };
      setStats(computed);
      setEarnedBadges(badges.map(b => b.badge_type));

      // Check for newly earned milestones
      for (const m of MILESTONES) {
        if (m.check(computed) && !badges.some(b => b.badge_type === m.badge)) {
          // Award badge
          await base44.entities.GamificationBadge.create({
            user_id: userId,
            badge_type: m.badge,
            badge_name: m.name,
            description: m.desc,
            points_awarded: 50,
            earned_at: new Date().toISOString(),
          });
          setCelebration(m);
          break; // one at a time
        }
      }
    };
    load();
  }, [userId]);

  if (!stats) return null;

  const nextMilestone = MILESTONES.find(m => !earnedBadges.includes(m.badge) && !m.check(stats));
  const completedCount = MILESTONES.filter(m => earnedBadges.includes(m.badge) || m.check(stats)).length;

  return (
    <>
      {celebration && (
        <MilestoneCelebration milestone={celebration} onClose={() => setCelebration(null)} />
      )}

      <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#0D1BFF] dark:text-[#32B4FF]" />
              <span className="font-semibold text-sm text-gray-800 dark:text-white">Milestones</span>
            </div>
            <span className="text-xs font-medium text-[#0D1BFF] dark:text-[#32B4FF] bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20 px-2 py-0.5 rounded-full">
              {completedCount}/{MILESTONES.length}
            </span>
          </div>

          {nextMilestone && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{nextMilestone.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{nextMilestone.name}</p>
                    <p className="text-xs text-gray-400">{nextMilestone.desc}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#0D1BFF] dark:text-[#32B4FF]">
                  {Math.round(nextMilestone.progress(stats))}%
                </span>
              </div>
              <div className="h-2 bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] rounded-full transition-all duration-500"
                  style={{ width: `${nextMilestone.progress(stats)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Target: {nextMilestone.target}</p>
            </div>
          )}

          {completedCount === MILESTONES.length && (
            <p className="text-xs text-emerald-600 font-medium text-center py-1">🎉 All milestones completed!</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}