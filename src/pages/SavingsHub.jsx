/**
 * SavingsHub — Unified savings dashboard
 * Merges: SavingsPockets, SavingsGoals, SavingsChallenges, SavingsGroups
 * into a single lightweight view with Quick Save and progress bars.
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Vault, Plus, Target, Zap, Users, X, RefreshCw, Trophy, ChevronRight, Flame,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { savingsInterest } from '@/lib/finance';
import { toast } from 'sonner';

const ICONS = ['🎯','🏠','📚','✈️','💊','💍','🚗','💼'];
const TABS  = ['Pockets', 'Goals', 'Challenges', 'Groups'];

export default function SavingsHub() {
  const [tab, setTab]             = useState('Pockets');
  const [user, setUser]           = useState(null);
  const [pockets, setPockets]     = useState([]);
  const [goals, setGoals]         = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick Save state
  const [quickSavePocketId, setQuickSavePocketId] = useState('');
  const [quickSaveAmount, setQuickSaveAmount]     = useState('');
  const [quickSaving, setQuickSaving]             = useState(false);
  const [showQS, setShowQS]                       = useState(false);

  // New pocket form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newGoal, setNewGoal]       = useState('');
  const [newIcon, setNewIcon]       = useState('🎯');
  const [newFreq, setNewFreq]       = useState('none');
  const [newAuto, setNewAuto]       = useState('');
  const [creating, setCreating]     = useState(false);

  const scrollRef   = useRef(null);
  const pullStartY  = useRef(0);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [p, g, c, gr] = await Promise.all([
      base44.entities.SavingsPocket.filter({ user_id: u.id }),
      base44.entities.SavingsGoal.filter({ user_id: u.id }),
      base44.entities.UserSavingsChallenge.filter({ user_id: u.id }),
      base44.entities.SavingsGroup.filter({ created_by: u.email }),
    ]);
    setPockets(p);
    setGoals(g);
    setChallenges(c.filter(c => c.status === 'active'));
    setGroups(gr);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Pull to refresh
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onTouchStart = (e) => { pullStartY.current = e.touches[0].clientY; };
    const onTouchEnd   = async (e) => {
      const delta = e.changedTouches[0].clientY - pullStartY.current;
      if (delta > 80 && el.scrollTop === 0) {
        setIsRefreshing(true);
        await loadData();
        setTimeout(() => setIsRefreshing(false), 600);
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd,   { passive: true });
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
  }, []);

  const totalBalance = pockets.reduce((s, p) => s + (p.current_balance || 0), 0);
  const totalGoalTarget = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
  const totalGoalSaved  = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const overallGoalPct  = totalGoalTarget > 0 ? Math.min(100, (totalGoalSaved / totalGoalTarget) * 100) : 0;

  const handleQuickSave = async () => {
    const amt = parseFloat(quickSaveAmount);
    if (!amt || !quickSavePocketId) return;
    setQuickSaving(true);
    const pocket  = pockets.find(p => p.id === quickSavePocketId);
    if (!pocket) { setQuickSaving(false); return; }
    const updated = await base44.entities.SavingsPocket.update(pocket.id, {
      current_balance: (pocket.current_balance || 0) + amt,
    });
    setPockets(prev => prev.map(p => p.id === pocket.id ? updated : p));
    setQuickSaveAmount('');
    setShowQS(false);
    setQuickSaving(false);
    toast.success(`UGX ${amt.toLocaleString('en-UG')} saved to ${pocket.name}`);
  };

  const handleCreatePocket = async () => {
    if (!newName || !newGoal) return;
    setCreating(true);
    const pocket = await base44.entities.SavingsPocket.create({
      user_id: user?.id, name: newName, goal_amount: parseFloat(newGoal),
      icon: newIcon, current_balance: 0,
      auto_save_frequency: newFreq,
      auto_save_amount: newAuto ? parseFloat(newAuto) : undefined,
      status: 'active',
    });
    setPockets(prev => [pocket, ...prev]);
    setShowCreate(false);
    setNewName(''); setNewGoal(''); setNewIcon('🎯'); setNewFreq('none'); setNewAuto('');
    setCreating(false);
    toast.success(`"${pocket.name}" pocket created`);
  };

  return (
    <div ref={scrollRef} className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32 overflow-y-auto">
      {isRefreshing && (
        <div className="flex justify-center pt-4 pb-2">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg text-sm text-gray-600 dark:text-gray-300">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0D1BFF]" /> Refreshing...
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Savings Hub</h1>
            <p className="text-blue-100 text-sm mt-0.5">All your savings, one place</p>
          </div>
          <button
            onClick={() => { setShowQS(!showQS); setShowCreate(false); }}
            className="flex items-center gap-1.5 bg-[#00C48C] text-white font-bold px-4 py-2 rounded-full text-sm shadow-md active:scale-95 transition-transform"
          >
            <Zap className="w-3.5 h-3.5" /> Quick Save
          </button>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-blue-100 text-xs">Total Saved</p>
            <p className="text-lg font-bold">UGX {(totalBalance / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-blue-100 text-xs">Goals</p>
            <p className="text-lg font-bold">{overallGoalPct.toFixed(0)}%</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-blue-100 text-xs">Challenges</p>
            <p className="text-lg font-bold">{challenges.length} active</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Quick Save Panel */}
        {showQS && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F4B400]" /> Quick Save
            </p>
            <div className="space-y-2.5">
              <Select value={quickSavePocketId} onValueChange={setQuickSavePocketId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select pocket" />
                </SelectTrigger>
                <SelectContent>
                  {pockets.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.icon || '🎯'} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number" placeholder="Amount (UGX)" className="h-11 rounded-xl"
                value={quickSaveAmount} onChange={e => setQuickSaveAmount(e.target.value)}
              />
              <button
                onClick={handleQuickSave} disabled={quickSaving || !quickSavePocketId || !quickSaveAmount}
                className="w-full h-11 bg-[#0D1BFF] text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
              >
                {quickSaving ? 'Saving…' : 'Save Now'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 px-4 h-9 rounded-full text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-[#0D1BFF] text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Pockets ── */}
        {tab === 'Pockets' && (
          <div className="space-y-3">
            <button
              onClick={() => { setShowCreate(!showCreate); setShowQS(false); }}
              className="w-full flex items-center justify-center gap-1.5 h-11 bg-white dark:bg-gray-800 border-2 border-dashed border-[#0D1BFF] text-[#0D1BFF] dark:text-[#32B4FF] rounded-2xl text-sm font-semibold active:scale-95 transition-transform"
            >
              {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreate ? 'Cancel' : 'New Pocket'}
            </button>

            {showCreate && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setNewIcon(ic)}
                      className={`text-2xl p-2 rounded-xl transition-all ${newIcon === ic ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-[#0D1BFF]' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
                <Input placeholder="Pocket name" value={newName} onChange={e => setNewName(e.target.value)} className="h-11 rounded-xl" />
                <Input placeholder="Goal amount (UGX)" type="number" value={newGoal} onChange={e => setNewGoal(e.target.value)} className="h-11 rounded-xl" />
                <Select value={newFreq} onValueChange={setNewFreq}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Auto-save?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No auto-save</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                {newFreq !== 'none' && (
                  <Input placeholder="Auto-save amount (UGX)" type="number" value={newAuto} onChange={e => setNewAuto(e.target.value)} className="h-11 rounded-xl" />
                )}
                <button
                  onClick={handleCreatePocket} disabled={creating || !newName || !newGoal}
                  className="w-full h-11 bg-[#0D1BFF] text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-95"
                >
                  {creating ? 'Creating…' : 'Create Pocket'}
                </button>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-24 animate-pulse" />)}
              </div>
            ) : pockets.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Vault className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-gray-500 dark:text-gray-400">No savings pockets yet</p>
                <p className="text-sm mt-1">Create your first pocket above</p>
              </div>
            ) : (
              pockets.map(pocket => {
                const progress = pocket.goal_amount ? Math.min((pocket.current_balance / pocket.goal_amount) * 100, 100) : 0;
                return (
                  <div key={pocket.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{pocket.icon || '🎯'}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{pocket.name}</p>
                          <p className="text-xs text-gray-400">Goal: UGX {pocket.goal_amount?.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#0D1BFF] dark:text-[#32B4FF]">UGX {pocket.current_balance?.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{progress.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {pocket.auto_save_frequency && pocket.auto_save_frequency !== 'none' && pocket.auto_save_amount && (
                      <p className="text-xs text-[#0D1BFF] dark:text-[#32B4FF] flex items-center gap-1 mt-2">
                        <Zap className="w-3 h-3" /> Auto-saving UGX {pocket.auto_save_amount?.toLocaleString()} {pocket.auto_save_frequency}
                      </p>
                    )}
                    {pocket.current_balance > 0 && (() => {
                      const annualRate = pocket.interest_rate || 0.06;
                      const monthlyInterest = savingsInterest(pocket.current_balance, annualRate);
                      if (monthlyInterest <= 0) return null;
                      return (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                          +UGX {monthlyInterest.toLocaleString()}/mo interest ({(annualRate * 100).toFixed(0)}% p.a.)
                        </p>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Goals ── */}
        {tab === 'Goals' && (
          <div className="space-y-3">
            <Link to="/savings-goals">
              <button className="w-full flex items-center justify-between h-11 bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] text-white rounded-2xl px-4 text-sm font-semibold active:scale-95 transition-transform">
                <span className="flex items-center gap-2"><Target className="w-4 h-4" /> Manage Smart Goals</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
            {goals.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No savings goals yet</p>
              </div>
            ) : (
              goals.filter(g => g.status === 'active').map(goal => {
                const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
                return (
                  <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{goal.emoji || '🎯'}</span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{goal.name}</p>
                      </div>
                      <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-1">
                      <div className="bg-[#F4B400] h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400">
                      UGX {(goal.current_amount || 0).toLocaleString()} / {goal.target_amount?.toLocaleString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Challenges ── */}
        {tab === 'Challenges' && (
          <div className="space-y-3">
            <Link to="/savings-challenges">
              <button className="w-full flex items-center justify-between h-11 bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] text-white rounded-2xl px-4 text-sm font-semibold active:scale-95 transition-transform">
                <span className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Browse Challenges</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
            {challenges.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No active challenges</p>
              </div>
            ) : (
              challenges.map(c => (
                <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.badge_emoji || '🏆'}</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.challenge_title}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#F4B400] font-semibold">
                    <Flame className="w-3.5 h-3.5" />{c.current_streak || 0} streak
                    </div>
                  </div>
                  {c.target_amount > 0 && (
                    <>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2 mb-1">
                        <div
                          className="bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((c.total_saved_in_challenge || 0) / c.target_amount) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">
                        UGX {(c.total_saved_in_challenge || 0).toLocaleString()} / {c.target_amount.toLocaleString()}
                      </p>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Groups ── */}
        {tab === 'Groups' && (
          <div className="space-y-3">
            <Link to="/savings-groups">
              <button className="w-full flex items-center justify-between h-11 bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] text-white rounded-2xl px-4 text-sm font-semibold active:scale-95 transition-transform">
                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Manage Groups</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/rosca">
              <button className="w-full flex items-center justify-between h-11 bg-white dark:bg-gray-800 border border-[#0D1BFF]/30 dark:border-[#32B4FF]/30 text-[#0D1BFF] dark:text-[#32B4FF] rounded-2xl px-4 text-sm font-semibold active:scale-95 transition-transform">
                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Savings Circles (ROSCA)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
            {groups.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No savings groups yet</p>
              </div>
            ) : (
              groups.slice(0, 6).map(g => (
                <Link key={g.id} to={`/savings-groups/${g.id}`}>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20 rounded-xl flex items-center justify-center text-xl">
                      {g.icon || '👥'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{g.name}</p>
                      <p className="text-xs text-gray-400">{g.member_count || 0} members · UGX {(g.target_amount || 0).toLocaleString()}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}