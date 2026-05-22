import { AlertCircle, CheckCircle } from 'lucide-react';

export default function RuleFlags({ flags }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Alerts & Flags</p>
      {flags.length === 0 ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700">No issues detected — great financial habits!</p>
        </div>
      ) : (
        flags.map((flag, i) => (
          <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{flag}</p>
          </div>
        ))
      )}
    </div>
  );
}