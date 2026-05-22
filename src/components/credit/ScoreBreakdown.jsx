import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';

const ITEMS = [
  { key: 'kyc_score', label: 'KYC Verification', max: 100, color: 'bg-purple-500' },
  { key: 'repayment_score', label: 'Repayment Behaviour', max: 200, color: 'bg-blue-500' },
  { key: 'loan_history_score', label: 'Loan History', max: 100, color: 'bg-indigo-500' },
  { key: 'income_score', label: 'Income & Employment', max: 100, color: 'bg-slate-500' },
  { key: 'savings_boost', label: 'Savings Boost ✨', max: 100, color: 'bg-emerald-500' },
  { key: 'expense_boost', label: 'Spending Habits Boost ✨', max: 50, color: 'bg-teal-500' },
];

export default function ScoreBreakdown({ breakdown }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <BarChart2 className="w-4 h-4" /> Score Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {ITEMS.map(item => {
          const val = breakdown[item.key] || 0;
          const pct = Math.min((val / item.max) * 100, 100);
          const isBoost = item.key.includes('boost');
          return (
            <div key={item.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className={`${isBoost ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>
                  {item.label}
                </span>
                <span className="text-slate-500 font-medium">{val} / {item.max}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${item.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-slate-400 pt-1">
          ✨ Savings & spending data only boosts your score — never reduces it.
        </p>
      </CardContent>
    </Card>
  );
}