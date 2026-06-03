import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ChevronRight, Lightbulb, PiggyBank, CreditCard, TrendingUp, Target, Trophy, AlertTriangle } from 'lucide-react';
import { nudgeRoute } from '@/lib/notificationRoutes';

const NUDGE_ICON = {
  spending_alert: AlertTriangle,
  savings_tip: PiggyBank,
  repayment_reminder: CreditCard,
  credit_score_tip: TrendingUp,
  budget_advice: Lightbulb,
  goal_encouragement: Target,
  rosca_reminder: PiggyBank,
  milestone_celebration: Trophy,
};

// Surfaces unread AI coaching nudges (CoachingNudge entity) on the dashboard.
// Renders nothing when there are none. Dismissing marks the nudge as read.
export default function CoachingNudges({ userId }) {
  const [nudges, setNudges] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    base44.entities.CoachingNudge.filter({ user_id: userId, is_read: false }, '-created_date', 5)
      .then(setNudges)
      .catch(() => {});
  }, [userId]);

  const dismiss = async (id, e) => {
    e?.stopPropagation();
    setNudges(prev => prev.filter(n => n.id !== id));
    try { await base44.entities.CoachingNudge.update(id, { is_read: true }); } catch { /* ignore */ }
  };

  const open = (n) => {
    dismiss(n.id);
    const route = nudgeRoute(n);
    if (route) navigate(route);
  };

  if (nudges.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-[#0D1BFF] dark:text-[#32B4FF]" /> For you
      </p>
      {nudges.map(n => {
        const Icon = NUDGE_ICON[n.nudge_type] || Lightbulb;
        const route = nudgeRoute(n);
        return (
          <div key={n.id} onClick={() => open(n)}
            className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 shadow-sm flex items-start gap-3 cursor-pointer border border-[#0D1BFF]/10 dark:border-[#32B4FF]/10">
            <div className="w-9 h-9 rounded-xl bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-[#0D1BFF] dark:text-[#32B4FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{n.title}</p>
              {n.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>}
              {route && (
                <span className="inline-flex items-center gap-0.5 text-xs text-[#0D1BFF] dark:text-[#32B4FF] font-medium mt-1.5">
                  {n.action_label || 'Take action'} <ChevronRight className="w-3 h-3" />
                </span>
              )}
            </div>
            <button onClick={(e) => dismiss(n.id, e)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
