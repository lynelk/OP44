import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, ToggleLeft, ToggleRight, History, CheckCircle } from 'lucide-react';

export default function AutoSaveManager({ pocket, userId, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [freq, setFreq] = useState(pocket.auto_save_frequency || 'none');
  const [amount, setAmount] = useState(String(pocket.auto_save_amount || ''));
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const isActive = pocket.auto_save_frequency && pocket.auto_save_frequency !== 'none' && pocket.auto_save_amount > 0;

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.SavingsPocket.update(pocket.id, {
      auto_save_frequency: freq,
      auto_save_amount: freq !== 'none' && amount ? parseFloat(amount) : 0,
    });
    setSaving(false);
    setEditing(false);
    onUpdated(updated);
  };

  const handleToggle = async () => {
    const newFreq = isActive ? 'none' : (pocket.auto_save_frequency || 'monthly');
    const updated = await base44.entities.SavingsPocket.update(pocket.id, {
      auto_save_frequency: newFreq,
    });
    onUpdated(updated);
  };

  const handleSimulateDeduction = async () => {
    if (!pocket.auto_save_amount) return;
    setSimulating(true);
    const updated = await base44.entities.SavingsPocket.update(pocket.id, {
      current_balance: (pocket.current_balance || 0) + pocket.auto_save_amount,
    });
    await base44.entities.AutoSaveLog.create({
      user_id: userId,
      pocket_id: pocket.id,
      pocket_name: pocket.name,
      amount: pocket.auto_save_amount,
      frequency: pocket.auto_save_frequency,
      status: 'success',
      executed_at: new Date().toISOString(),
      notes: 'Manual trigger',
    });
    setSimulating(false);
    onUpdated(updated);
  };

  return (
    <Card className="border border-dashed border-blue-200 bg-blue-50/40">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
            <Zap className="w-3.5 h-3.5" /> Auto-Save
          </div>
          <button onClick={handleToggle}>
            {isActive
              ? <ToggleRight className="w-5 h-5 text-blue-600" />
              : <ToggleLeft className="w-5 h-5 text-slate-400" />}
          </button>
        </div>

        {isActive && !editing && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              UGX {pocket.auto_save_amount?.toLocaleString()} / {pocket.auto_save_frequency}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setEditing(true)} className="text-xs text-blue-600 underline">Edit</button>
              <span className="text-slate-300">·</span>
              <button onClick={handleSimulateDeduction} disabled={simulating} className="text-xs text-emerald-600 flex items-center gap-0.5">
                {simulating ? '...' : <><History className="w-3 h-3" /> Run</>}
              </button>
            </div>
          </div>
        )}

        {(!isActive || editing) && (
          <div className="space-y-2 mt-1">
            <Select value={freq} onValueChange={setFreq}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Off</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {freq !== 'none' && (
              <Input className="h-8 text-xs" type="number" placeholder="Amount (UGX)" value={amount} onChange={e => setAmount(e.target.value)} />
            )}
            <Button size="sm" className="w-full h-7 text-xs bg-blue-600" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : <><CheckCircle className="w-3 h-3 mr-1" />Save Settings</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}