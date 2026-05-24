import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, CheckCircle2, RefreshCw, Play, Loader2, Bell, Scale, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIER_COLOR = {
  reminder: 'bg-blue-50 border-blue-200 text-blue-700',
  escalate: 'bg-amber-50 border-amber-200 text-amber-700',
  critical: 'bg-red-50 border-red-200 text-red-700',
};

export default function CollectionsMonitor() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const runCollections = async () => {
    setRunning(true);
    setResult(null);
    const res = await base44.functions.invoke('monitorRepayments', {});
    setResult(res.data);
    setRunning(false);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <AlertOctagon className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-gray-800">Admin Access Required</p>
          <p className="text-sm text-gray-500 mt-1">This page is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="bg-gradient-to-br from-red-700 to-red-900 text-white px-5 pt-12 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-red-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-black">Collections Workflow</h1>
        <p className="text-red-200 text-sm mt-1">Automated delinquency management engine</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Workflow description */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
          <p className="font-bold text-gray-900 dark:text-white text-sm">3-Tier Escalation Workflow</p>
          {[
            { IconComp: Bell, label: 'Tier 1 — Friendly Reminder', desc: 'Sent for 1–2 day delays or first missed payment. Warm reminder with repayment link.', tier: 'reminder' },
            { IconComp: Scale, label: 'Tier 2 — Repayment Plan Offer', desc: 'Triggered after 3+ days overdue or reminder_count ≥ 2. Personalised rescheduling via decideLoanReschedule.', tier: 'escalate' },
            { IconComp: AlertOctagon, label: 'Tier 3 — Collections Escalation', desc: 'Triggered after 14+ days overdue or reminder_count ≥ 3. Loan flagged, admin notified, CRB reporting initiated.', tier: 'critical' },
          ].map(({ IconComp, label, desc, tier }) => (
            <div key={tier} className={`flex items-start gap-3 rounded-xl p-3 border ${TIER_COLOR[tier]}`}>
              <IconComp className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Run button */}
        <Button
          onClick={runCollections}
          disabled={running}
          className="w-full h-12 bg-red-600 hover:bg-red-700 font-bold text-white gap-2"
        >
          {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running Collections Engine...</> : <><Play className="w-4 h-4" /> Run Collections Workflow Now</>}
        </Button>

        {/* Result */}
        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="font-bold text-gray-900 dark:text-white">Run Complete</p>
            </div>
            {[
              { label: 'Overdue Repayments Found', value: result.overdue_repayments, color: 'text-red-600' },
              { label: 'Tier 1 Reminders Sent', value: result.reminders_sent, color: 'text-blue-600' },
              { label: 'Tier 2 Plan Offers', value: result.reschedule_offers || 0, color: 'text-amber-600' },
              { label: 'Tier 3 Escalated to Collections', value: result.loans_flagged, color: 'text-red-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value ?? 0}</span>
              </div>
            ))}
          </div>
        )}

        {/* Automation note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 text-xs text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-1">⚡ This runs automatically every night at midnight (EAT)</p>
          <p className="opacity-80">You can also trigger it manually above for immediate processing. All actions are logged in the Notifications entity.</p>
        </div>
      </div>
    </div>
  );
}