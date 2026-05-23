import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Trophy, Target, CheckCircle2, Clock, ChevronRight, Zap, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';

const CHALLENGE_TEMPLATES = [
  {
    id: 'streak_30day',
    title: '30-Day Saving Streak',
    description: 'Save at least UGX 2,000 every day for 30 consecutive days.',
    type: 'streak_30day',
    target_days: 30,
    daily_minimum: 2000,
    badge_emoji: '🔥',
    badge_name: 'Streak Master',
    points_reward: 200,
    color: 'bg-orange-50 border-orange-200',
    accent: 'text-orange-600',
    icon: Flame,
  },
  {
    id: 'milestone_100k',
    title: 'Save UGX 100K',
    description: 'Save a total of UGX 100,000 within any savings pocket.',
    type: 'milestone_100k',
    target_amount: 100000,
    badge_emoji: '💰',
    badge_name: '100K Club',
    points_reward: 150,
    color: 'bg-green-50 border-green-200',
    accent: 'text-green-600',
    icon: Target,
  },
  {
    id: 'milestone_500k',
    title: 'Save UGX 500K',
    description: 'Accumulate UGX 500,000 across your savings pockets.',
    type: 'milestone_500k',
    target_amount: 500000,
    badge_emoji: '⭐',
    badge_name: 'Half Million Hero',
    points_reward: 300,
    color: 'bg-blue-50 border-blue-200',
    accent: 'text-blue-600',
    icon: Trophy,
  },
  {
    id: 'milestone_1m',
    title: 'Save UGX 1 Million',
    description: 'Reach UGX 1,000,000 in total savings. The ultimate milestone!',
    type: 'milestone_1m',
    target_amount: 1000000,
    badge_emoji: '👑',
    badge_name: 'Million Saver',
    points_reward: 500,
    color: 'bg-purple-50 border-purple-200',
    accent: 'text-purple-600',
    icon: Trophy,
  },
];

