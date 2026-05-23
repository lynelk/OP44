import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Vault, Plus, Target, Zap, History, Users, X, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import AutoSaveManager from '@/components/savings/AutoSaveManager';
import AutoSaveHistory from '@/components/savings/AutoSaveHistory';

const ICONS = ['🎯','🏠','📚','✈️','💊','💍','🚗','💼'];

export default function Savings() {
  const [pockets, setPockets] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [autoFreq, setAutoFreq] = useState('none');
  const [autoAmount, setAutoAmount] = useState('');
  const [user, setUser] = useState(null);
  const [depositAmount, setDepositAmount] = useState({});
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const pullStartY = useRef(0);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const data = await base44.entities.SavingsPocket.filter({});
    setPockets(data);
  };

  useEffect(() => { loadData(); }, []);

  // Pull to refresh
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onTouchStart = (e) => { pullStartY.current = e.touches[0].clientY; };
    const onTouchEnd = async (e) => {
      const delta = e.changedTouches[0].clientY - pullStartY.current;
      if (delta > 80 && el.scrollTop === 0) {
        setIsRefreshing(true);
        await loadData();
        setTimeout(() => setIsRefreshing(false), 600);
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
  }, []);

  const handleCreate = async () => {
    if (!name || !goal) return;
    setSaving(true);
    const pocket = await base44.entities.SavingsPocket.create({
      user_id: user?.id, name, goal_amount: parseFloat(goal), icon, current_balance: 0,
      auto_save_frequency: autoFreq,
      auto_save_amount: autoAmount ? parseFloat(autoAmount) : undefined, status: 'active',
    });
    setPockets(prev => [pocket, ...prev]);
    setShowCreate(false);
    setName(''); setGoal(''); setIcon('🎯'); setAutoFreq('none'); setAutoAmount('');
    setSaving(false);
  };

  const handleDeposit = async (pocket) => {
    const amt = parseFloat(depositAmount[pocket.id] || 0);
    if (!amt) return;
    const updated = await base44.entities.SavingsPocket.update(pocket.id, {
      current_balance: (pocket.current_balance || 0) + amt,
    });
    setPockets(prev => prev.map(p => p.id === pocket.id ? updated : p));
    setDepositAmount(prev => ({ ...prev, [pocket.id]: '' }));
  };

  const totalSavings = pockets.reduce((sum, p) => sum + (p.current_balance || 0), 0);

  return (
    <div ref={scrollRef} className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32 overflow-y-auto">
      {isRefreshing && (
        <div className="flex justify-center pt-4 pb-2">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg text-sm text-gray-600 dark:text-gray-300">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" /> Refreshing...
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Savings Pockets</h1>
            <p className="text-green-200 text-sm mt-0.5">Total: UGX {totalSavings.toLocaleString()}</p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-2 text-xs font-medium text-green-200"
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {showHistory && user && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Auto-Save History</p>
            <AutoSaveHistory userId={user.id} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            className="flex items-center justify-center gap-1.5 bg-[#006B3C] active:scale-95 text-white rounded-2xl h-12 text-sm font-semibold transition-all"
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreate ? 'Cancel' : 'New Pocket'}
          </button>
          <Link to="/savings-groups">
            <button className="w-full flex items-center justify-center gap-1.5 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 text-[#006B3C] dark:text-[#7BC943] rounded-2xl h-12 text-sm font-medium transition-all active:scale-95">
              <Users className="w-4 h-4" /> Group Savings
            </button>
          </Link>
        </div>
        <Link to="/savings-goals">
          <button className="w-full flex items-center justify-center gap-1.5 bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-700 text-[#F4B400] dark:text-yellow-300 rounded-2xl h-11 text-sm font-medium transition-all active:scale-95">
            <Target className="w-4 h-4" /> Smart Savings Goals
          </button>
        </Link>

        {showCreate && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <p className="font-semibold text-gray-900 dark:text-white mb-4">New Savings Pocket</p>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => setIcon(ic)}
                    className={`text-2xl p-2 rounded-xl transition-all ${icon === ic ? 'bg-green-100 dark:bg-green-900/40 ring-2 ring-[#006B3C]' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    {ic}
                  </button>
                ))}
              </div>
              <Input placeholder="Pocket name (e.g. School Fees)" value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl" />
              <Input placeholder="Savings goal (UGX)" type="number" value={goal} onChange={e => setGoal(e.target.value)} className="h-11 rounded-xl" />
              <Select value={autoFreq} onValueChange={setAutoFreq}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Auto-save frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No auto-save</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {autoFreq !== 'none' && (
                <Input placeholder="Auto-save amount (UGX)" type="number" value={autoAmount} onChange={e => setAutoAmount(e.target.value)} className="h-11 rounded-xl" />
              )}
              <button
                className="w-full h-12 bg-[#006B3C] text-white rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                onClick={handleCreate} disabled={saving}
              >
                {saving ? 'Creating…' : 'Create Pocket'}
              </button>
            </div>
          </div>
        )}

        {pockets.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Vault className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-gray-500 dark:text-gray-400">No savings pockets yet</p>
            <p className="text-sm mt-1">Create a pocket to start saving toward a goal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pockets.map(pocket => {
              const progress = pocket.goal_amount ? Math.min((pocket.current_balance / pocket.goal_amount) * 100, 100) : 0;
              return (
                <div key={pocket.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{pocket.icon || '🎯'}</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{pocket.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Goal: UGX {pocket.goal_amount?.toLocaleString()}</p>
                        {pocket.auto_save_frequency !== 'none' && pocket.auto_save_amount && (
                          <p className="text-xs text-[#006B3C] flex items-center gap-1 mt-0.5">
                            <Zap className="w-3 h-3" /> UGX {pocket.auto_save_amount?.toLocaleString()} {pocket.auto_save_frequency}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">UGX {pocket.current_balance?.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{progress.toFixed(0)}% reached</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Input
                      type="number" placeholder="Deposit amount (UGX)" className="text-sm h-10 rounded-xl"
                      value={depositAmount[pocket.id] || ''}
                      onChange={e => setDepositAmount(prev => ({ ...prev, [pocket.id]: e.target.value }))}
                    />
                    <button
                      className="px-4 h-10 bg-[#006B3C] text-white rounded-xl text-sm font-medium active:scale-95"
                      onClick={() => handleDeposit(pocket)}
                    >Add</button>
                  </div>
                  {user && (
                    <AutoSaveManager
                      pocket={pocket} userId={user.id}
                      onUpdated={updated => setPockets(prev => prev.map(p => p.id === pocket.id ? updated : p))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}