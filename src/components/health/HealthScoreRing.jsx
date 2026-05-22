export default function HealthScoreRing({ score, grade }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const gradeColor = {
    Excellent:   '#10b981',
    Good:        '#3b82f6',
    Fair:        '#f59e0b',
    'Needs Work':'#f97316',
    Critical:    '#ef4444',
  }[grade] || '#94a3b8';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke={gradeColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-800">{score}</span>
          <span className="text-xs text-slate-400">/100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-semibold" style={{ color: gradeColor }}>{grade}</span>
    </div>
  );
}