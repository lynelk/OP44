import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trophy, Users, Swords } from 'lucide-react';
import ChallengeCard from '@/components/challenges/ChallengeCard';
import CreateGroupChallengeModal from '@/components/challenges/CreateGroupChallengeModal';
import ChallengeLeaderboard from '@/components/challenges/ChallengeLeaderboard';
import ContributeModal from '@/components/challenges/ContributeModal';

export default function GroupChallenges() {
  const [user, setUser] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [groups, setGroups] = useState([]);
  const [myEntries, setMyEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [contributeChallenge, setContributeChallenge] = useState(null);
  const [tab, setTab] = useState('my');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);

    const [allChallenges, allGroups, allEntries] = await Promise.all([
      base44.entities.GroupChallenge.list('-created_date', 50),
      base44.entities.SavingsGroup.list('-created_date', 50),
      base44.entities.UserSavingsChallenge.filter({ user_id: u.id }),
    ]);

    setChallenges(allChallenges);
    setGroups(allGroups);
    setMyEntries(allEntries.filter(e => e.group_challenge_id));
    setLoading(false);
  };

  // Filter challenges I'm part of
  const myGroupIds = new Set(groups.filter(g => g.created_by === user?.id || g.members_count > 0).map(g => g.id));
  const myChallengeIds = new Set(myEntries.map(e => e.group_challenge_id));

  const myChallenges = challenges.filter(c => myChallengeIds.has(c.id));
  const discoverChallenges = challenges.filter(c =>
    !myChallengeIds.has(c.id) && c.status !== 'completed' && c.status !== 'cancelled'
  );

  const getMyEntry = (challengeId) => myEntries.find(e => e.group_challenge_id === challengeId);
  const getGroupName = (groupId) => groups.find(g => g.id === groupId)?.name || 'Unknown Group';

  const handleJoin = async (challenge) => {
    await base44.functions.invoke('groupChallengeManager', {
      action: 'join',
      group_challenge_id: challenge.id
    });
    loadData();
  };

  const displayChallenges = tab === 'my' ? myChallenges : discoverChallenges;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#d97706] text-white px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Group Challenges</h1>
            <p className="text-amber-200 text-sm mt-0.5">Compete, save, and win together</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 mt-4">
          <div className="bg-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-200" />
            <div>
              <p className="text-xs text-amber-200">Active</p>
              <p className="font-bold text-sm">{myChallenges.filter(c => c.status === 'active').length}</p>
            </div>
          </div>
          <div className="bg-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-200" />
            <div>
              <p className="text-xs text-amber-200">Joined</p>
              <p className="font-bold text-sm">{myChallenges.length}</p>
            </div>
          </div>
          <div className="bg-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-200" />
            <div>
              <p className="text-xs text-amber-200">Discover</p>
              <p className="font-bold text-sm">{discoverChallenges.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[{ key: 'my', label: 'My Challenges' }, { key: 'discover', label: 'Discover' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t.key ? 'bg-amber-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading challenges...</p>
          </div>
        ) : displayChallenges.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="font-medium text-gray-500">
              {tab === 'my' ? 'No challenges yet' : 'No challenges to discover'}
            </p>
            <p className="text-sm mt-1">
              {tab === 'my'
                ? 'Create one for your savings group!'
                : 'All challenges have been joined or completed.'}
            </p>
            {tab === 'my' && (
              <button onClick={() => setShowCreate(true)}
                className="mt-4 px-5 py-2.5 bg-amber-500 text-white rounded-full text-sm font-semibold">
                + Create Challenge
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayChallenges.map(challenge => (
              <div key={challenge.id} className="space-y-2">
                <ChallengeCard
                  challenge={challenge}
                  myEntry={getMyEntry(challenge.id)}
                  groupName={getGroupName(challenge.group_id)}
                  onClick={() => setSelectedChallenge(challenge)}
                />
                <div className="flex gap-2 px-1">
                  {tab === 'discover' && !myChallengeIds.has(challenge.id) ? (
                    <button onClick={() => handleJoin(challenge)}
                      className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl">
                      Join Challenge
                    </button>
                  ) : getMyEntry(challenge.id) && challenge.status === 'active' ? (
                    <button onClick={() => setContributeChallenge(challenge)}
                      className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl">
                      + Log Contribution
                    </button>
                  ) : null}
                  <button onClick={() => setSelectedChallenge(challenge)}
                    className="h-9 px-4 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-xl">
                    Leaderboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateGroupChallengeModal
          groups={groups}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadData(); }}
        />
      )}

      {selectedChallenge && (
        <ChallengeLeaderboard
          challenge={selectedChallenge}
          currentUserId={user?.id}
          onClose={() => setSelectedChallenge(null)}
        />
      )}

      {contributeChallenge && (
        <ContributeModal
          challenge={contributeChallenge}
          onClose={() => setContributeChallenge(null)}
          onContributed={() => { setContributeChallenge(null); loadData(); }}
        />
      )}
    </div>
  );
}