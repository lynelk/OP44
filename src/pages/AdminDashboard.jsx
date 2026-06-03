import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Users, ShieldCheck, Settings, FileText, BarChart2, ChevronRight, Landmark,
  TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Banknote, PiggyBank,
  Shield, Activity, RefreshCw, BarChart3, XCircle, Clock, Wrench, Wallet
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MODULES = [
  { path: '/admin/users', icon: Users, label: 'User Management', desc: 'Individuals & Businesses', color: 'bg-blue-500' },
  { path: '/admin/products', icon: Landmark, label: 'Products & Services', desc: 'Loans, Insurance, Investments', color: 'bg-purple-500' },
  { path: '/admin/rules', icon: Settings, label: 'Business Rules', desc: 'Configure lending & KYC rules', color: 'bg-orange-500' },
  { path: '/admin/crb', icon: ShieldCheck, label: 'CRB & Integrations', desc: 'Credit bureau checks', color: 'bg-green-500' },
  { path: '/admin/submissions', icon: FileText, label: 'Data Submissions', desc: 'Regulatory & CRB reports', color: 'bg-red-500' },
  { path: '/admin/loans', icon: BarChart2, label: 'Loan Management', desc: 'Review & approve loans', color: 'bg-indigo-500' },
  { path: '/admin/p2p', icon: TrendingUp, label: 'P2P Lending Engine', desc: 'Marketplace, profiles & revenue', color: 'bg-teal-600' },
  { path: '/admin/revenue', icon: TrendingUp, label: 'Revenue Tracking', desc: 'Income lines, expenses & partner reports', color: 'bg-emerald-600' },
  { path: '/admin/account-balances', icon: Wallet, label: 'Account Balances', desc: 'MTN, Airtel, Escrow & float management', color: 'bg-cyan-600' },
  { path: '/admin/reports', icon: BarChart3, label: 'Reports', desc: 'Download, filter & email reports', color: 'bg-rose-500' },
  { path: '/admin/portfolios', icon: Activity, label: 'Lender Portfolios', desc: 'Track individual lender returns', color: 'bg-cyan-600' },
  { path: '/admin/documents', icon: FileText, label: 'Document Review', desc: 'Verify IDs, payslips & statements', color: 'bg-emerald-600' },
  { path: '/admin/device-maintenance', icon: Wrench, label: 'Device Maintenance', desc: 'Scheduled service & maintenance requests', color: 'bg-orange-500' },
  { path: '/admin/device-verification', icon: ShieldCheck, label: 'Device Verification', desc: 'Review lender device submissions', color: 'bg-purple-500' },
];

