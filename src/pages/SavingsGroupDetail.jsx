import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowLeft, Copy, CheckCheck, PiggyBank, Receipt, LogOut, Crown, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import GroupLeaderboard from '@/components/groups/GroupLeaderboard';
import DigitalPaymentModal from '@/components/payments/DigitalPaymentModal';

export default function SavingsGroupDetail() {
  const { groupId } = useParams();
  const [user, setUser] = useState(null);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [tab, setTab] = useState('leaderboard');
  const [depositAmt, setDepositAmt] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [showContributePayment, setShowContributePayment] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async (u) => {
    const allGroups = await base44.entities.SavingsGroup.filter({});
    const g = allGroups.find(x => x.id === groupId);
    setGroup(g);
    const mems = await base44.entities.GroupMember.filter({ group_id: groupId, status: 'active' });
    setMembers(mems);
    const contribs = await base44.entities.GroupContribution.filter({ group_id: groupId });
    setContributions(contribs.sort((a, b) => new Date(b.contributed_at) - new Date(a.contributed_at)));
  };

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); load(u); });
  }, [groupId]);

  const handleContributionSuccess = async () => {
    setShowContributePayment(false);
    setDepositAmt('');
    setDepositNote('');
    await load(user);
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    setLeaving(true);
    await base44.functions.invoke('savingsGroupManager', { action: 'leave', group_id: groupId });
    window.location.href = '/savings-groups';
  };

  const copyCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const myMembership = members.find(m => m.user_id === user?.id);
  const isAdmin = myMembership?.role === 'admin';
  const progress = group ? Math.min(100, ((group.current_amount_saved || 0) / group.target_amount) * 100) : 0;

  if (!group) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-[#1a3a6b] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const timeAgo = (str) => {
    if (!str) return '';
    const diff = Date.now() - new Date(str).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <Link to="/savings-groups" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{group.icon || '🏦'}</span>
          <div>
            <h1 className="text-xl font-bold">{group.name}</h1>
            {group.description && <p className="text-blue-200 text-xs mt-0.5">{group.description}</p>}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-blue-200">Progress</span>
            <span className="font-bold">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 mb-2">
            <div className={`h-3 rounded-full transition-all ${group.status === 'completed' ? 'bg-green-400' : 'bg-[#f97316]'}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-blue-200">UGX {(group.current_amount_saved || 0).toLocaleString()} saved</span>
            <span className="text-blue-200">Goal: UGX {group.target_amount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-blue-200 flex items-center gap-1"><Users className="w-3 h-3" /> {group.members_count || members.length} members</span>
            {isAdmin && (
              <button className="flex items-center gap-1 text-xs text-blue-200 hover:text-white" onClick={copyCode}>
                {copied ? <CheckCheck className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : `Invite: ${group.invite_code}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contribute */}
      {group.status === 'active' && (
        <div className="px-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-2"><PiggyBank className="w-4 h-4 text-green-600" /> Add Contribution</p>
              <Input type="number" placeholder="Amount (UGX)" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} />
              <Input placeholder="Note (optional)" value={depositNote} onChange={e => setDepositNote(e.target.value)} />
              <Button className="w-full bg-green-600 text-white" onClick={() => parseFloat(depositAmt) && setShowContributePayment(true)} disabled={!depositAmt}>
                Contribute
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b bg-white px-4 mt-4 overflow-x-auto scrollbar-hide">
        {['leaderboard', 'ledger', 'members'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#1a3a6b] text-[#1a3a6b]' : 'border-transparent text-gray-500'}`}>
            {t === 'leaderboard' ? `🏆 Leaderboard` : t === 'ledger' ? `📋 Ledger (${contributions.length})` : `👥 Members (${members.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 mt-3 space-y-2">
        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <GroupLeaderboard
            members={members}
            contributions={contributions}
            currentUserId={user?.id}
            groupTarget={group?.target_amount || 0}
          />
        )}

        {/* Ledger */}
        {tab === 'ledger' && (
          contributions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No contributions yet. Be the first!</p>
            </div>
          ) : contributions.map(c => (
            <Card key={c.id} className="shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700">
                    {(c.user_name || 'U')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.user_name || 'Member'}</p>
                    {c.notes && <p className="text-xs text-gray-400">{c.notes}</p>}
                    <p className="text-xs text-gray-400">{timeAgo(c.contributed_at)}</p>
                  </div>
                </div>
                <p className="font-bold text-green-600">+UGX {c.amount?.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))
        )}

        {/* Members */}
        {tab === 'members' && members.map(member => (
          <Card key={member.id} className="shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">
                  {(member.user_name || 'U')[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium">{member.user_name || member.user_email || 'Member'}</p>
                    {member.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500" />}
                  </div>
                  <p className="text-xs text-gray-400">{member.user_email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">UGX {(member.total_contributed || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400">contributed</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave button */}
      {myMembership && !isAdmin && (
        <div className="px-4 mt-4">
          <Button variant="outline" className="w-full border-red-300 text-red-500 text-sm" onClick={handleLeave} disabled={leaving}>
            <LogOut className="w-4 h-4 mr-1" /> {leaving ? 'Leaving...' : 'Leave Group'}
          </Button>
        </div>
      )}

      {showContributePayment && group && (
        <DigitalPaymentModal
          paymentContext={{
            type: 'savings_group',
            id: groupId,
            amount: parseFloat(depositAmt) || 0,
            label: `Contribute to "${group.name}"`,
          }}
          onSuccess={handleContributionSuccess}
          onClose={() => setShowContributePayment(false)}
        />
      )}
    </div>
  );
}