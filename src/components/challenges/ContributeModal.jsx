import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ContributeModal({ challenge, onClose, onContributed }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

  const handleContribute = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    const res = await base44.functions.invoke('groupChallengeManager', {
      action: 'contribute',
      group_challenge_id: challenge.id,
      amount: parseFloat(amount)
    });
    setLoading(false);
    if (res.data?.success) {
      setResult(res.data);
      setTimeout(() => { onContributed(); onClose(); }, 2000);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center max-w-xs w-full">
          <div className="text-5xl mb-3">{result.isCompleted ? '🎉' : '✅'}</div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
            {result.isCompleted ? 'Goal Reached!' : 'Contribution Logged!'}
          </h3>
          <p className="text-gray-500 text-sm">UGX {parseFloat(amount).toLocaleString()} added</p>
          {result.newStreak > 1 && (
            <p className="text-orange-500 font-semibold mt-2">🔥 {result.newStreak} day streak!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Log Contribution</h2>
            <p className="text-xs text-gray-400">{challenge.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map(a => (
              <button key={a} onClick={() => setAmount(String(a))}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${amount === String(a) ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {a >= 1000 ? `${a / 1000}K` : a}
              </button>
            ))}
          </div>

          <Input
            type="number"
            placeholder="Custom amount (UGX)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="rounded-xl h-12 text-lg font-semibold text-center"
          />

          <button onClick={handleContribute} disabled={loading || !amount}
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            {loading ? 'Saving...' : 'Add Contribution'}
          </button>
        </div>
      </div>
    </div>
  );
}