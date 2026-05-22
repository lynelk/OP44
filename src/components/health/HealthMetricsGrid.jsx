import { TrendingUp, Target, AlertTriangle, CheckCircle } from 'lucide-react';

const Metric = ({ icon: Icon, iconColor, label, value, sub }) => (
  <div className="bg-white rounded-xl border border-slate-100 p-3">
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${iconColor}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <p className="text-lg font-bold text-slate-800">{value}</p>
    <p className="text-xs text-slate-500 leading-tight">{label}</p>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

export default function HealthMetricsGrid({ report }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Metric
        icon={TrendingUp}
        iconColor="bg-emerald-100 text-emerald-600"
        label="Total Savings"
        value={`UGX ${(report.total_savings || 0).toLocaleString()}`}
        sub={`${report.savings_goal_progress || 0}% avg goal progress`}
      />
      <Metric
        icon={Target}
        iconColor="bg-blue-100 text-blue-600"
        label="Credit Score"
        value={report.credit_score || 0}
        sub="out of 850"
      />
      <Metric
        icon={AlertTriangle}
        iconColor={report.overdue_repayments > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}
        label="Overdue Payments"
        value={report.overdue_repayments || 0}
        sub={`${report.on_time_repayment_rate || 100}% on-time rate`}
      />
      <Metric
        icon={CheckCircle}
        iconColor="bg-amber-100 text-amber-600"
        label="30-Day Spending"
        value={`UGX ${(report.total_expenses_last30 || 0).toLocaleString()}`}
        sub={report.top_expense_category !== 'none' ? `Top: ${report.top_expense_category}` : 'No data yet'}
      />
    </div>
  );
}