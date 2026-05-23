import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { CreditCard, FileText, ArrowUpCircle, TrendingDown, Zap, ChevronRight, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, Banknote, RefreshCw, CalendarClock, Phone } from 'lucide-react';

import LoanApplicationWizard from '@/components/loans/LoanApplicationWizard';
import LoanRescheduleModal from '@/components/loans/LoanRescheduleModal';

const STATUS_CONFIG = {
  draft:        { label: 'Draft',        color: 'bg-gray-100 text-gray-600', icon: Clock },
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-700', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved:     { label: 'Approved',     color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected:     { label: 'Rejected',     color: 'bg-red-100 text-red-700', icon: XCircle },
  disbursed:    { label: 'Disbursed',    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  active:       { label: 'Active',       color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  closed:       { label: 'Paid Off',     color: 'bg-gray-100 text-gray-500', icon: CheckCircle2 },
  defaulted:    { label: 'Defaulted',    color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [rescheduleLoan, setRescheduleLoan] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const pullStartY = useRef(0);

  const load = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const data = await base44.entities.LoanApplication.filter({ user_id: u.id });
    setLoans(data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Pull to refresh
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onTouchStart = (e) => { pullStartY.current = e.touches[0].clientY; };
    const onTouchEnd = async (e) => {
      const delta = e.changedTouches[0].clientY - pullStartY.current;
      if (delta > 80 && el.scrollTop === 0) {
        setIsRefreshing(true);
        await load();
        setTimeout(() => setIsRefreshing(false), 600);
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
  }, []);

  const activeLoans = loans.filter(l => ['active', 'disbursed'].includes(l.status));
  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstanding_balance || 0), 0);
  const pendingLoans = loans.filter(l => ['submitted', 'under_review', 'approved'].includes(l.status));

  return (
    <div ref={scrollRef} className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans overflow-y-auto">
      {isRefreshing && (
        <div className="flex justify-center pt-4 pb-2">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg text-sm text-gray-600 dark:text-gray-300">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Refreshing...
          </div>
        </div>
      )}
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Loans</h1>
            <p className="text-green-200 text-sm">Fast, transparent credit</p>
          </div>
          <button onClick={load} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-green-200" />
          </button>
        </div>

        {activeLoans.length > 0 && (
          <div className="bg-white/10 rounded-2xl p-4 mt-2">
            <p className="text-green-200 text-xs mb-0.5">Total Outstanding</p>
            <p className="text-3xl font-bold">UGX {(totalOutstanding / 1000000).toFixed(2)}M</p>
            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-green-200 text-xs">Active Loans</p>
                <p className="text-lg font-bold">{activeLoans.length}</p>
              </div>
              {pendingLoans.length > 0 && (
                <div>
                  <p className="text-green-200 text-xs">Pending Review</p>
                  <p className="text-lg font-bold text-amber-300">{pendingLoans.length}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Action Row */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setShowWizard(true)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#F4B400] hover:bg-yellow-500 text-[#006B3C] text-sm font-bold px-5 h-10 rounded-full shadow-sm shadow-yellow-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Apply Now
          </button>
          <Link to="/loans/statement" className="flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 h-10 rounded-full">
              <FileText className="w-4 h-4" /> Statement
            </div>
          </Link>
          <Link to="/loans/repay" className="flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-emerald-300 text-emerald-700 dark:text-emerald-400 text-sm font-medium px-4 h-10 rounded-full">
              <ArrowUpCircle className="w-4 h-4" /> Repay
            </div>
          </Link>
          <Link to="/loans/planner" className="flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-violet-200 text-violet-700 dark:text-violet-400 text-sm font-medium px-4 h-10 rounded-full">
              <TrendingDown className="w-4 h-4" /> Planner
            </div>
          </Link>
          <Link to="/ussd" className="flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium px-4 h-10 rounded-full">
              <Phone className="w-4 h-4" /> USSD
            </div>
          </Link>
        </div>

        {/* Pre-qualify Banner */}
        <Link to="/loans/pre-qualify">
          <div className="bg-gradient-to-r from-[#006B3C] to-[#7BC943] rounded-2xl p-4 flex items-center justify-between text-white shadow-md shadow-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Check Pre-Qualification</p>
                <p className="text-green-100 text-xs">Instant credit check — no impact to score</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-green-200" />
          </div>
        </Link>

        {/* Pending alert */}
        {pendingLoans.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>{pendingLoans.length} application{pendingLoans.length > 1 ? 's' : ''}</strong> under review. You'll be notified once processed.
            </p>
          </div>
        )}

        {/* Loan List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-6 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : loans.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Banknote className="w-10 h-10 text-[#7BC943]" />
            </div>
            <p className="font-semibold text-gray-700">No loans yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Apply for instant credit in minutes</p>
            <button
              onClick={() => setShowWizard(true)}
              className="bg-[#F4B400] text-[#006B3C] font-bold px-6 py-2.5 rounded-full text-sm"
            >
              Apply for a Loan
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Loan History</p>
            {loans.map(loan => {
              const cfg = STATUS_CONFIG[loan.status] || STATUS_CONFIG.draft;
              const StatusIcon = cfg.icon;
              const progress = loan.total_repayable > 0
                ? Math.min(100, ((loan.total_repayable - (loan.outstanding_balance || loan.total_repayable)) / loan.total_repayable) * 100)
                : 0;

              return (
                <div key={loan.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-xl text-gray-900 dark:text-white">
                          UGX {loan.amount_requested?.toLocaleString('en-UG', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {loan.purpose || 'Personal Loan'} · {loan.tenure_months} month{loan.tenure_months > 1 ? 's' : ''}
                        </p>
                        {loan.monthly_installment > 0 && (
                          <p className="text-xs text-[#006B3C] font-medium mt-0.5">
                            UGX {loan.monthly_installment?.toLocaleString('en-UG', { maximumFractionDigits: 0 })}/mo
                          </p>
                        )}
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Progress bar for active loans */}
                    {['active', 'disbursed'].includes(loan.status) && loan.total_repayable > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Repaid: UGX {((loan.total_repayable - (loan.outstanding_balance || loan.total_repayable)) / 1000).toFixed(0)}K</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>Outstanding: <span className="font-semibold text-red-500">UGX {((loan.outstanding_balance || 0) / 1000).toFixed(0)}K</span></span>
                          {loan.next_repayment_date && (
                            <span>Due: {new Date(loan.next_repayment_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {['active', 'disbursed'].includes(loan.status) && (
                  <div className="px-4 pb-4 space-y-2">
                    <div className="flex gap-2">
                      <Link to={`/loans/statement?loan_id=${loan.id}`} className="flex-1">
                        <button className="w-full text-xs text-[#006B3C] font-semibold h-9 rounded-xl bg-green-50 flex items-center justify-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Statement
                        </button>
                      </Link>
                      <Link to={`/loans/repay?loan_id=${loan.id}`} className="flex-1">
                        <button className="w-full text-xs text-[#006B3C] font-bold h-9 rounded-xl bg-[#F4B400] flex items-center justify-center gap-1">
                          <ArrowUpCircle className="w-3.5 h-3.5" /> Repay Now
                        </button>
                      </Link>
                    </div>
                    <button
                      onClick={() => setRescheduleLoan(loan)}
                      className="w-full text-xs text-[#006B3C] font-semibold h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center gap-1.5"
                    >
                      <CalendarClock className="w-3.5 h-3.5" /> Request Reschedule
                    </button>
                  </div>
                  )}

                  {loan.status === 'approved' && (
                    <div className="px-4 pb-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-700 font-medium text-center">
                        ✅ Approved — Disbursement in progress
                      </div>
                    </div>
                  )}

                  {loan.status === 'rejected' && loan.admin_notes && (
                    <div className="px-4 pb-4">
                      <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 text-xs text-red-600">
                        {loan.admin_notes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {rescheduleLoan && (
        <LoanRescheduleModal
          loan={rescheduleLoan}
          onClose={() => setRescheduleLoan(null)}
          onSuccess={() => { setRescheduleLoan(null); load(); }}
        />
      )}

      {showWizard && (
        <LoanApplicationWizard
          user={user}
          onClose={() => setShowWizard(false)}
          onSuccess={(loan) => {
            setShowWizard(false);
            setLoans(prev => [loan, ...prev]);
          }}
        />
      )}
    </div>
  );
}