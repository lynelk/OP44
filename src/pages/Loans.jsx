import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, Calculator, FileText, ArrowUpCircle, TrendingDown, Zap, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoanCostBreakdown, { calcLoanCosts } from '@/components/loans/LoanCostBreakdown';

const STATUS_CONFIG = {
  draft:        { label: 'Draft',        color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  approved:     { label: 'Approved',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected:     { label: 'Rejected',     color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  disbursed:    { label: 'Disbursed',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  active:       { label: 'Active',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  closed:       { label: 'Closed',       color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  defaulted:    { label: 'Defaulted',    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [showApply, setShowApply] = useState(false);
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('3');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.LoanApplication.filter({}).then(setLoans);
    });
  }, []);

  const { monthly, totalRepayable, disbursementFee, insuranceCost, netDisbursement } = calcLoanCosts(amount, tenure);

  const handleApply = async () => {
    if (!amount || !purpose) return;
    setSubmitting(true);
    const loan = await base44.entities.LoanApplication.create({
      user_id: user?.id, amount_requested: parseFloat(amount),
      tenure_months: parseInt(tenure), purpose, status: 'submitted',
      monthly_installment: monthly, total_repayable: totalRepayable,
      disbursement_fee: disbursementFee, insurance_cost: insuranceCost, net_disbursement: netDisbursement,
    });
    setLoans(prev => [loan, ...prev]);
    setShowApply(false); setAmount(''); setPurpose(''); setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f2a55] via-[#1a3a6b] to-[#1e4480] text-white px-5 pt-14 pb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">My Loans</h1>
        <p className="text-blue-300 text-sm">Fast, transparent credit</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Action Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setShowApply(!showApply)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 h-10 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" /> Apply
          </button>
          <Link to="/loans/statement" className="flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 h-10 rounded-full">
              <FileText className="w-4 h-4" /> Statement
            </div>
          </Link>
          <Link to="/loans/repay" className="flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium px-4 h-10 rounded-full">
              <ArrowUpCircle className="w-4 h-4" /> Repay
            </div>
          </Link>
          <Link to="/loans/planner" className="flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 text-sm font-medium px-4 h-10 rounded-full">
              <TrendingDown className="w-4 h-4" /> Planner
            </div>
          </Link>
        </div>

        <Link to="/loans/pre-qualify">
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Check Pre-Qualification</p>
                <p className="text-orange-100 text-xs">See how much you can borrow</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-orange-200" />
          </div>
        </Link>

        {/* Apply Form */}
        {showApply && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Loan Application</p>
              </div>
              <button onClick={() => setShowApply(false)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Loan Amount (UGX)</label>
                <Input type="number" placeholder="e.g. 500,000" value={amount} onChange={e => setAmount(e.target.value)}
                  className="h-11 rounded-xl text-base" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Repayment Period</label>
                <Select value={tenure} onValueChange={setTenure}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[['1','1 Month'],['2','2 Months'],['3','3 Months'],['6','6 Months'],['12','12 Months']].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Purpose</label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                  <SelectContent>
                    {['Emergency','School Fees','Business','Medical','Daily Expenses','Asset Acquisition'].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <LoanCostBreakdown amount={amount} tenure={tenure} />
              <button
                onClick={handleApply} disabled={submitting || !amount || !purpose}
                className="w-full h-11 bg-[#1a3a6b] disabled:opacity-50 text-white font-semibold rounded-xl transition-opacity"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}

        {/* Loan List */}
        {loans.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500 dark:text-gray-400">No loan applications yet</p>
            <p className="text-sm mt-1">Apply for instant credit above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map(loan => {
              const cfg = STATUS_CONFIG[loan.status] || STATUS_CONFIG.draft;
              return (
                <div key={loan.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">UGX {(loan.amount_requested / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{loan.purpose || 'Personal Loan'} · {loan.tenure_months} months</p>
                      {loan.monthly_installment > 0 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          UGX {loan.monthly_installment.toLocaleString('en-UG', { maximumFractionDigits: 0 })}/month
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  {(loan.outstanding_balance > 0 || ['active','disbursed'].includes(loan.status)) && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      {loan.outstanding_balance > 0 ? (
                        <p className="text-xs text-gray-500">Outstanding: <span className="font-semibold text-gray-700 dark:text-gray-300">UGX {(loan.outstanding_balance / 1000).toFixed(0)}K</span></p>
                      ) : <div />}
                      {['active','disbursed'].includes(loan.status) && (
                        <div className="flex gap-2">
                          <Link to={`/loans/statement?loan_id=${loan.id}`}>
                            <button className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 h-8 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                              <FileText className="w-3 h-3" /> Statement
                            </button>
                          </Link>
                          <Link to={`/loans/repay?loan_id=${loan.id}`}>
                            <button className="text-xs text-white font-medium flex items-center gap-1 h-8 px-3 rounded-lg bg-orange-500">
                              <ArrowUpCircle className="w-3 h-3" /> Repay
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}