const COLORS = ['#1a3a6b', '#f97316', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const KPICard = ({ label, value, sub, icon: Icon, color, trend, trendUp }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm">
    <div className="flex items-start justify-between mb-2">
      <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </span>
      )}
    </div>
    <p className="text-xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [savings, setSavings] = useState([]);
  const [users, setUsers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    if (me?.role !== 'admin') { setLoading(false); return; }

    const [statsRes, loansData, repsData, savingsData, usersData, policiesData] = await Promise.all([
      base44.functions.invoke('adminManager', { action: 'get_stats', entity: 'users' }),
      base44.entities.LoanApplication.filter({}),
      base44.entities.Repayment.filter({}),
      base44.entities.SavingsPocket.filter({}),
      base44.entities.User.list(),
      base44.entities.InsurancePolicy.filter({}),
    ]);

    setStats(statsRes.data);
    setLoans(loansData);
    setRepayments(repsData);
    setSavings(savingsData);
    setUsers(usersData);
    setPolicies(policiesData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (!user) return null;
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <ShieldCheck className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700">Access Denied</h2>
          <p className="text-gray-500 mt-2">Admin privileges required.</p>
          <Link to="/" className="text-blue-600 underline mt-4 block">Go Home</Link>
        </div>
      </div>
    );
  }

  // Compute analytics
  const activeLoans = loans.filter(l => ['active', 'disbursed'].includes(l.status));
  const defaultedLoans = loans.filter(l => l.status === 'defaulted');
  const totalLoanBook = loans.filter(l => !['draft', 'rejected'].includes(l.status))
    .reduce((s, l) => s + (l.amount_requested || 0), 0);
  const nplValue = defaultedLoans.reduce((s, l) => s + (l.outstanding_balance || l.amount_requested || 0), 0);
  const nplRatio = totalLoanBook > 0 ? (nplValue / totalLoanBook * 100).toFixed(1) : '0.0';
  const paidReps = repayments.filter(r => r.status === 'paid');
  const overdueReps = repayments.filter(r => r.status === 'overdue');
  const onTimeRate = repayments.length > 0 ? ((paidReps.length / (paidReps.length + overdueReps.length || 1)) * 100).toFixed(0) : '100';
  const totalSavings = savings.reduce((s, p) => s + (p.current_balance || 0), 0);
  const activePolicies = policies.filter(p => p.status === 'active').length;
  const pendingLoans = loans.filter(l => ['submitted', 'under_review'].includes(l.status));

  // Loan status distribution for pie chart
  const statusCounts = {};
  loans.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
  const loanPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Repayments by month (last 6 months)
  const monthlyRepayments = {};
  paidReps.forEach(r => {
    if (!r.paid_date) return;
    const m = r.paid_date.slice(0, 7);
    monthlyRepayments[m] = (monthlyRepayments[m] || 0) + r.amount;
  });
  const repaymentChartData = Object.entries(monthlyRepayments)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month: month.slice(5), amount: Math.round(amount / 1000) }));

  // Loan disbursements over time
  const disbursedByMonth = {};
  loans.filter(l => l.disbursed_at).forEach(l => {
    const m = l.disbursed_at.slice(0, 7);
    disbursedByMonth[m] = (disbursedByMonth[m] || 0) + (l.amount_requested || 0);
  });
  const disbursementChartData = Object.entries(disbursedByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month: month.slice(5), amount: Math.round(amount / 1000) }));

  // Savings growth
  const savingsByAmount = savings
    .filter(s => s.current_balance > 0)
    .sort((a, b) => b.current_balance - a.current_balance)
    .slice(0, 6)
    .map(s => ({ name: s.name?.slice(0, 10) || 'Pocket', value: Math.round(s.current_balance / 1000) }));

  const TABS = ['overview', 'loans', 'savings', 'insurance'];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-blue-200 text-sm">OpFin Analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-blue-200" />
            </button>
            <Link to="/" className="text-blue-200 text-xs underline">← App</Link>
          </div>
        </div>

        {/* Hero stats row */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[
            { label: 'Users', value: users.length || stats?.total_users || 0 },
            { label: 'Active Loans', value: activeLoans.length },
            { label: 'Pending', value: pendingLoans.length, alert: pendingLoans.length > 0 },
            { label: 'NPL %', value: `${nplRatio}%`, alert: parseFloat(nplRatio) > 5 },
          ].map(({ label, value, alert }) => (
            <div key={label} className={`${alert ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/10'} rounded-xl p-2 text-center`}>
              <p className={`text-lg font-bold ${alert ? 'text-red-200' : ''}`}>{value}</p>
              <p className="text-blue-200 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 bg-white px-4 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 py-3 px-4 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab ? 'border-[#1a3a6b] text-[#1a3a6b]' : 'border-transparent text-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Total Loan Book" value={`UGX ${(totalLoanBook / 1000000).toFixed(1)}M`} icon={Banknote} color="bg-[#1a3a6b]" />
              <KPICard label="NPL Ratio" value={`${nplRatio}%`} sub={`UGX ${(nplValue / 1000).toFixed(0)}K at risk`} icon={AlertTriangle} color={parseFloat(nplRatio) > 5 ? 'bg-red-500' : 'bg-emerald-500'} />
              <KPICard label="On-Time Repayments" value={`${onTimeRate}%`} sub={`${paidReps.length} of ${repayments.length} paid`} icon={CheckCircle2} color="bg-emerald-500" trendUp={true} />
              <KPICard label="Total Savings" value={`UGX ${(totalSavings / 1000000).toFixed(2)}M`} icon={PiggyBank} color="bg-purple-500" />
              <KPICard label="Active Policies" value={activePolicies} icon={Shield} color="bg-blue-500" />
              <KPICard label="Overdue Repayments" value={overdueReps.length} icon={Activity} color={overdueReps.length > 0 ? 'bg-red-500' : 'bg-gray-400'} />
            </div>

            {/* Loan status breakdown */}
            {loanPieData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Loan Portfolio Breakdown</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={loanPieData} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value">
                        {loanPieData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {loanPieData.map((entry, i) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-gray-600 capitalize">{entry.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-800">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Admin modules */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Admin Modules</h2>
              <div className="grid grid-cols-2 gap-2">
                {MODULES.map(({ path, icon: Icon, label, color }) => (
                  <Link key={path} to={path}>
                    <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-2.5 hover:shadow-md transition-shadow active:scale-[0.98]">
                      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{label}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* LOANS TAB */}
        {activeTab === 'loans' && (
          <>
            {/* NPL Deep Dive */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">NPL Analysis</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${parseFloat(nplRatio) > 5 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {nplRatio}% NPL
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Total Loan Portfolio', value: `UGX ${(totalLoanBook / 1000000).toFixed(2)}M`, color: 'bg-[#1a3a6b]' },
                  { label: 'Performing Loans', value: `UGX ${((totalLoanBook - nplValue) / 1000000).toFixed(2)}M`, color: 'bg-emerald-500' },
                  { label: 'Non-Performing Loans', value: `UGX ${(nplValue / 1000).toFixed(0)}K`, color: 'bg-red-500' },
                  { label: 'Defaulted Count', value: `${defaultedLoans.length} loan${defaultedLoans.length !== 1 ? 's' : ''}`, color: 'bg-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
              {/* NPL progress bar */}
              <div className="mt-3">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, parseFloat(nplRatio))}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Industry safe threshold: &lt; 5%</p>
              </div>
            </div>

            {/* Monthly Repayments Chart */}
            {repaymentChartData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Repayments (UGX '000)</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={repaymentChartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => [`UGX ${v}K`, 'Collected']} />
                    <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Disbursements Chart */}
            {disbursementChartData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Loan Disbursements (UGX '000)</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={disbursementChartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => [`UGX ${v}K`, 'Disbursed']} />
                    <Bar dataKey="amount" fill="#1a3a6b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Repayment performance */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Repayment Performance</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Paid', value: paidReps.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Overdue', value: overdueReps.length, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Scheduled', value: repayments.filter(r => r.status === 'scheduled').length, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending loan approvals */}
            {pendingLoans.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Pending Approvals</h3>
                  <Link to="/admin/loans">
                    <span className="text-xs text-blue-600 font-medium">View All →</span>
                  </Link>
                </div>
                <div className="space-y-2">
                  {pendingLoans.slice(0, 3).map(loan => (
                    <div key={loan.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{loan.purpose || 'Personal Loan'}</p>
                        <p className="text-xs text-gray-400">UGX {loan.amount_requested?.toLocaleString()} · {loan.tenure_months}mo</p>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium capitalize">{loan.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* SAVINGS TAB */}
        {activeTab === 'savings' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Total Savings" value={`UGX ${(totalSavings / 1000000).toFixed(2)}M`} icon={PiggyBank} color="bg-purple-500" />
              <KPICard label="Active Pockets" value={savings.filter(s => s.status === 'active').length} icon={BarChart3} color="bg-indigo-500" />
              <KPICard label="Completed Goals" value={savings.filter(s => s.status === 'completed').length} icon={CheckCircle2} color="bg-emerald-500" />
              <KPICard label="Avg Balance" value={`UGX ${savings.length > 0 ? ((totalSavings / savings.length) / 1000).toFixed(0) : 0}K`} icon={TrendingUp} color="bg-blue-500" />
            </div>

            {savingsByAmount.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Savings Pockets (UGX '000)</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={savingsByAmount} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip formatter={v => [`UGX ${v}K`, 'Balance']} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Savings Pocket Status</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Active', value: savings.filter(s => s.status === 'active').length, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Completed', value: savings.filter(s => s.status === 'completed').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Paused', value: savings.filter(s => s.status === 'paused').length, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* INSURANCE TAB */}
        {activeTab === 'insurance' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Active Policies" value={activePolicies} icon={Shield} color="bg-blue-500" />
              <KPICard label="Total Policies" value={policies.length} icon={FileText} color="bg-indigo-500" />
              <KPICard label="Pending Review" value={policies.filter(p => p.status === 'pending_review').length} icon={Clock} color="bg-amber-500" />
              <KPICard label="Lapsed/Cancelled" value={policies.filter(p => ['lapsed', 'cancelled'].includes(p.status)).length} icon={XCircle} color="bg-red-500" />
            </div>

            {policies.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Policy Status Distribution</h3>
                <div className="space-y-2">
                  {['active', 'pending_review', 'lapsed', 'cancelled', 'claimed', 'expired'].map((status, i) => {
                    const count = policies.filter(p => p.status === status).length;
                    if (count === 0) return null;
                    const pct = ((count / policies.length) * 100).toFixed(0);
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                          <span className="font-bold text-gray-800">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Premium Collection</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total Premiums Collected</span>
                  <span className="text-sm font-bold text-gray-800">
                    UGX {policies.reduce((s, p) => s + (p.total_premiums_paid || 0), 0).toLocaleString('en-UG', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Avg Coverage Amount</span>
                  <span className="text-sm font-bold text-gray-800">
                    UGX {policies.length > 0 ? (policies.reduce((s, p) => s + (p.coverage_amount || 0), 0) / policies.length).toLocaleString('en-UG', { maximumFractionDigits: 0 }) : 0}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}