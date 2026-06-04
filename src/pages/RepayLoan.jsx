import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, Smartphone, Calendar, Clock, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DigitalPaymentModal from '@/components/payments/DigitalPaymentModal';
import { prepaymentBreakdown } from '@/lib/finance';

export default function RepayLoan() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const loanIdParam = urlParams.get('loan_id');

  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successData, setSuccessData] = useState(null);
  const [prepayMode, setPrepayMode] = useState(false);
  const [prepayAmount, setPrepayAmount] = useState('');

  const loadRepayments = async (loanId) => {
    const reps = await base44.entities.Repayment.filter({ loan_id: loanId });
    setRepayments(reps.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
  };

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);
      const data = await base44.entities.LoanApplication.filter({ user_id: me.id });
      const active = data.filter(l => ['active', 'disbursed'].includes(l.status));
      setLoans(active);
      const target = loanIdParam ? active.find(l => l.id === loanIdParam) : active[0];
      if (target) {
        setSelectedLoan(target);
        await loadRepayments(target.id);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleLoanChange = async (id) => {
    const loan = loans.find(l => l.id === id);
    setSelectedLoan(loan);
    await loadRepayments(id);
  };

  const scheduledReps = repayments.filter(r => r.status === 'scheduled' || r.status === 'overdue');
  const paidReps = repayments.filter(r => r.status === 'paid');
  const overdueReps = repayments.filter(r => r.status === 'overdue');
  const nextDue = scheduledReps.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
  const totalOverdue = overdueReps.reduce((s, r) => s + r.amount, 0);

  const handlePaymentSuccess = async (result) => {
    setSuccessData(result);
    setShowPaymentModal(false);
    const updated = await base44.entities.LoanApplication.filter({ user_id: user.id });
    const target = updated.find(l => l.id === selectedLoan.id);
    if (target) setSelectedLoan(target);
    await loadRepayments(selectedLoan.id);
  };

  const paymentAmount = prepayMode
    ? prepaymentBreakdown(0, parseFloat(prepayAmount) || 0).totalCharged
    : (nextDue?.amount || selectedLoan?.monthly_installment || 0);

  if (successData && successData.loan_closed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Loan Fully Paid! 🎉</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">Congratulations! Your loan has been completely repaid.</p>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 w-full max-w-sm mb-6">
          <p className="text-xs text-gray-400 mb-3">Payment Receipt</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Amount</span><span className="font-bold">UGX {successData.amount_paid?.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Reference</span><span className="font-mono text-xs">{successData.txn_ref}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Balance</span><span className="font-bold text-emerald-600">Fully Cleared</span></div>
          </div>
        </div>
        <Button className="w-full max-w-sm bg-[#1a3a6b]" onClick={() => navigate('/loans')}>Back to Loans</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f2a55] to-[#1a3a6b] text-white px-4 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold">Repay Loan</h1>
        <p className="text-blue-200 text-sm">Instant mobile money repayment</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : loans.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500 dark:text-gray-400">No active loans to repay</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/loans')}>Go to Loans</Button>
          </div>
        ) : (
          <>
            {/* Loan selector */}
            {loans.length > 1 && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">Select Loan</label>
                <Select value={selectedLoan?.id} onValueChange={handleLoanChange}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {loans.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        UGX {(l.amount_requested / 1000).toFixed(0)}K · {l.purpose || 'Loan'} · Bal {((l.outstanding_balance || 0) / 1000).toFixed(0)}K
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedLoan && (
              <>
                {/* Overdue alert */}
                {totalOverdue > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700">
                      <strong>UGX {totalOverdue.toLocaleString()} overdue</strong> across {overdueReps.length} instalment{overdueReps.length > 1 ? 's' : ''}. Please pay immediately to avoid penalties.
                    </p>
                  </div>
                )}

                {/* Loan summary card */}
                <div className="bg-[#1a3a6b] rounded-2xl p-4 text-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-blue-200 text-xs">Loan Balance</p>
                      <p className="text-2xl font-bold">
                        UGX {(selectedLoan.outstanding_balance || selectedLoan.total_repayable || 0).toLocaleString('en-UG', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-blue-300 text-xs mt-0.5">{selectedLoan.purpose || 'Personal Loan'} · {selectedLoan.tenure_months} months</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-200 text-xs">Monthly</p>
                      <p className="text-lg font-bold">UGX {(selectedLoan.monthly_installment || 0).toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  {selectedLoan.total_repayable > 0 && (
                    <div>
                      <div className="h-1.5 bg-white dark:bg-gray-800/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(100, ((selectedLoan.total_repayable - (selectedLoan.outstanding_balance || selectedLoan.total_repayable)) / selectedLoan.total_repayable) * 100)}%` }}
                        />
                      </div>
                      <p className="text-blue-300 text-xs mt-1">
                        {Math.min(100, ((selectedLoan.total_repayable - (selectedLoan.outstanding_balance || selectedLoan.total_repayable)) / selectedLoan.total_repayable) * 100).toFixed(0)}% repaid
                      </p>
                    </div>
                  )}
                </div>

                {/* Next instalment */}
                {nextDue && (
                  <div className={`rounded-2xl p-3.5 flex items-center justify-between ${nextDue.status === 'overdue' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                    <div className="flex items-center gap-2.5">
                      <Calendar className={`w-4 h-4 ${nextDue.status === 'overdue' ? 'text-red-500' : 'text-amber-500'}`} />
                      <div>
                        <p className={`text-xs font-semibold ${nextDue.status === 'overdue' ? 'text-red-700' : 'text-amber-700'}`}>
                          {nextDue.status === 'overdue' ? '⚠️ Overdue Instalment' : 'Next Instalment Due'}
                        </p>
                        <p className={`text-xs ${nextDue.status === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>
                          {new Date(nextDue.due_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <p className={`text-base font-bold ${nextDue.status === 'overdue' ? 'text-red-800' : 'text-amber-800'}`}>
                      UGX {nextDue.amount.toLocaleString('en-UG', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                )}

                {/* Partial / full prepayment toggle */}
                {selectedLoan && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Payment Type</p>
                      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setPrepayMode(false)}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${!prepayMode ? 'bg-[#1a3a6b] text-white' : 'text-gray-500'}`}
                        >Next Instalment</button>
                        <button
                          onClick={() => setPrepayMode(true)}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1 ${prepayMode ? 'bg-[#1a3a6b] text-white' : 'text-gray-500'}`}
                        >
                          <Zap className="w-3 h-3" /> Prepay
                        </button>
                      </div>
                    </div>
                    {prepayMode && (() => {
                      const outstanding = selectedLoan.outstanding_balance || selectedLoan.total_repayable || 0;
                      const { amount: amt, penalty, totalCharged: totalDue, remaining: newBal } = prepaymentBreakdown(outstanding, prepayAmount);
                      return (
                        <div className="space-y-3">
                          <Input
                            type="number"
                            placeholder="Amount to prepay (UGX)"
                            value={prepayAmount}
                            onChange={e => setPrepayAmount(e.target.value)}
                            className="h-11 rounded-xl"
                          />
                          {amt > 0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1.5 text-xs">
                              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                <span>Principal prepaid</span><span className="font-semibold">UGX {amt.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-amber-700">
                                <span>Early settlement fee (2%)</span><span className="font-semibold">UGX {penalty.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-gray-900 dark:text-white font-bold border-t border-amber-200 pt-1.5">
                                <span>Total charged</span><span>UGX {totalDue.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-emerald-700">
                                <span>Remaining balance after</span><span className="font-semibold">UGX {newBal.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Pay button */}
                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={prepayMode && !parseFloat(prepayAmount)}
                  className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold rounded-2xl text-base shadow-md shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5" />
                  {prepayMode
                    ? `Prepay UGX ${(parseFloat(prepayAmount) || 0).toLocaleString()}`
                    : `Pay UGX ${(nextDue?.amount || selectedLoan?.monthly_installment || 0).toLocaleString()}`
                  }
                </button>

                {/* Repayment schedule */}
                {repayments.length > 0 && (
                  <div className="pb-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Repayment Schedule</p>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
                      {repayments.map((r, i) => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            r.status === 'paid' ? 'bg-emerald-100' : r.status === 'overdue' ? 'bg-red-100' : 'bg-gray-100'
                          }`}>
                            {r.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              : r.status === 'overdue' ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              : <Clock className="w-3.5 h-3.5 text-gray-400" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Instalment {i + 1}</p>
                            <p className="text-xs text-gray-400">
                              {r.status === 'paid' ? `Paid ${r.paid_date}` : `Due ${new Date(r.due_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            </p>
                            {r.transaction_ref && <p className="text-xs text-gray-400 font-mono">{r.transaction_ref}</p>}
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-bold ${r.status === 'paid' ? 'text-emerald-600' : r.status === 'overdue' ? 'text-red-600' : 'text-gray-700'}`}>
                              UGX {r.amount.toLocaleString('en-UG', { maximumFractionDigits: 0 })}
                            </p>
                            <span className={`text-xs font-medium ${r.status === 'paid' ? 'text-emerald-500' : r.status === 'overdue' ? 'text-red-500' : 'text-gray-400'}`}>
                              {r.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {showPaymentModal && selectedLoan && (
        <DigitalPaymentModal
          paymentContext={{
            type: 'loan',
            id: selectedLoan.id,
            amount: paymentAmount,
            label: `Loan Repayment — ${selectedLoan.purpose || 'Personal Loan'}`,
          }}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}