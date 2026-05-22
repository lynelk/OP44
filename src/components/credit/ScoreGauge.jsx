export default function ScoreGauge({ score }) {
  const min = 300;
  const max = 850;
  const pct = ((score - min) / (max - min)) * 100;

  const getColor = () => {
    if (pct >= 75) return '#10b981';
    if (pct >= 55) return '#3b82f6';
    if (pct >= 35) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>300</span>
        <span>500</span>
        <span>620</span>
        <span>720</span>
        <span>850</span>
      </div>
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        {/* Gradient track */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 35%, #3b82f6 60%, #10b981 100%)' }} />
        {/* Mask overlay */}
        <div className="absolute inset-y-0 right-0 bg-slate-100 rounded-full transition-all duration-700"
          style={{ width: `${100 - pct}%` }} />
        {/* Thumb */}
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all duration-700"
          style={{ left: `calc(${pct}% - 8px)`, backgroundColor: getColor() }} />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>Poor</span>
        <span>Fair</span>
        <span>Good</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}