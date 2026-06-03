import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, X, RefreshCw, Coins, Calendar, UserPlus, Crown, CheckCircle2 } from 'lucide-react';

const FREQ = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const genInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const ugx = (n) => `UGX ${(n || 0).toLocaleString()}`;

export default function Rosca() {
  const [user, setUser] = useState(null);
  const [myGroups, setMyGroups] = useState([]);   // { group, member }
  const [openGroups, setOpenGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('mine');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', contribution_amount: '', frequency: 'monthly', max_members: '12' });

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const load = useCallback(async (u) => {
    setLoading(true);
    const me = u || await base44.auth.me();
    setUser(me);
    const [members, open] = await Promise.all([
      base44.entities.ROSCAMember.filter({ user_id: me.id }).catch(() => []),
      base44.entities.ROSCAGroup.filter({ status: 'open' }, '-created_date', 50).catch(() => []),
    ]);
    const groups = await Promise.all(
      members.map(m => base44.entities.ROSCAGroup.filter({ id: m.group_id }, '-updated_date', 1)
        .then(r => r?.[0] ? { group: r[0], member: m } : null).catch(() => null))
    );
    const mine = groups.filter(Boolean);
    setMyGroups(mine);
    const mineIds = new Set(mine.map(g => g.group.id));
    setOpenGroups(open.filter(g => !mineIds.has(g.id) && (g.current_members || 0) < (g.max_members || 12)));
    setLoading(false);
  }, []);

  useEffect(() => { base44.auth.me().then(load).catch(() => setLoading(false)); }, [load]);

  const createGroup = async () => {
    if (!form.name || !form.contribution_amount) return;
    setCreating(true);
    const group = await base44.entities.ROSCAGroup.create({
      name: form.name,
      description: form.description,
      created_by: user?.id,
      contribution_amount: parseFloat(form.contribution_amount),
      frequency: form.frequency,
      max_members: parseInt(form.max_members, 10) || 12,
      current_members: 1,
      total_pool: 0,
      current_round: 1,
      status: 'open',
      invite_code: genInviteCode(),
    });
    await base44.entities.ROSCAMember.create({
      group_id: group.id, user_id: user?.id, payout_position: 1,
      total_contributed: 0, has_received_payout: false, status: 'active',
      joined_at: new Date().toISOString(),
    });
    setForm({ name: '', description: '', contribution_amount: '', frequency: 'monthly', max_members: '12' });
    setShowCreate(false);
    setCreating(false);
    load(user);
  };

  const joinGroup = async () => {
    setJoinError('');
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      const found = await base44.entities.ROSCAGroup.filter({ invite_code: code }, '-created_date', 1);
      const group = found?.[0];
      if (!group) { setJoinError('No group found with that code.'); return; }
      if ((group.current_members || 0) >= (group.max_members || 12)) { setJoinError('This group is full.'); return; }
      const existing = await base44.entities.ROSCAMember.filter({ group_id: group.id, user_id: user?.id }, '-created_date', 1);
      if (existing?.[0]) { setJoinError('You are already a member of this group.'); return; }
      await base44.entities.ROSCAMember.create({
        group_id: group.id, user_id: user?.id, payout_position: (group.current_members || 0) + 1,
        total_contributed: 0, has_received_payout: false, status: 'active',
        joined_at: new Date().toISOString(),
      });
      await base44.entities.ROSCAGroup.update(group.id, { current_members: (group.current_members || 0) + 1 });
      setJoinCode('');
      load(user);
    } finally {
      setJoining(false);
    }
  };

  const contribute = async ({ group, member }) => {
    setBusyId(group.id);
    try {
      const amt = group.contribution_amount || 0;
      await base44.entities.ROSCAMember.update(member.id, { total_contributed: (member.total_contributed || 0) + amt });
      await base44.entities.ROSCAGroup.update(group.id, { total_pool: (group.total_pool || 0) + amt });
      load(user);
    } finally {
      setBusyId(null);
    }
  };

  const joinOpen = async (group) => {
    setBusyId(group.id);
    try {
      await base44.entities.ROSCAMember.create({
        group_id: group.id, user_id: user?.id, payout_position: (group.current_members || 0) + 1,
        total_contributed: 0, has_received_payout: false, status: 'active',
        joined_at: new Date().toISOString(),
      });
      await base44.entities.ROSCAGroup.update(group.id, { current_members: (group.current_members || 0) + 1 });
      load(user);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Savings Circles</h1>
        <p className="text-blue-100 text-sm">Rotating savings groups — save together, take turns to receive the pool.</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 h-10 bg-[#0D1BFF] hover:bg-[#0D1BFF]/90 text-white text-sm font-semibold px-4 rounded-full transition-colors">
            <Plus className="w-4 h-4" /> Create Circle
          </button>
          <button onClick={() => load(user)} className="flex items-center gap-1.5 h-10 border border-[#0D1BFF]/30 dark:border-[#32B4FF]/30 text-[#0D1BFF] dark:text-[#32B4FF] text-sm font-medium px-4 rounded-full bg-white dark:bg-gray-900">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Join by code */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5"><UserPlus className="w-4 h-4 text-[#32B4FF]" /> Join with invite code</p>
          <div className="flex gap-2">
            <Input placeholder="e.g. AB12CD" value={joinCode} onChange={e => setJoinCode(e.target.value)} className="h-11 rounded-xl uppercase" />
            <button onClick={joinGroup} disabled={joining || !joinCode.trim()}
              className="h-11 px-5 bg-[#0D1BFF] disabled:opacity-50 text-white font-semibold rounded-xl flex-shrink-0">
              {joining ? '...' : 'Join'}
            </button>
          </div>
          {joinError && <p className="text-xs text-red-500 mt-2">{joinError}</p>}
        </div>

        {showCreate && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">New Savings Circle</p>
              <button onClick={() => setShowCreate(false)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <Input placeholder="Circle name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl" />
              <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-11 rounded-xl" />
              <Input type="number" placeholder="Contribution per round (UGX)" value={form.contribution_amount} onChange={e => setForm(f => ({ ...f, contribution_amount: e.target.value }))} className="h-11 rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQ.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Max members" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <button onClick={createGroup} disabled={creating || !form.name || !form.contribution_amount}
                className="w-full h-11 bg-[#0D1BFF] disabled:opacity-50 text-white font-semibold rounded-xl">
                {creating ? 'Creating...' : 'Create Circle'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {[['mine', 'My Circles'], ['discover', 'Discover']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${tab === id ? 'bg-[#0D1BFF] text-white' : 'bg-white dark:bg-gray-900 text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-32 animate-pulse" />)}</div>
        ) : tab === 'mine' ? (
          myGroups.length === 0 ? (
            <Empty text="You haven't joined any circles yet." />
          ) : (
            <div className="space-y-3">
              {myGroups.map(({ group, member }) => (
                <div key={group.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        {group.created_by === user?.id && <Crown className="w-3.5 h-3.5 text-[#F4B400]" />}
                        {group.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{group.frequency} · {ugx(group.contribution_amount)} / round</p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-[#0D1BFF]/10 text-[#0D1BFF] dark:text-[#32B4FF] capitalize">{group.status}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <Stat label="Pool" value={ugx(group.total_pool)} />
                    <Stat label="Members" value={`${group.current_members || 0}/${group.max_members || 12}`} />
                    <Stat label="Your turn" value={`#${member.payout_position || '—'}`} />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-xs text-gray-400">
                      {group.invite_code && <>Invite code: <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">{group.invite_code}</span></>}
                      <p>You've contributed {ugx(member.total_contributed)}</p>
                    </div>
                    {member.has_received_payout ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Paid out</span>
                    ) : (
                      <button onClick={() => contribute({ group, member })} disabled={busyId === group.id}
                        className="flex items-center gap-1.5 h-9 px-4 bg-[#0D1BFF] disabled:opacity-50 text-white text-sm font-semibold rounded-full">
                        <Coins className="w-4 h-4" /> {busyId === group.id ? '...' : 'Contribute'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          openGroups.length === 0 ? (
            <Empty text="No open circles to join right now." />
          ) : (
            <div className="space-y-3">
              {openGroups.map(group => (
                <div key={group.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{group.name}</p>
                      {group.description && <p className="text-xs text-gray-400 mt-0.5">{group.description}</p>}
                      <p className="text-xs text-gray-400 mt-1 capitalize flex items-center gap-2">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {group.frequency}</span>
                        <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {ugx(group.contribution_amount)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {group.current_members || 0}/{group.max_members || 12}</span>
                      </p>
                    </div>
                    <button onClick={() => joinOpen(group)} disabled={busyId === group.id}
                      className="h-9 px-4 bg-[#0D1BFF] disabled:opacity-50 text-white text-sm font-semibold rounded-full flex-shrink-0">
                      {busyId === group.id ? '...' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl py-2">
    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
);

const Empty = ({ text }) => (
  <div className="text-center py-16 text-gray-400">
    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
    <p className="text-sm px-8">{text}</p>
  </div>
);
