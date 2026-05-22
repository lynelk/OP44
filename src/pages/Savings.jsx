import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PiggyBank, Plus, Target, Zap, History, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import AutoSaveManager from '@/components/savings/AutoSaveManager';
import AutoSaveHistory from '@/components/savings/AutoSaveHistory';

const ICONS = ['🎯', '🏠', '📚', '✈️', '💊', '💍', '🚗', '💼'];

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

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.SavingsPocket.filter({}).then(setPockets);
    });
  }, []);

  const handleCreate = async () => {
    if (!name || !goal) return;
    setSaving(true);
    const pocket = await base44.entities.SavingsPocket.create({
      user_id: user?.id,
      name,
      goal_amount: parseFloat(goal),
      icon,
      current_balance: 0,
      auto_save_frequency: autoFreq,
      auto_save_amount: autoAmount ? parseFloat(autoAmount) : undefined,
      status: 'active',
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
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Savings Pockets</h1>
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1 text-blue-200 text-xs border border-blue-400 rounded-full px-2 py-1">
            <History className="w-3 h-3" /> Auto-Save Log
          </button>
        </div>
        <p className="text-blue-200 text-sm">Total saved: UGX {totalSavings.toLocaleString()}</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {showHistory && user && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Auto-Save History</p>
            <AutoSaveHistory userId={user.id} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" /> New Pocket
          </Button>
          <Link to="/savings-groups">
            <Button variant="outline" className="w-full border-purple-500 text-purple-700">
              <Users className="w-4 h-4" /> Group Savings
            </Button>
          </Link>
        </div>

        {showCreate && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold text-sm">New Savings Pocket</p>
              <div className="flex gap-2 flex-wrap">
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => setIcon(ic)}
                    className={`text-2xl p-1.5 rounded-lg ${icon === ic ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-100'}`}>
                    {ic}
                  </button>
                ))}
              </div>
              <Input placeholder="Pocket name (e.g. School Fees)" value={name} onChange={e => setName(e.target.value)} />
              <Input placeholder="Savings goal (UGX)" type="number" value={goal} onChange={e => setGoal(e.target.value)} />
              <Select value={autoFreq} onValueChange={setAutoFreq}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-save frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No auto-save</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {autoFreq !== 'none' && (
                <Input placeholder="Auto-save amount (UGX)" type="number" value={autoAmount} onChange={e => setAutoAmount(e.target.value)} />
              )}
              <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create Pocket'}
              </Button>
            </CardContent>
          </Card>
        )}

        {pockets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No savings pockets yet</p>
            <p className="text-sm mt-1">Create a pocket to start saving toward a goal</p>
          </div>
        ) : (
          pockets.map(pocket => {
            const progress = pocket.goal_amount ? Math.min((pocket.current_balance / pocket.goal_amount) * 100, 100) : 0;
            return (
              <Card key={pocket.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{pocket.icon || '🎯'}</span>
                      <div>
                        <p className="font-semibold">{pocket.name}</p>
                        <p className="text-xs text-gray-400">Goal: UGX {pocket.goal_amount?.toLocaleString()}</p>
                        {pocket.auto_save_frequency !== 'none' && pocket.auto_save_amount && (
                          <p className="text-xs text-blue-500 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> UGX {pocket.auto_save_amount?.toLocaleString()} {pocket.auto_save_frequency}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">UGX {pocket.current_balance?.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{progress.toFixed(0)}% reached</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Input
                      type="number"
                      placeholder="Deposit amount (UGX)"
                      className="text-sm"
                      value={depositAmount[pocket.id] || ''}
                      onChange={e => setDepositAmount(prev => ({ ...prev, [pocket.id]: e.target.value }))}
                    />
                    <Button size="sm" className="bg-green-600 text-white" onClick={() => handleDeposit(pocket)}>
                      Add
                    </Button>
                  </div>
                  {user && (
                    <AutoSaveManager
                      pocket={pocket}
                      userId={user.id}
                      onUpdated={updated => setPockets(prev => prev.map(p => p.id === pocket.id ? updated : p))}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}