export default function SavingsChallenges() {
  const [user, setUser] = useState(null);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [pockets, setPockets] = useState([]);
  const [enrolling, setEnrolling] = useState(null);
  const [selectedPocket, setSelectedPocket] = useState({});
  const [tab, setTab] = useState('available');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.UserSavingsChallenge.filter({ user_id: u.id }).then(challenges => {
        setActiveChallenges(challenges.filter(c => c.status === 'active'));
        setCompletedChallenges(challenges.filter(c => c.status === 'completed'));
      });
      base44.entities.SavingsPocket.filter({}).then(setPockets);
    });
  }, []);

  const enrolledTypes = activeChallenges.map(c => c.challenge_type);
  const completedTypes = completedChallenges.map(c => c.challenge_type);

  const handleEnroll = async (template) => {
    if (!user) return;
    setEnrolling(template.id);
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await base44.entities.UserSavingsChallenge.create({
      user_id: user.id,
      challenge_id: template.id,
      challenge_title: template.title,
      challenge_type: template.type,
      status: 'active',
      current_streak: 0,
      longest_streak: 0,
      total_saved_in_challenge: 0,
      target_days: template.target_days,
      target_amount: template.target_amount,
      daily_minimum: template.daily_minimum,
      start_date: today,
      end_date: template.target_days ? endDate : null,
      badge_emoji: template.badge_emoji,
      badge_name: template.badge_name,
      pocket_id: selectedPocket[template.id] || null,
    });

    // Refresh
    const updated = await base44.entities.UserSavingsChallenge.filter({ user_id: user.id });
    setActiveChallenges(updated.filter(c => c.status === 'active'));
    setEnrolling(null);
  };

  const getProgress = (challenge) => {
    const template = CHALLENGE_TEMPLATES.find(t => t.type === challenge.challenge_type);
    if (!template) return 0;
    if (challenge.challenge_type === 'streak_30day') {
      return Math.min(100, ((challenge.current_streak || 0) / 30) * 100);
    }
    if (template.target_amount) {
      return Math.min(100, ((challenge.total_saved_in_challenge || 0) / template.target_amount) * 100);
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold mb-1">Savings Challenges</h1>
        <p className="text-blue-200 text-sm">Build habits. Earn badges. Grow wealth.</p>
        <div className="mt-3 flex gap-4 text-sm">
          <span className="text-white font-bold">{activeChallenges.length}</span>
          <span className="text-blue-200">Active</span>
          <span className="text-white font-bold ml-2">{completedChallenges.length}</span>
          <span className="text-blue-200">Completed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white px-4">
        {['available', 'active', 'completed'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-[#1a3a6b] text-[#1a3a6b]' : 'border-transparent text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Group Challenges Banner */}
      <div className="px-4 mt-4">
        <Link to="/group-challenges">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 flex items-center justify-between text-white mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Swords className="w-4 h-4" />
                <span className="font-bold text-sm">Group Challenges</span>
              </div>
              <p className="text-amber-100 text-xs">Compete with friends & win rewards</p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-100" />
          </div>
        </Link>
      </div>

      <div className="px-4 space-y-4">

        {/* Available Challenges */}
        {tab === 'available' && CHALLENGE_TEMPLATES.map(template => {
          const isEnrolled = enrolledTypes.includes(template.type);
          const isCompleted = completedTypes.includes(template.type);
          const Icon = template.icon;
          return (
            <Card key={template.id} className={`border-2 ${template.color}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{template.badge_emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-800">{template.title}</h3>
                      {isCompleted && <Badge className="bg-green-100 text-green-700 text-xs">✓ Done</Badge>}
                      {isEnrolled && !isCompleted && <Badge className="bg-blue-100 text-blue-700 text-xs">Active</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs font-medium ${template.accent}`}>+{template.points_reward} pts</span>
                      <span className="text-xs text-gray-400">🏅 {template.badge_name}</span>
                    </div>
                    {!isEnrolled && !isCompleted && (
                      <>
                        {pockets.length > 0 && (
                          <Select value={selectedPocket[template.id] || ''} onValueChange={v => setSelectedPocket(prev => ({ ...prev, [template.id]: v }))}>
                            <SelectTrigger className="mt-2 h-8 text-xs">
                              <SelectValue placeholder="Link a pocket (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {pockets.map(p => <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          size="sm"
                          className="mt-2 w-full bg-[#1a3a6b] text-white text-xs"
                          onClick={() => handleEnroll(template)}
                          disabled={enrolling === template.id}
                        >
                          {enrolling === template.id ? 'Enrolling...' : 'Start Challenge'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Active Challenges */}
        {tab === 'active' && (
          activeChallenges.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No active challenges</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setTab('available')}>
                Browse Challenges
              </Button>
            </div>
          ) : activeChallenges.map(challenge => {
            const template = CHALLENGE_TEMPLATES.find(t => t.type === challenge.challenge_type);
            const progress = getProgress(challenge);
            const isStreak = challenge.challenge_type === 'streak_30day';
            return (
              <Card key={challenge.id} className={`border-2 ${template?.color || 'border-gray-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{challenge.badge_emoji}</span>
                    <div>
                      <h3 className="font-bold text-sm text-gray-800">{challenge.challenge_title}</h3>
                      <p className="text-xs text-gray-400">Started {challenge.start_date}</p>
                    </div>
                  </div>
                  {isStreak && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-orange-600"><Flame className="w-3 h-3" />{challenge.current_streak} day streak</span>
                        <span className="text-gray-400">Goal: 30 days</span>
                      </div>
                      {/* Streak calendar dots */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.from({ length: 30 }).map((_, i) => (
                          <div key={i} className={`w-6 h-6 rounded-sm text-xs flex items-center justify-center font-medium ${i < (challenge.current_streak || 0) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-300'}`}>
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{isStreak ? `${challenge.current_streak || 0}/30 days` : `UGX ${(challenge.total_saved_in_challenge || 0).toLocaleString()} / UGX ${(challenge.target_amount || 0).toLocaleString()}`}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all ${template?.accent?.replace('text-', 'bg-') || 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {!isStreak && (
                    <p className="text-xs text-gray-400 mt-2">UGX {((challenge.total_saved_in_challenge || 0)).toLocaleString()} saved in challenge</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Completed */}
        {tab === 'completed' && (
          completedChallenges.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No completed challenges yet</p>
            </div>
          ) : completedChallenges.map(challenge => (
            <Card key={challenge.id} className="border-2 border-green-200 bg-green-50">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-3xl">{challenge.badge_emoji}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-gray-800">{challenge.challenge_title}</h3>
                  <p className="text-xs text-green-600">Completed {challenge.completed_at?.split('T')[0]}</p>
                  <Badge className="mt-1 bg-green-100 text-green-700 text-xs">🏅 {challenge.badge_name}</Badge>
                </div>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}