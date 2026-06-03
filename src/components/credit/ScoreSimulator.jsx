import { useState } from 'react';
import { Sparkles, Info } from 'lucide-react';

// Client-side "what-if" estimator. The real score is computed server-side
// (calculateCreditScore); this only projects an *approximate* impact of common
// actions so users understand the levers. Always labelled as an estimate.
const SCENARIOS = [
  { key: 'repay_loan', label: 'Repay an active loan in full', points: 25 },
  { key: 'on_time_3', label: 'Make your next 3 payments on time', points: 30 },
  { key: 'lower_util', label: 'Cut credit utilisation below 30%', points: 20 },
  { key: 'savings', label: 'Keep an active savings pocket for 3 months', points: 15 },
  { key: 'kyc', label: 'Complete full KYC verification', points: 18 },
  { key: 'declare_income', label: 'Declare income & employment', points: 12 },
];

const MAX_SCORE = 850;

export default function ScoreSimulator({ currentScore }) {
  const [selected, setSelected] = useState({});

  if (!currentScore) return null;

  const toggle = (key) => setSelected(prev => ({ ...prev, [key]: !prev[key] }));

  const gain = SCENARIOS.reduce((sum, s) => sum + (selected[s.key] ? s.points : 0), 0);
  // Diminishing returns as the score approaches the ceiling.
  const headroom = MAX_SCORE - currentScore;
  const effectiveGain = Math.round(Math.min(gain, headroom * 0.85));
  const projected = Math.min(MAX_SCORE, currentScore + effectiveGain);
  const anySelected = effectiveGain > 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-[#0D1BFF] dark:text-[#32B4FF]" /> Score Simulator
      </p>
      <p className="text-xs text-gray-400 mb-3">See how your habits could move your score.</p>

      <div className="space-y-2">
        {SCENARIOS.map(s => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors ${
              selected[s.key]
                ? 'border-[#0D1BFF] bg-[#0D1BFF]/5 dark:bg-[#0D1BFF]/15'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
            }`}
          >
            <span className="text-sm text-gray-700 dark:text-gray-200">{s.label}</span>
            <span className={`text-xs font-bold flex-shrink-0 ${selected[s.key] ? 'text-[#0D1BFF] dark:text-[#32B4FF]' : 'text-gray-400'}`}>
              +{s.points}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] text-white p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-blue-100">Projected score</p>
          <p className="text-3xl font-bold tabular-nums">{projected}</p>
        </div>
        {anySelected && (
          <div className="text-right">
            <p className="text-xs text-blue-100">Estimated change</p>
            <p className="text-xl font-bold text-white">+{projected - currentScore}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3 text-[11px] text-gray-400">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
        <p>Estimate only. Your actual score is recalculated from your real data and bureau records.</p>
      </div>
    </div>
  );
}
