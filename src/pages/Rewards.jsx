import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Gift, Percent, TrendingUp, BadgeCheck, Wallet, Zap, ShieldCheck } from 'lucide-react';

const REWARD_TYPE = {
  rate_reduction: { label: 'Rate Reduction', icon: Percent, unit: '%', desc: 'Lower interest on your next loan' },
  limit_increase: { label: 'Limit Increase', icon: TrendingUp, unit: '%', desc: 'Higher borrowing limit' },
  cashback: { label: 'Cashback', icon: Wallet, unit: 'UGX', desc: 'Money back to your wallet' },
  fee_waiver: { label: 'Fee Waiver', icon: BadgeCheck, unit: '%', desc: 'Waived processing fees' },
  priority_approval: { label: 'Priority Approval', icon: Zap, unit: '', desc: 'Faster loan decisions' },
  trust_badge: { label: 'Trust Badge', icon: ShieldCheck, unit: '', desc: 'Recognised reliable borrower' },
};

const REASON_LABEL = {
  on_time_payment: 'On-time payment',
  early_repayment: 'Early repayment',
  consecutive_loans: 'Loyal borrower',
  savings_consistency: 'Consistent saver',
  employer_linked: 'Employer-linked',
  referral: 'Referral bonus',
};

const STATUS_CLS = {
  active: 'bg-emerald-100 text-emerald-700',
  redeemed: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-600',
};

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u =>
      base44.entities.LoyaltyReward.filter({ user_id: u.id }, '-created_date')
        .then(setRewards)
        .finally(() => setLoading(false))
    ).catch(() => setLoading(false));
  }, []);

  const active = rewards.filter(r => r.status === 'active');
  const past = rewards.filter(r => r.status !== 'active');

  const formatValue = (r) => {
    const t = REWARD_TYPE[r.reward_type];
    if (!t || !r.reward_value) return null;
    if (t.unit === 'UGX') return `UGX ${r.reward_value.toLocaleString()}`;
    if (t.unit === '%') return `${r.reward_value}%`;
    return null;
  };

  const RewardCard = ({ r, dim }) => {
    const t = REWARD_TYPE[r.reward_type] || REWARD_TYPE.cashback;
    const Icon = t.icon;
    const val = formatValue(r);
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm ${dim ? 'opacity-70' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#F4B400]/15 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[#F4B400]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.label}</p>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_CLS[r.status] || STATUS_CLS.active}`}>{r.status}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
            <div className="flex items-center justify-between mt-2">
              {val && <p className="text-lg font-bold text-[#0D1BFF] dark:text-[#32B4FF]">{val}</p>}
              {r.reward_reason && (
                <span className="text-[11px] text-gray-400">Earned via {REASON_LABEL[r.reward_reason] || r.reward_reason}</span>
              )}
            </div>
            {r.valid_until && r.status === 'active' && (
              <p className="text-[11px] text-gray-400 mt-1">Valid until {new Date(r.valid_until).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Rewards</h1>
        <p className="text-blue-100 text-sm">{active.length} active reward{active.length === 1 ? '' : 's'} ready to use</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-24 animate-pulse" />)}</div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No rewards yet</p>
            <p className="text-sm px-8">Repay loans on time, save consistently, and refer friends to earn rewards.</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Available</p>
                {active.map(r => <RewardCard key={r.id} r={r} />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-4">History</p>
                {past.map(r => <RewardCard key={r.id} r={r} dim />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
