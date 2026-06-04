import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMOJIS = ['🎯', '🏠', '💻', '🚗', '✈️', '📚', '💊', '💍', '🏥', '🌱', '📱', '🛡️'];
const CATEGORIES = ['food','transport','housing','health','education','entertainment','utilities','clothing','savings','other'];

export default function GoalForm({ onCreated }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [automationType, setAutomationType] = useState('none');
  const [roundUpStrategy, setRoundUpStrategy] = useState('nearest_1000');
  const [fixedAmount, setFixedAmount] = useState('');
  const [fixedFreq, setFixedFreq] = useState('monthly');
  const [linkedCategories, setLinkedCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleCategory = (cat) => {
    setLinkedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleCreate = async () => {
    if (!name || !target) return;
    setSaving(true);
    const res = await base44.functions.invoke('savingsGoalManager', {
      action: 'create',
      name,
      emoji,
      target_amount: parseFloat(target),
      deadline: deadline || undefined,
      automation_type: automationType,
      round_up_strategy: roundUpStrategy,
      fixed_transfer_amount: fixedAmount ? parseFloat(fixedAmount) : undefined,
      fixed_transfer_frequency: fixedFreq,
      linked_expense_categories: linkedCategories
    });
    setSaving(false);
    if (res.data?.goal) onCreated(res.data.goal);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-700">New Savings Goal</p>

        {/* Emoji picker */}
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`text-2xl p-1.5 rounded-lg transition-all ${emoji === e ? 'bg-blue-100 ring-2 ring-blue-500 scale-110' : 'bg-gray-100'}`}>
              {e}
            </button>
          ))}
        </div>

        <Input placeholder="Goal name (e.g. Emergency Fund)" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Target amount (UGX)" type="number" value={target} onChange={e => setTarget(e.target.value)} />
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Deadline (optional)</label>
          <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>

        {/* Automation */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Auto-contribution type</label>
          <Select value={automationType} onValueChange={setAutomationType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No automation</SelectItem>
              <SelectItem value="round_up">Round-up from expenses</SelectItem>
              <SelectItem value="fixed_transfer">Fixed recurring transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {automationType === 'round_up' && (
          <>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Round-up strategy</label>
              <Select value={roundUpStrategy} onValueChange={setRoundUpStrategy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearest_1000">Round up to nearest UGX 1,000</SelectItem>
                  <SelectItem value="nearest_5000">Round up to nearest UGX 5,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Trigger on expense categories</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => toggleCategory(cat)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${linkedCategories.includes(cat) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {automationType === 'fixed_transfer' && (
          <>
            <Input placeholder="Transfer amount (UGX)" type="number" value={fixedAmount} onChange={e => setFixedAmount(e.target.value)} />
            <Select value={fixedFreq} onValueChange={setFixedFreq}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleCreate} disabled={saving || !name || !target}>
          {saving ? 'Creating...' : '✓ Create Goal'}
        </Button>
      </CardContent>
    </Card>
  );
}