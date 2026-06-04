/**
 * UnlockRequirements
 * Shows only the KYC/profile steps a user hasn't completed yet,
 * mapped to concrete unlock benefits (loan limits, P2P access, savings features).
 * Used on Dashboard and Profile pages.
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronRight, Lock, CheckCircle2, Zap, AlertTriangle, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const DOC_LABELS = {
  national_id: 'National ID',
  selfie: 'Selfie verification',
  bank_statement: 'Bank / Mobile Money statement',
  employment_letter: 'Employment letter',
  payslip: 'Payslip',
};

const UNLOCK_STEPS = [
  {
    id: 'national_id',
    label: 'Upload National ID',
    benefit: 'Unlock up to UGX 500,000 limit',
    icon: '🪪',
    check: (profile, docs) => docs.some(d => d.document_type === 'national_id' && ['pending','approved'].includes(d.status)),
    to: '/profile',
    priority: 1,
  },
  {
    id: 'selfie',
    label: 'Verify with Selfie',
    benefit: 'Identity match — required for disbursement',
    icon: '🤳',
    check: (profile, docs) => docs.some(d => d.document_type === 'selfie' && ['pending','approved'].includes(d.status)),
    to: '/profile',
    priority: 2,
  },
  {
    id: 'income',
    label: 'Declare Monthly Income',
    benefit: 'Unlock higher loan limits based on income',
    icon: '💼',
    check: (profile) => !!(profile.monthly_income && profile.monthly_income > 0),
    to: '/profile',
    priority: 3,
  },
  {
    id: 'bank_statement',
    label: 'Upload Bank / Mobile Money Statement',
    benefit: 'Unlock UGX 2,000,000+ loan limit',
    icon: '🏦',
    check: (profile, docs) => docs.some(d => d.document_type === 'bank_statement' && ['pending','approved'].includes(d.status)),
    to: '/profile',
    priority: 4,
  },
  {
    id: 'employment_letter',
    label: 'Upload Employment Letter',
    benefit: 'Access salaried loan products at lower rates',
    icon: '📄',
    check: (profile, docs) => docs.some(d => d.document_type === 'employment_letter' && ['pending','approved'].includes(d.status)),
    to: '/profile',
    priority: 5,
  },
  {
    id: 'savings_pocket',
    label: 'Create a Savings Pocket',
    benefit: 'Savings history boosts your credit score',
    icon: '🏦',
    check: (profile, docs, extra) => (extra.pocketsCount || 0) > 0,
    to: '/savings',
    priority: 6,
  },
  {
    id: 'insurance',
    label: 'Get Loan Protection Insurance',
    benefit: 'Insurance coverage unlocks P2P marketplace',
    icon: '🛡️',
    check: (profile, docs, extra) => (extra.activePolicies || 0) > 0,
    to: '/insurance',
    priority: 7,
  },
];

export default function UnlockRequirements({ compact = false }) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['unlockRequirements'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const [profiles, docs, pockets, policies] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: user.id }),
        base44.entities.KYCDocument.filter({ user_id: user.id }),
        base44.entities.SavingsPocket.filter({ user_id: user.id }),
        base44.entities.InsurancePolicy.filter({ user_id: user.id }),
      ]);
      const profile = profiles[0] || {};
      const extra = {
        pocketsCount: pockets.length,
        activePolicies: policies.filter(p => p.status === 'active').length,
      };
      const incomplete = UNLOCK_STEPS
        .filter(s => !s.check(profile, docs, extra))
        .sort((a, b) => a.priority - b.priority);

      const rejected = docs.filter(d => d.status === 'rejected');
      const latestByType = {};
      rejected.forEach(d => {
        const prev = latestByType[d.document_type];
        if (!prev || new Date(d.created_date) > new Date(prev.created_date)) latestByType[d.document_type] = d;
      });

      return { steps: incomplete, rejectedDocs: Object.values(latestByType) };
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  if (isLoading) return null;

  const steps = data?.steps ?? [];
  const rejectedDocs = data?.rejectedDocs ?? [];

  const RejectedBanner = rejectedDocs.length > 0 ? (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-sm font-bold text-red-700 dark:text-red-300">
          {rejectedDocs.length} document{rejectedDocs.length > 1 ? 's' : ''} need{rejectedDocs.length > 1 ? '' : 's'} resubmission
        </p>
      </div>
      <div className="space-y-2">
        {rejectedDocs.map(d => (
          <div key={d.id} className="text-xs">
            <p className="font-semibold text-red-700 dark:text-red-300">{DOC_LABELS[d.document_type] || d.document_type}</p>
            {(d.rejection_reason || d.review_notes) && (
              <p className="text-red-600 dark:text-red-400 mt-0.5">Reason: {d.rejection_reason || d.review_notes}</p>
            )}
          </div>
        ))}
      </div>
      <Link to="/profile">
        <button className="mt-3 w-full h-9 bg-red-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Resubmit Documents
        </button>
      </Link>
    </div>
  ) : null;

  if (steps.length === 0) return (
    <>
      {RejectedBanner}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Profile Complete</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">You've unlocked full credit access 🎉</p>
        </div>
      </div>
    </>
  );

  const visibleSteps = compact && !expanded ? steps.slice(0, 2) : steps;

  return (
    <>
    {RejectedBanner}
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50 dark:border-gray-800">
        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {steps.length} unlock{steps.length > 1 ? 's' : ''} remaining
          </p>
          <p className="text-xs text-gray-400">Complete these to access more credit</p>
        </div>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {visibleSteps.map((step) => (
          <Link to={step.to} key={step.id}>
            <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:scale-[0.99]">
              <span className="text-xl shrink-0">{step.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{step.label}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{step.benefit}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {compact && steps.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 text-xs font-semibold text-[#006B3C] dark:text-[#7BC943] border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {expanded ? 'Show less' : `+${steps.length - 2} more steps`}
        </button>
      )}
    </div>
    </>
  );
}