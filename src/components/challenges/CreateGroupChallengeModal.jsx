import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Trophy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CHALLENGE_TYPES = [
  { value: 'most_saved', label: '💰 Most Saved', desc: 'Who saves the most by deadline wins' },
  { value: 'first_to_goal', label: '🎯 First to Goal', desc: 'First to reach individual target wins' },
  { value: 'streak_king', label: '🔥 Streak King', desc: 'Longest daily saving streak wins' },
  { value: 'consistent_saver', label: '📅 Consistent Saver', desc: 'Most days with a deposit wins' },
];

const REWARD_TYPES = [
  { value: 'badge', label: '🏅 Badge Only' },
  { value: 'rate_reduction', label: '📉 Interest Rate Reduction' },
  { value: 'limit_increase', label: '📈 Loan Limit Increase' },
  { value: 'cashback', label: '💸 Cashback' },
  { value: 'fee_waiver', label: '✅ Fee Waiver' },
];

export default function CreateGroupChallengeModal({ groups, onClose, onCreated }) {
  const [form, setForm] = useState({
    group_id: '', title: '', description: '', challenge_type: 'most_saved',
    individual_target: '', start_date: '', end_date: '',
    badge_emoji: '🏆', badge_name: '', reward_type: 'badge', reward_value: ''
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.group_id || !form.title || !form.start_date || !form.end_date) return;
    setLoading(true);
    const res = await base44.functions.invoke('groupChallengeManager', {
      action: 'create',
      ...form,
      individual_target: form.individual_target ? parseFloat(form.individual_target) : undefined,
      reward_value: form.reward_value ? parseFloat(form.reward_value) : undefined,
    });
    setLoading(false);
    if (res.data?.success) onCreated(res.data.challenge);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">New Group Challenge</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Select Group</label>
            <Select value={form.group_id} onValueChange={v => set('group_id', v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose a savings group" /></SelectTrigger>
              <SelectContent>
                {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.icon || '🏦'} {g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Challenge Title</label>
            <Input placeholder="e.g. December Savings Sprint" value={form.title} onChange={e => set('title', e.target.value)} className="rounded-xl" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Challenge Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CHALLENGE_TYPES.map(t => (
                <button key={t.value} onClick={() => set('challenge_type', t.value)}
                  className={`p-3 rounded-xl text-left border transition-all text-xs ${form.challenge_type === t.value ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="font-semibold mb-0.5">{t.label}</div>
                  <div className="text-gray-500 leading-tight">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date</label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date</label>
              <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Individual Target (UGX)</label>
            <Input type="number" placeholder="e.g. 500000" value={form.individual_target} onChange={e => set('individual_target', e.target.value)} className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Badge Emoji</label>
              <Input placeholder="🏆" value={form.badge_emoji} onChange={e => set('badge_emoji', e.target.value)} className="rounded-xl text-xl text-center" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Badge Name</label>
              <Input placeholder="Savings Champion" value={form.badge_name} onChange={e => set('badge_name', e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Winner Reward</label>
            <Select value={form.reward_type} onValueChange={v => set('reward_type', v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REWARD_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {form.reward_type !== 'badge' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                Reward Value {form.reward_type === 'cashback' ? '(UGX)' : '(%)'}
              </label>
              <Input type="number" placeholder="e.g. 5" value={form.reward_value} onChange={e => set('reward_value', e.target.value)} className="rounded-xl" />
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading || !form.group_id || !form.title}
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
            {loading ? 'Creating...' : '🚀 Launch Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
}