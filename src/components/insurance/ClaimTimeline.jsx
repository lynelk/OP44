import { Check, Clock, X } from 'lucide-react';

// Visual journey of a claim: Submitted → Under review → Decision → Paid.
// Derives state purely from the claim's existing status + timestamps.
const ORDER = ['submitted', 'under_review', 'approved', 'paid'];

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : null;

export default function ClaimTimeline({ claim }) {
  if (!claim) return null;
  const rejected = claim.status === 'rejected';

  const steps = [
    { key: 'submitted', label: 'Submitted', date: fmt(claim.created_date) },
    { key: 'under_review', label: 'Under review', date: null },
    rejected
      ? { key: 'rejected', label: 'Rejected', date: fmt(claim.reviewed_at) }
      : { key: 'approved', label: 'Approved', date: fmt(claim.reviewed_at) },
    { key: 'paid', label: 'Paid', date: fmt(claim.paid_at), amount: claim.amount_approved },
  ];

  const currentIdx = rejected ? 2 : Math.max(0, ORDER.indexOf(claim.status));

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-start">
        {steps.map((s, i) => {
          const done = !rejected && i < currentIdx;
          const active = i === currentIdx;
          const isRejectStep = s.key === 'rejected';
          const reached = done || active;

          let ring, Icon;
          if (isRejectStep && active) { ring = 'bg-red-500 text-white'; Icon = X; }
          else if (done) { ring = 'bg-emerald-500 text-white'; Icon = Check; }
          else if (active) { ring = 'bg-slate-800 text-white'; Icon = Clock; }
          else { ring = 'bg-slate-200 text-slate-400'; Icon = Clock; }

          return (
            <div key={s.key} className="flex-1 flex flex-col items-center relative">
              {i < steps.length - 1 && (
                <div className={`absolute top-3 left-1/2 w-full h-0.5 ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${ring}`}>
                <Icon className="w-3 h-3" />
              </div>
              <p className={`text-[10px] mt-1 text-center leading-tight ${reached ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{s.label}</p>
              {s.date && <p className="text-[9px] text-slate-400">{s.date}</p>}
              {s.key === 'paid' && s.amount > 0 && active && (
                <p className="text-[9px] font-semibold text-emerald-600">UGX {s.amount.toLocaleString()}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
