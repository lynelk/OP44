import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Flame, Medal } from 'lucide-react';

const RANK_STYLES = [
  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600', icon: '🥇' },
  { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', icon: '🥈' },
  { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600', icon: '🥉' },
];

export default function ChallengeLeaderboard({ challenge, currentUserId, onClose }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myEntry, setMyEntry] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [challenge.id]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('groupChallengeManager', {
      action: 'leaderboard',
      group_challenge_id: challenge.id
    });
    if (res.data?.success) {
      setLeaderboard(res.data.leaderboard);
      setMyEntry(res.data.leaderboard.find(e => e.user_id === currentUserId));
    }
    setLoading(false);
  };

  const daysLeft = challenge.end_date
    ? Math.max(0, Math.ceil((new Date(challenge.end_date) - new Date()) / 86400000))
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 text-center relative border-b border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="absolute right-4 top-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">✕</button>
          <div className="text-3xl mb-1">{challenge.badge_emoji || '🏆'}</div>
          <h2 className="font-bold text-gray-900 dark:text-white">{challenge.title}</h2>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-500">
            <span className={`px-2 py-0.5 rounded-full font-medium ${challenge.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {challenge.status}
            </span>
            {daysLeft !== null && <span>{daysLeft} days left</span>}
            <span>{challenge.participants_count || 0} participants</span>
          </div>
        </div>

        {/* My Position Banner */}
        {myEntry && (
          <div className="mx-4 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 font-semibold">Your Position</p>
              <p className="text-lg font-bold text-amber-700">#{myEntry.rank} Place</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Saved</p>
              <p className="font-bold text-gray-900 dark:text-white">UGX {(myEntry.total_saved || 0).toLocaleString()}</p>
            </div>
            {myEntry.current_streak > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="w-4 h-4" />
                <span className="font-bold text-sm">{myEntry.current_streak}d</span>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No participants yet</p>
            </div>
          ) : (
            leaderboard.map((entry, idx) => {
              const style = RANK_STYLES[idx] || { bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-400', icon: `#${idx + 1}` };
              const isMe = entry.user_id === currentUserId;
              return (
                <div key={entry.entry_id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isMe ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold ${style.bg}`}>
                    {typeof style.icon === 'string' && style.icon.startsWith('#') ? (
                      <span className={`text-sm ${style.text}`}>{style.icon}</span>
                    ) : style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {entry.user_name} {isMe && <span className="text-amber-500">(You)</span>}
                    </p>
                    <p className="text-xs text-gray-400">UGX {(entry.total_saved || 0).toLocaleString()}</p>
                  </div>
                  {entry.current_streak > 0 && (
                    <div className="flex items-center gap-0.5 text-orange-400">
                      <Flame className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{entry.current_streak}d</span>
                    </div>
                  )}
                  {entry.status === 'completed' && (
                    <Medal className="w-4 h-4 text-green-500" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Winner Reward Info */}
        {challenge.reward_type && challenge.reward_type !== 'badge' && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-500">🎁 Winner gets: <span className="font-semibold text-amber-600">{challenge.reward_type.replace('_', ' ')} {challenge.reward_value ? `(${challenge.reward_value}${challenge.reward_type === 'cashback' ? ' UGX' : '%'})` : ''}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}