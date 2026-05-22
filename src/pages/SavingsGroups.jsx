import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Target, ChevronRight, Copy, CheckCheck, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

const GROUP_ICONS = ['🏦', '🏠', '✈️', '📚', '💍', '🚗', '🎓', '🏥', '🌾', '💼'];

export default function SavingsGroups() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [myMemberships, setMyMemberships] = useState([]);
  const [tab, setTab] = useState('my_groups');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Create form state
  const [form, setForm] = useState({ name: '', description: '', target_amount: '', end_date: '', icon: '🏦' });

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const memberships = await base44.entities.GroupMember.filter({ user_id: u.id, status: 'active' });
      setMyMemberships(memberships);
      const groupIds = memberships.map(m => m.group_id);
      if (groupIds.length > 0) {
        const allGroups = await base44.entities.SavingsGroup.filter({});
        setGroups(allGroups.filter(g => groupIds.includes(g.id)));
      }
    });
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.target_amount) return;
    setCreating(true);
    const res = await base44.functions.invoke('savingsGroupManager', {
      action: 'create', ...form, target_amount: parseFloat(form.target_amount),
    });
    if (res.data?.group) {
      setGroups(prev => [res.data.group, ...prev]);
      setMyMemberships(prev => [...prev, { group_id: res.data.group.id, role: 'admin' }]);
    }
    setForm({ name: '', description: '', target_amount: '', end_date: '', icon: '🏦' });
    setShowCreate(false);
    setCreating(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    const res = await base44.functions.invoke('savingsGroupManager', { action: 'join', invite_code: joinCode.trim().toUpperCase() });
    if (res.data?.error) {
      setJoinError(res.data.error);
    } else if (res.data?.group) {
      setGroups(prev => [...prev, res.data.group]);
      setMyMemberships(prev => [...prev, { group_id: res.data.group.id, role: 'member' }]);
      setShowJoin(false);
      setJoinCode('');
    }
    setJoining(false);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getMembership = (groupId) => myMemberships.find(m => m.group_id === groupId);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold mb-1">Savings Groups</h1>
        <p className="text-blue-200 text-sm">Save collectively with friends & family</p>
        <div className="flex gap-3 mt-3">
          <Button size="sm" className="bg-[#f97316] hover:bg-orange-600 text-white text-xs" onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}>
            <Plus className="w-3 h-3 mr-1" /> Create Group
          </Button>
          <Button size="sm" variant="outline" className="border-blue-300 text-white bg-white/10 text-xs" onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}>
            <LogIn className="w-3 h-3 mr-1" /> Join with Code
          </Button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Create Form */}
        {showCreate && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold text-sm">New Savings Group</p>
              <div className="flex gap-2 flex-wrap">
                {GROUP_ICONS.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                    className={`text-2xl p-1.5 rounded-lg ${form.icon === ic ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100'}`}>
                    {ic}
                  </button>
                ))}
              </div>
              <Input placeholder="Group name (e.g. Family Vacation Fund)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Goal description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <Input type="number" placeholder="Target amount (UGX)" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Target date (optional)</label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
              <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleCreate} disabled={creating || !form.name || !form.target_amount}>
                {creating ? 'Creating...' : 'Create Group'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Join Form */}
        {showJoin && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold text-sm">Join a Savings Group</p>
              <Input placeholder="Enter 6-character invite code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="font-mono tracking-widest text-center text-lg uppercase" maxLength={6} />
              {joinError && <p className="text-xs text-red-500">{joinError}</p>}
              <Button className="w-full bg-green-600 text-white" onClick={handleJoin} disabled={joining || !joinCode.trim()}>
                {joining ? 'Joining...' : 'Join Group'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Groups List */}
        {groups.length === 0 && !showCreate ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No savings groups yet</p>
            <p className="text-sm mt-1">Create a group or join with an invite code</p>
          </div>
        ) : (
          groups.map(group => {
            const progress = group.target_amount > 0 ? Math.min(100, (group.current_amount_saved / group.target_amount) * 100) : 0;
            const membership = getMembership(group.id);
            const isAdmin = membership?.role === 'admin';
            return (
              <Link key={group.id} to={`/savings-groups/${group.id}`}>
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{group.icon || '🏦'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800">{group.name}</p>
                            {isAdmin && <Badge className="text-xs bg-blue-100 text-blue-700 py-0">Admin</Badge>}
                            {group.status === 'completed' && <Badge className="text-xs bg-green-100 text-green-700 py-0">✓ Goal Met</Badge>}
                          </div>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3" /> {group.members_count || 1} members
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">UGX {((group.current_amount_saved || 0) / 1000).toFixed(0)}K</p>
                        <p className="text-xs text-gray-400">of UGX {(group.target_amount / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                      <div className={`h-2 rounded-full transition-all ${group.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{progress.toFixed(0)}% of goal</span>
                      {isAdmin && (
                        <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600"
                          onClick={e => { e.preventDefault(); copyCode(group.invite_code); }}>
                          {copiedCode === group.invite_code ? <CheckCheck className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          {copiedCode === group.invite_code ? 'Copied!' : group.invite_code}
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}