import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, CheckCircle, Clock, AlertTriangle, CreditCard } from 'lucide-react';

const STATUS_CONFIG = {
  draft:        { label: 'Draft',        color: 'bg-gray-100 text-gray-600' },
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-600' },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-600' },
  approved:     { label: 'Approved',     color: 'bg-green-100 text-green-600' },
  rejected:     { label: 'Rejected',     color: 'bg-red-100 text-red-600' },
  disbursed:    { label: 'Disbursed',    color: 'bg-emerald-100 text-emerald-600' },
  active:       { label: 'Active',       color: 'bg-blue-100 text-blue-600' },
  closed:       { label: 'Closed',       color: 'bg-gray-100 text-gray-600' },
  defaulted:    { label: 'Defaulted',    color: 'bg-red-100 text-red-700' },
};

const REPAYMENT_STATUS = {
  scheduled: { icon: Clock,         color: 'text-slate-400', bg: 'bg-slate-50' },
  paid:      { icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-50' },
  overdue:   { icon: AlertTriangle, color: 'text-red-500',  bg: 'bg-red-50' },
  waived:    { icon: CheckCircle,   color: 'text-blue-400', bg: 'bg-blue-50' },
};

export default function LoanStatement() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReps, setLoadingReps] = useState(false);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      const data = await base44.entities.LoanApplication.filter({ user_id: me.id });
      const sorted = data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setLoans(sorted);
      // Auto-select first active/disbursed loan
      const active = sorted.find(l => ['active', 'disbursed'].includes(l.status)) || sorted[0];
      if (active) selectLoan(active);
      setLoading(false);
    };
    load();
  }, []);

  const selectLoan = async (loan) => {
    setSelectedLoan(loan);
    setLoadingReps(true);
    const reps = await base44.entities.Repayment.filter({ loan_id: loan.id });
    setRepayments(reps.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
    setLoadingReps(false);
  };

  const paidAmount = repayments.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const overdueReps = repayments.filter(r => r.status === 'overdue');
  const progressPct = selectedLoan?.total_repayable > 0
    ? Math.min(100, Math.round((paidAmount / selectedLoan.total_repayable) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <button onClick={() => navigate('/loans')} className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Loans
        </button>
        <h1 className="text-xl font-bold">Loan Statement</h1>
        <p className="text-blue-200 text-sm">Full repayment history & schedule</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center h-32 items-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : loans.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No loans yet</p>
          </div>
        ) : (
          <>
            {/* Loan selector (if multiple) */}
            {loans.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {loans.map(loan => (
                  <button
                    key={loan.id}
                    onClick={() => selectLoan(loan)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      selectedLoan?.id === loan.id
                        ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    UGX {((loan.amount_requested || 0) / 1000).toFixed(0)}K · {loan.status}
                  </button>
                ))}
              </div>
            )}

            {selectedLoan && (
              <>
                {/* Loan summary card */}
                <Card className="border-0 shadow-md bg-white">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-2xl font-bold text-slate-800">
                          UGX {(selectedLoan.amount_requested || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400">{selectedLoan.purpose || 'Personal Loan'} · {selectedLoan.tenure_months} months</p>
                      </div>
                      <Badge className={STATUS_CONFIG[selectedLoan.status]?.color}>{STATUS_CONFIG[selectedLoan.status]?.label}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-400">Monthly</p>
                        <p className="font-bold text-slate-700">UGX {((selectedLoan.monthly_installment || 0)).toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-400">Total Due</p>
                        <p className="font-bold text-slate-700">UGX {((selectedLoan.total_repayable || 0)).toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-400">Outstanding</p>
                        <p className="font-bold text-red-600">UGX {((selectedLoan.outstanding_balance || 0)).toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {selectedLoan.total_repayable > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Repaid: UGX {paidAmount.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                    )}

                    {overdueReps.length > 0 && (
                      <div className="flex items-center gap-2 bg-red-50 rounded-lg p-2 text-xs text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {overdueReps.length} overdue payment{overdueReps.length > 1 ? 's' : ''} — please repay to avoid penalties
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Repayment schedule */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Repayment Schedule</p>
                  {loadingReps ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                    </div>
                  ) : repayments.length === 0 ? (
                    <Card>
                      <CardContent className="p-4 text-center text-slate-400 text-sm">
                        No repayment schedule generated yet
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {repayments.map((rep, idx) => {
                        const cfg = REPAYMENT_STATUS[rep.status] || REPAYMENT_STATUS.scheduled;
                        const Icon = cfg.icon;
                        return (
                          <Card key={rep.id} className={`border-0 ${cfg.bg}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">Instalment {idx + 1}</p>
                                    <p className="text-xs text-slate-400">Due: {new Date(rep.due_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    {rep.paid_date && (
                                      <p className="text-xs text-emerald-600">Paid: {new Date(rep.paid_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-slate-800">UGX {rep.amount.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                                  <p className={`text-xs capitalize ${cfg.color}`}>{rep.status}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* CTA */}
                {['active', 'disbursed'].includes(selectedLoan.status) && (
                  <Button
                    className="w-full bg-[#f97316] hover:bg-orange-600 text-white"
                    onClick={() => navigate(`/loans/repay?loan_id=${selectedLoan.id}`)}
                  >
                    Make a Repayment
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}