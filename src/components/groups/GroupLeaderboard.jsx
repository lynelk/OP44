import { Crown, TrendingUp } from 'lucide-react';

const MEDAL_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
const MEDAL_BG = ['bg-yellow-50', 'bg-gray-50', 'bg-amber-50'];
const RANK_ICONS = ['🥇', '🥈', '🥉'];

export default function GroupLeaderboard({ members, contributions, currentUserId, groupTarget }) {
  // Calculate per-member stats
  const memberStats = members.map(m => {
    const memberContribs = contributions.filter(c => c.user_id === m.user_id);
    const total = memberContribs.reduce((s, c) => s + (c.amount || 0), 0);
    const lastContrib = memberContribs.sort((a, b) => new Date(b.contributed_at) - new Date(a.contributed_at))[0];
    const streak = calculateStreak(memberContribs);
    return { ...m, total_contributed: m.total_contributed || total, streak, lastContrib };
  });

  const sorted = [...memberStats].sort((a, b) => (b.total_contributed || 0) - (a.total_contributed || 0));
  const topContributor = sorted[0];
  const totalSaved = sorted.reduce((s, m) => s + (m.total_contributed || 0), 0);
  const progressPct = groupTarget > 0 ? Math.min(100, (totalSaved / groupTarget) * 100) : 0;

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No members yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Group progress summary */}
      <div className="bg-gradient-to-r from-[#1a3a6b] to-[#2a4a8b] rounded-xl p-4 text-white">
        <p className="text-xs text-blue-200 mb-1">Collective Goal Progress</p>
        <div className="flex items-end justify-between mb-2">
          <p className="text-2xl font-bold">UGX {(totalSaved / 1000).toFixed(0)}K</p>
          <p className="text-sm text-blue-200">of UGX {(groupTarget / 1000).toFixed(0)}K</p>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2.5 mb-1">
          <div className="h-2.5 rounded-full bg-[#f97316] transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs text-blue-200">{progressPct.toFixed(0)}% achieved · {sorted.length} members saving together</p>
      </div>

      {/* Top contributor highlight */}
      {topContributor && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-lg">
            {(topContributor.user_name || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-yellow-500" />
              <p className="text-xs font-bold text-yellow-700">Top Saver</p>
            </div>
            <p className="text-sm font-semibold text-gray-800">{topContributor.user_name || topContributor.user_email || 'Member'}</p>
          </div>
          <p className="font-bold text-green-600 text-sm">UGX {((topContributor.total_contributed || 0) / 1000).toFixed(0)}K</p>
        </div>
      )}

      {/* Leaderboard rankings */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rankings</p>
        {sorted.map((member, idx) => {
          const isMe = member.user_id === currentUserId;
          const sharePct = totalSaved > 0 ? ((member.total_contributed || 0) / totalSaved * 100) : 0;
          return (
            <div key={member.id} className={`rounded-xl p-3 border flex items-center gap-3 transition-all ${isMe ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
              {/* Rank */}
              <div className="w-8 text-center">
                {idx < 3 ? (
                  <span className="text-lg">{RANK_ICONS[idx]}</span>
                ) : (
                  <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                )}
              </div>
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${idx < 3 ? MEDAL_BG[idx] : 'bg-gray-100'} ${idx < 3 ? MEDAL_COLORS[idx] : 'text-gray-600'}`}>
                {(member.user_name || 'U')[0].toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {member.user_name || member.user_email || 'Member'}
                    {isMe && <span className="ml-1 text-xs text-blue-500">(you)</span>}
                  </p>
                  {member.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                </div>
                {/* Share bar */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-500' : 'bg-blue-400'}`}
                      style={{ width: `${sharePct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{sharePct.toFixed(0)}%</span>
                </div>
              </div>
              {/* Amount */}
              <div className="text-right">
                <p className="font-bold text-green-600 text-sm">UGX {((member.total_contributed || 0) / 1000).toFixed(0)}K</p>
                {member.streak > 1 && (
                  <p className="text-xs text-orange-500">🔥 {member.streak} streak</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function calculateStreak(contributions) {
  if (!contributions || contributions.length === 0) return 0;
  const sorted = [...contributions].sort((a, b) => new Date(b.contributed_at) - new Date(a.contributed_at));
  const dates = sorted.map(c => new Date(c.contributed_at).toDateString());
  const unique = [...new Set(dates)];
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = (new Date(unique[i - 1]) - new Date(unique[i])) / 86400000;
    if (diff <= 7) streak++;
    else break;
  }
  return streak;
}