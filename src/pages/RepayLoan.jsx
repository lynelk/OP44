import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle, CreditCard, Smartphone, Building2, Wallet } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone, sub: 'MTN, Airtel' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2, sub: 'Any bank' },
  { value: 'wallet', label: 'OpFin Wallet', icon: Wallet, sub: 'Instant' },
  { value: 'cash', label: 'Cash (Agent)', icon: CreditCard, sub: 'Visit agent' },
];

export default function RepayLoan() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const loanIdParam = urlParams.get('loan_id');

  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [transactionRef, setTransactionRef] = useState('');
  const [step, setStep] = useState('form'); // form | confirm | success
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

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
        const reps = await base44.entities.Repayment.filter({ loan_id: target.id });
        const nextDue = reps.filter(r => r.status === 'scheduled' || r.status === 'overdue')
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
        if (nextDue) setAmount(String(nextDue.amount));
        setRepayments(reps);
      }
    };
    load();
  }, []);

  const nextDueRepayment = repayments
    .filter(r => r.status === 'scheduled' || r.status === 'overdue')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

  const overdueTotal = repayments
    .filter(r => r.status === 'overdue')
    .reduce((s, r) => s + r.amount, 0);

  const handleConfirm = async () => {
    setSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const payAmount = parseFloat(amount);

    // Mark next due repayment as paid
    if (nextDueRepayment) {
      await base44.entities.Repayment.update(nextDueRepayment.id, {
        status: 'paid',
        paid_date: today,
        payment_method: paymentMethod,
        transaction_ref: transactionRef || `TXN-${Date.now()}`,
      });
    }

    // Create repayment record if no schedule exists
    if (!nextDueRepayment) {
      await base44.entities.Repayment.create({
        loan_id: selectedLoan.id,
        user_id: user.id,
        amount: payAmount,
        due_date: today,
        paid_date: today,
        status: 'paid',
        payment_method: paymentMethod,
        transaction_ref: transactionRef || `TXN-${Date.now()}`,
      });
    }

    // Update outstanding balance on loan
    const newBalance = Math.max(0, (selectedLoan.outstanding_balance || selectedLoan.total_repayable || 0) - payAmount);
    await base44.entities.LoanApplication.update(selectedLoan.id, {
      outstanding_balance: newBalance,
      status: newBalance <= 0 ? 'closed' : selectedLoan.status,
    });

    setSubmitting(false);
    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Payment Recorded!</h2>
        <p className="text-slate-500 text-sm text-center mb-2">
          UGX {parseFloat(amount).toLocaleString()} via {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}
        </p>
        {transactionRef && <p className="text-xs text-slate-400 mb-6">Ref: {transactionRef}</p>}
        <div className="w-full space-y-2">
          <Button className="w-full bg-[#1a3a6b]" onClick={() => navigate('/loans/statement')}>View Statement</Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/loans')}>Back to Loans</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold">Repay Loan</h1>
        <p className="text-blue-200 text-sm">Record your loan repayment</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Loan selector */}
        {loans.length > 1 && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Select Loan</label>
            <Select value={selectedLoan?.id} onValueChange={id => setSelectedLoan(loans.find(l => l.id === id))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {loans.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    UGX {(l.amount_requested / 1000).toFixed(0)}K · {l.purpose || 'Loan'} · bal {((l.outstanding_balance || 0) / 1000).toFixed(0)}K
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedLoan && (
          <>
            {/* Loan summary */}
            <Card className="border-0 bg-[#1a3a6b]/5 border-l-4 border-l-[#1a3a6b]">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{selectedLoan.purpose || 'Personal Loan'}</p>
                    <p className="text-xs text-slate-400">{selectedLoan.tenure_months} months · {selectedLoan.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Outstanding</p>
                    <p className="text-lg font-bold text-red-600">
                      UGX {((selectedLoan.outstanding_balance || selectedLoan.total_repayable || 0)).toLocaleString('en-UG', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
                {overdueTotal > 0 && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                    ⚠️ UGX {overdueTotal.toLocaleString()} overdue — please pay immediately
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next installment */}
            {nextDueRepayment && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-amber-700">Next Instalment Due</p>
                    <p className="text-xs text-amber-600">{new Date(nextDueRepayment.due_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <p className="text-base font-bold text-amber-800">UGX {nextDueRepayment.amount.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                </CardContent>
              </Card>
            )}

            {step === 'form' ? (
              <div className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Amount to Pay (UGX)</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="text-lg font-semibold"
                  />
                </div>

                {/* Quick amounts */}
                {nextDueRepayment && (
                  <div className="flex gap-2">
                    {[nextDueRepayment.amount, nextDueRepayment.amount * 2, selectedLoan.outstanding_balance || 0].filter(Boolean).map((val, i) => (
                      <button
                        key={i}
                        onClick={() => setAmount(String(val))}
                        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg py-2 text-slate-600 hover:border-[#1a3a6b] hover:text-[#1a3a6b] transition-colors"
                      >
                        {i === 0 ? '1 Inst.' : i === 1 ? '2 Inst.' : 'Full'}<br />
                        <span className="font-semibold">{(val / 1000).toFixed(0)}K</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Payment method */}
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map(m => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.value}
                          onClick={() => setPaymentMethod(m.value)}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                            paymentMethod === m.value ? 'border-[#1a3a6b] bg-[#1a3a6b]/5' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${paymentMethod === m.value ? 'text-[#1a3a6b]' : 'text-slate-400'}`} />
                          <div>
                            <p className={`text-xs font-medium ${paymentMethod === m.value ? 'text-[#1a3a6b]' : 'text-slate-600'}`}>{m.label}</p>
                            <p className="text-xs text-slate-400">{m.sub}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Transaction ref (optional) */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Transaction Reference (optional)</label>
                  <Input
                    placeholder="e.g. MTN confirmation code"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full bg-[#f97316] hover:bg-orange-600 text-white h-12 text-base"
                  disabled={!amount || parseFloat(amount) <= 0}
                  onClick={() => setStep('confirm')}
                >
                  Continue — UGX {amount ? parseFloat(amount).toLocaleString() : '0'}
                </Button>
              </div>
            ) : (
              /* Confirm step */
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold text-slate-800">Confirm Payment</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Amount</span>
                      <span className="font-semibold">UGX {parseFloat(amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Method</span>
                      <span className="font-semibold">{PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Loan</span>
                      <span className="font-semibold">{selectedLoan.purpose || 'Personal Loan'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Balance After</span>
                      <span className="font-semibold text-emerald-600">
                        UGX {Math.max(0, (selectedLoan.outstanding_balance || selectedLoan.total_repayable || 0) - parseFloat(amount)).toLocaleString('en-UG', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>Edit</Button>
                    <Button className="flex-1 bg-[#1a3a6b]" disabled={submitting} onClick={handleConfirm}>
                      {submitting ? 'Processing...' : 'Confirm'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {loans.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No active loans to repay</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/loans')}>Go to Loans</Button>
          </div>
        )}
      </div>
    </div>
  );
}