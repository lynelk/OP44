const PILLAR_META = {
  credit:   { label: 'Credit',   emoji: '📊', weight: '30%', color: '#6366f1' },
  savings:  { label: 'Savings',  emoji: '🏦', weight: '25%', color: '#10b981' },
  spending: { label: 'Spending', emoji: '💸', weight: '20%', color: '#f59e0b' },
  debt:     { label: 'Debt Mgmt',emoji: '📋', weight: '25%', color: '#3b82f6' },
};

export default function PillarBar({ pillar, score }) {
  const meta = PILLAR_META[pillar];
  const label =
    score >= 80 ? 'Strong' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Fair' : 'Weak';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <span>{meta.emoji}</span> {meta.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{meta.weight} weight</span>
          <span className="font-bold text-slate-800">{score}</span>
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: meta.color }}
        />
      </div>
      <p className="text-xs text-right" style={{ color: meta.color }}>{label}</p>
    </div>
  );
}