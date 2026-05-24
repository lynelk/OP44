import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, Flame, Star, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEFAULT_CHECKLIST = [
  { id: 'check_balance', label: 'Check your savings balance', points: 5 },
  { id: 'log_expense', label: 'Log at least one expense', points: 10 },
  { id: 'review_budget', label: 'Review your budget', points: 10 },
  { id: 'savings_deposit', label: 'Make a savings deposit', points: 20 },
  { id: 'repayment_check', label: 'Check upcoming repayments', points: 5 },
];

export default function DailyWellnessJourney({ userId }) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const records = await base44.entities.WellnessActivity.filter({ user_id: userId });
      const todayRecord = records.find(r => r.activity_date === today);
      if (todayRecord) {
        setActivity(todayRecord);
      } else {
        // Create today's record
        const newRecord = await base44.entities.WellnessActivity.create({
          user_id: userId,
          activity_date: today,
          checklist: DEFAULT_CHECKLIST.map(item => ({ ...item, completed: false })),
          total_points_earned: 0,
          streak_count: calculateStreak(records),
          completed_all: false,
        });
        setActivity(newRecord);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  function calculateStreak(records) {
    const sorted = records.filter(r => r.completed_all).sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date));
    if (!sorted.length) return 0;
    let streak = 0;
    let checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 1); // start from yesterday
    for (const r of sorted) {
      const d = new Date(r.activity_date);
      if (d.toISOString().split('T')[0] === checkDate.toISOString().split('T')[0]) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }
    return streak;
  }

  const toggleItem = async (itemId) => {
    if (!activity || saving) return;
    setSaving(true);
    const updatedList = activity.checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    const points = updatedList.filter(i => i.completed).reduce((s, i) => s + (i.points || 0), 0);
    const allDone = updatedList.every(i => i.completed);
    const updated = await base44.entities.WellnessActivity.update(activity.id, {
      checklist: updatedList,
      total_points_earned: points,
      completed_all: allDone,
    });
    setActivity(updated);
    setSaving(false);
  };

  if (loading) return null;
  if (!activity) return null;

  const completedCount = activity.checklist?.filter(i => i.completed).length || 0;
  const totalCount = activity.checklist?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <p className="font-bold text-sm">Daily Wellness Journey</p>
          </div>
          {activity.streak_count > 0 && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1">
              <Flame className="w-3.5 h-3.5 text-orange-300" />
              <span className="text-xs font-bold">{activity.streak_count} day streak</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-purple-200 mb-1">
            <span>{completedCount}/{totalCount} tasks</span>
            <span>{activity.total_points_earned} pts earned</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="divide-y divide-gray-50 dark:divide-gray-700">
        {activity.checklist?.map(item => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id)}
            disabled={saving}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            {item.completed
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              : <Circle className="w-5 h-5 text-gray-300 shrink-0" />}
            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
              {item.label}
            </span>
            <span className="text-xs font-bold text-purple-500">+{item.points}pts</span>
          </button>
        ))}
      </div>

      {/* Completion banner */}
      {activity.completed_all && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 flex items-center gap-2 border-t border-emerald-100 dark:border-emerald-800">
          <Star className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            All done! {activity.total_points_earned} points earned today 🎉
          </p>
        </div>
      )}

      {/* Benchmarking Link */}
      <Link to="/benchmarking" className="flex items-center justify-between px-4 py-3 border-t border-gray-50 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">See how you compare to peers →</p>
        <ChevronRight className="w-4 h-4 text-purple-400" />
      </Link>
    </div>
  );
}