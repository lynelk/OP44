import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, ChevronRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ChallengesBoard({ userId }) {
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    if (!userId) return;
    base44.entities.UserSavingsChallenge.filter({ user_id: userId, status: 'active' }).then(setChallenges);
  }, [userId]);

  if (challenges.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Savings Challenges</h2>
          <Link to="/savings-challenges" className="text-blue-600 text-sm flex items-center gap-1">
            Browse <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <Link to="/savings-challenges">
          <Card className="border-dashed border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">🔥</div>
              <p className="text-sm font-medium text-orange-700">Start a Saving Challenge</p>
              <p className="text-xs text-orange-500 mt-1">Earn badges for consistent saving streaks</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Active Challenges</h2>
        <Link to="/savings-challenges" className="text-blue-600 text-sm flex items-center gap-1">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {challenges.slice(0, 2).map(challenge => {
          const isStreak = challenge.challenge_type === 'streak_30day';
          const progress = isStreak
            ? Math.min(100, ((challenge.current_streak || 0) / 30) * 100)
            : Math.min(100, ((challenge.total_saved_in_challenge || 0) / (challenge.target_amount || 1)) * 100);

          return (
            <Card key={challenge.id} className="shadow-sm overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{challenge.badge_emoji || '🏆'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{challenge.challenge_title}</p>
                    {isStreak ? (
                      <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                        <Flame className="w-3 h-3" /> {challenge.current_streak || 0} day streak
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">
                        UGX {((challenge.total_saved_in_challenge || 0)).toLocaleString()} saved
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-600">{progress.toFixed(0)}%</span>
                </div>

                {/* Streak dots for streak challenges */}
                {isStreak ? (
                  <div className="flex gap-0.5 flex-wrap">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className={`w-5 h-5 rounded-sm ${i < (challenge.current_streak || 0) ? 'bg-orange-500' : 'bg-gray-100'}`} />
                    ))}
                  </div>
                ) : (
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}