import { Users, Clock, Trophy, ChevronRight, Flame } from 'lucide-react';

const STATUS_STYLES = {
  upcoming: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-500',
};

const TYPE_LABELS = {
  most_saved: '💰 Most Saved',
  first_to_goal: '🎯 First to Goal',
  streak_king: '🔥 Streak King',
  consistent_saver: '📅 Consistent Saver',
};

export default function ChallengeCard({ challenge, myEntry, groupName, onClick }) {
  const daysLeft = challenge.end_date
    ? Math.max(0, Math.ceil((new Date(challenge.end_date) - new Date()) / 86400000))
    : null;

  const progress = myEntry && challenge.individual_target
    ? Math.min(100, ((myEntry.total_saved_in_challenge || 0) / challenge.individual_target) * 100)
    : null;

  return (
    <button onClick={onClick} className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 text-left hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-2xl">
            {challenge.badge_emoji || '🏆'}
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{challenge.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{groupName}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[challenge.status] || STATUS_STYLES.upcoming}`}>
          {challenge.status}
        </span>
        <span className="text-xs text-gray-500">{TYPE_LABELS[challenge.challenge_type]}</span>
      </div>

      {progress !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Your progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{challenge.participants_count || 0}</span>
        </div>
        {daysLeft !== null && challenge.status === 'active' && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{daysLeft}d left</span>
          </div>
        )}
        {myEntry?.current_streak > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <Flame className="w-3.5 h-3.5" />
            <span>{myEntry.current_streak}d streak</span>
          </div>
        )}
        {myEntry?.rank && (
          <div className="flex items-center gap-1 text-amber-500 ml-auto">
            <Trophy className="w-3.5 h-3.5" />
            <span>#{myEntry.rank}</span>
          </div>
        )}
      </div>
    </button>
  );
}