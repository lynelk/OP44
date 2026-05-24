export default function EscrowStatusBadge({ loan }) {
  const escrowed = loan.escrowed_amount || loan.amount_funded || 0;
  const target = loan.amount_approved || loan.amount_requested || 0;
  const threshold = loan.funding_threshold_pct || 80;
  const pct = target > 0 ? Math.min(100, (escrowed / target) * 100) : 0;
  const thresholdMet = pct >= threshold;

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">🔒 Escrow Status</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${thresholdMet ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
          {thresholdMet ? 'Ready to Disburse' : 'Collecting Funds'}
        </span>
      </div>
      <div className="flex justify-between text-xs text-indigo-600 dark:text-indigo-400 mb-1">
        <span>UGX {escrowed.toLocaleString()} escrowed</span>
        <span>{pct.toFixed(0)}% / {threshold}% threshold</span>
      </div>
      <div className="h-2 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${thresholdMet ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {thresholdMet && (
        <p className="text-xs text-emerald-600 font-semibold mt-1.5">
          ✅ Threshold met — disbursement will trigger automatically
        </p>
      )}
    </div>
  );
}