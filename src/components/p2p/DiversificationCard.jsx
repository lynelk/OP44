import { PieChart, AlertTriangle, ShieldCheck } from 'lucide-react';

// Portfolio concentration / diversification signal for lenders.
// Computed purely from the investments already loaded by the dashboard.
const CONCENTRATION_WARN = 30; // % in a single loan that triggers a warning

export default function DiversificationCard({ investments = [] }) {
  const active = investments.filter(i => i.status === 'active' || i.status === 'funded');
  const total = active.reduce((s, i) => s + (i.amount_invested || 0), 0);

  if (active.length === 0 || total <= 0) return null;

  // Concentration per loan (single-borrower exposure)
  const byLoan = {};
  active.forEach(i => {
    const key = i.loan_id || i.id;
    byLoan[key] = (byLoan[key] || 0) + (i.amount_invested || 0);
  });
  const shares = Object.values(byLoan).map(v => v / total);
  const topShare = Math.max(...shares);
  const topPct = Math.round(topShare * 100);

  // Herfindahl-Hirschman based diversification score (0–100; higher = better spread)
  const hhi = shares.reduce((s, v) => s + v * v, 0);
  const divScore = Math.round((1 - hhi) * 100);

  // Optional risk-band breakdown when the band is available on the investment.
  const bandTotals = {};
  active.forEach(i => {
    const b = i.risk_band;
    if (b) bandTotals[b] = (bandTotals[b] || 0) + (i.amount_invested || 0);
  });
  const bands = Object.entries(bandTotals)
    .map(([band, amt]) => ({ band, pct: Math.round((amt / total) * 100) }))
    .sort((a, b) => a.band.localeCompare(b.band));

  const concentrated = topPct > CONCENTRATION_WARN;
  const BAND_COLOR = { A: 'bg-emerald-500', B: 'bg-[#0D1BFF]', C: 'bg-amber-500', D: 'bg-red-500' };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <PieChart className="w-4 h-4 text-[#006B3C]" /> Portfolio Diversification
      </p>

      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke={divScore >= 60 ? '#10b981' : divScore >= 35 ? '#f59e0b' : '#ef4444'}
              strokeWidth="3.5" strokeDasharray={`${divScore} ${100 - divScore}`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">{divScore}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">Diversification score</p>
          <p className="text-xs text-gray-700 mt-0.5">
            Largest single loan is <span className="font-semibold">{topPct}%</span> of your portfolio across {active.length} active investment{active.length > 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      {bands.length > 0 && (
        <div className="mt-4">
          <div className="flex h-2.5 rounded-full overflow-hidden">
            {bands.map(b => (
              <div key={b.band} className={BAND_COLOR[b.band] || 'bg-gray-400'} style={{ width: `${b.pct}%` }} title={`Band ${b.band}: ${b.pct}%`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {bands.map(b => (
              <span key={b.band} className="flex items-center gap-1 text-[11px] text-gray-500">
                <span className={`w-2 h-2 rounded-full ${BAND_COLOR[b.band] || 'bg-gray-400'}`} /> Band {b.band} · {b.pct}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={`mt-3 flex items-start gap-2 rounded-xl p-3 ${concentrated ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
        {concentrated ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />}
        <p className="text-xs leading-relaxed">
          {concentrated
            ? `Over ${CONCENTRATION_WARN}% of your funds sit in one loan. Spreading across more borrowers lowers your risk if one defaults.`
            : 'Your funds are well spread across borrowers — a healthy way to manage default risk.'}
        </p>
      </div>
    </div>
  );
}
