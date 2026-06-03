import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingDown, ShieldCheck, AlertTriangle, Wallet } from 'lucide-react';

// Compares the current month's spending against declared monthly income
// (from the user's UserProfile) and surfaces an affordability / savings-rate
// signal. Pure client-side; renders nothing until income is known.
export default function AffordabilityMeter({ userId, expenses = [] }) {
  const [income, setIncome] = useState(null);

  useEffect(() => {
    if (!userId) return;
    base44.entities.UserProfile.filter({ user_id: userId }, '-updated_date', 1)
      .then(profiles => {
        const p = profiles?.[0];
        if (p?.monthly_income) setIncome(p.monthly_income);
      })
      .catch(() => {});
  }, [userId]);

  if (!income || income <= 0) return null;

  const monthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthSpend = expenses
    .filter(e => (e.date || e.created_date || '').startsWith(monthPrefix))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const ratio = monthSpend / income; // share of income spent
  const savingsRate = Math.max(0, Math.round((1 - ratio) * 100));
  const pct = Math.min(100, Math.round(ratio * 100));

  let tone, Icon, title, msg;
  if (ratio >= 1) {
    tone = { bar: 'bg-red-500', card: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40', text: 'text-red-600 dark:text-red-400' };
    Icon = AlertTriangle;
    title = 'Spending exceeds income';
    msg = `You've spent UGX ${monthSpend.toLocaleString()} this month against an income of UGX ${income.toLocaleString()}. Consider trimming non-essentials.`;
  } else if (ratio >= 0.8) {
    tone = { bar: 'bg-amber-500', card: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40', text: 'text-amber-600 dark:text-amber-400' };
    Icon = TrendingDown;
    title = 'Low savings buffer';
    msg = `You're using ${pct}% of your income. Aim to keep spending under 80% to build savings.`;
  } else {
    tone = { bar: 'bg-emerald-500', card: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' };
    Icon = ShieldCheck;
    title = 'On track';
    msg = `You're saving roughly ${savingsRate}% of your income this month. Keep it up!`;
  }

  return (
    <div className={`rounded-2xl p-4 border shadow-sm ${tone.card}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tone.text}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${tone.text}`}>{title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{msg}</p>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-white/60 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{pct}%</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Income</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{(income / 1000).toFixed(0)}K</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Spent</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{(monthSpend / 1000).toFixed(0)}K</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center justify-center gap-0.5"><Wallet className="w-2.5 h-2.5" /> Save</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{savingsRate}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
