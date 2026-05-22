import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, Smartphone, Building2, Wallet, Calendar, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MobileMoneyModal from '@/components/loans/MobileMoneyModal';

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone, sub: 'MTN / Airtel Push', highlight: true },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2, sub: 'Any bank' },
  { value: 'wallet', label: 'OpFin Wallet', icon: Wallet, sub: 'Instant debit' },
  { value: 'cash', label: 'Cash (Agent)', icon: CreditCard, sub: 'Visit agent' },
];

export default function RepayLoan() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const loanIdParam = urlParams.get('loan_id');

  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successData, setSuccessData] = useState(null);

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
    setShowMobileMoneyModal(false);
    // Refresh loan data
    const updated = await base44.entities.LoanApplication.filter({ user_id: user.id });
    const target = updated.find(l => l.id === selectedLoan.id);
    if (target) setSelectedLoan(target);
    await loadRepayments(selectedLoan.id);
  };

  const handleNonMMPayment = async () => {
    if (!selectedLoan) return;
    const today = new Date().toISOString().split('T')[0];
    const payAmount = nextDue?.amount || selectedLoan.monthly_installment;
    const txnRef = `TXN-${Date.now()}`;

    if (nextDue) {
      await base44.entities.Repayment.update(nextDue.id, {
        status: 'paid', paid_date: today, payment_method: paymentMethod, transaction_ref: txnRef,
      });
    }
    const newBalance = Math.max(0, (selectedLoan.outstanding_balance || 0) - payAmount);
    await base44.entities.LoanApplication.update(selectedLoan.id, {
      outstanding_balance: newBalance,
      status: newBalance <= 0 ? 'closed' : selectedLoan.status,
    });
    setSuccessData({ amount_paid: payAmount, txn_ref: txnRef, new_balance: newBalance, loan_closed: newBalance <= 0 });
    const updated = await base44.entities.LoanApplication.filter({ user_id: user.id });
    const target = updated.find(l => l.id === selectedLoan.id);
    if (target) setSelectedLoan(target);
    await loadRepayments(selectedLoan.id);
  };

  if (successData && successData.loan_closed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Loan Fully Paid! 🎉</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Congratulations! Your loan has been completely repaid.</p>
        <div className="bg-white rounded-2xl shadow-sm p-5 w-full max-w-sm mb-6">
          <p className="text-xs text-gray-400 mb-3">Payment Receipt</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-bold">UGX {successData.amount_paid?.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-mono text-xs">{successData.txn_ref}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className="font-bold text-emerald-600">Fully Cleared</span></div>
          </div>
        </div>
        <Button className="w-full max-w-sm bg-[#1a3a6b]" onClick={() => navigate('/loans')}>Back to Loans</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
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
            {[1, 2].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : loans.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No active loans to repay</p>
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
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
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

                {/* Payment method selector */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map(m => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.value}
                          onClick={() => setPaymentMethod(m.value)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                            paymentMethod === m.value
                              ? 'border-[#1a3a6b] bg-[#1a3a6b]/5'
                              : 'border-gray-100 bg-white'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${paymentMethod === m.value ? 'bg-[#1a3a6b]' : 'bg-gray-100'}`}>
                            <Icon className={`w-4 h-4 ${paymentMethod === m.value ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${paymentMethod === m.value ? 'text-[#1a3a6b]' : 'text-gray-700'}`}>{m.label}</p>
                            <p className="text-xs text-gray-400">{m.sub}</p>
                          </div>
                          {m.highlight && <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">Fast</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pay button */}
                {paymentMethod === 'mobile_money' ? (
                  <button
                    onClick={() => setShowMobileMoneyModal(true)}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold rounded-2xl text-base shadow-md shadow-orange-100 flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-5 h-5" />
                    Pay via Mobile Money
                  </button>
                ) : (
                  <button
                    onClick={handleNonMMPayment}
                    className="w-full h-14 bg-[#1a3a6b] text-white font-bold rounded-2xl text-base"
                  >
                    Record Payment — UGX {(nextDue?.amount || selectedLoan?.monthly_installment || 0).toLocaleString()}
                  </button>
                )}

                {/* Repayment schedule */}
                {repayments.length > 0 && (
                  <div className="pb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Repayment Schedule</p>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
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
                            <p className="text-xs font-medium text-gray-700">Instalment {i + 1}</p>
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

      {showMobileMoneyModal && selectedLoan && (
        <MobileMoneyModal
          loan={selectedLoan}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowMobileMoneyModal(false)}
        />
      )}
    </div>
  );
}