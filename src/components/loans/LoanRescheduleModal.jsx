import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Calendar, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TENURE_OPTIONS = [3, 6, 9, 12, 18, 24, 36];

function calcInstallment(balance, interestRate, months) {
  const r = (interestRate || 5) / 100;
  if (r === 0) return balance / months;
  return (balance * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export default function LoanRescheduleModal({ loan, onClose, onSuccess }) {
  const [tenure, setTenure] = useState(loan.tenure_months + 6 > 36 ? 36 : loan.tenure_months + 6);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const balance = loan.outstanding_balance || loan.total_repayable || loan.amount_requested;
  const interestRate = loan.interest_rate || 5;

  const proposed = useMemo(() => {
    const monthly = calcInstallment(balance, interestRate, tenure);
    return {
      monthly: Math.round(monthly),
      total: Math.round(monthly * tenure),
    };
  }, [balance, interestRate, tenure]);

  const saving = proposed.monthly < (loan.monthly_installment || 0)
    ? (loan.monthly_installment - proposed.monthly)
    : null;

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('Please provide a reason for the reschedule.'); return; }
    setError('');
    setLoading(true);
    await base44.functions.invoke('requestLoanReschedule', {
      loan_id: loan.id,
      requested_tenure_months: tenure,
      reason,
    });
    setDone(true);
    setLoading(false);
    onSuccess?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white rounded-t-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-base">Request Loan Reschedule</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {done ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="font-bold text-gray-900">Request Submitted!</p>
            <p className="text-sm text-gray-500">Your reschedule request is under admin review. You'll be notified once a decision is made.</p>
            <Button onClick={onClose} className="w-full bg-[#1a3a6b] text-white mt-2">Close</Button>
          </div>
        ) : (
          <>
            {/* Current Loan Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current Loan Terms</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Outstanding Balance</span>
                <span className="font-bold text-gray-900">UGX {balance?.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Monthly</span>
                <span className="font-semibold text-gray-700">UGX {loan.monthly_installment?.toLocaleString('en-UG', { maximumFractionDigits: 0 })}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Remaining Tenure</span>
                <span className="font-semibold text-gray-700">{loan.tenure_months} months</span>
              </div>
            </div>

            {/* Tenure Selector */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Proposed New Tenure</p>
              <div className="grid grid-cols-4 gap-2">
                {TENURE_OPTIONS.filter(t => t > (loan.tenure_months || 0)).map(t => (
                  <button
                    key={t}
                    onClick={() => setTenure(t)}
                    className={`py-2 rounded-xl text-sm font-semibold border transition-all ${
                      tenure === t
                        ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a3a6b]'
                    }`}
                  >
                    {t}m
                  </button>
                ))}
              </div>
            </div>

            {/* New Terms Preview */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">New Proposed Terms</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">New Monthly Payment</span>
                <span className="text-xl font-bold text-[#1a3a6b]">UGX {proposed.monthly.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">Total Repayable</span>
                <span className="font-semibold text-blue-800">UGX {proposed.total.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
              </div>
              {saving > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-1">
                  <TrendingDown className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 font-medium">
                    Monthly savings of UGX {saving.toLocaleString('en-UG', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Reason for Reschedule *</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1a3a6b]"
                rows={3}
                placeholder="e.g. Job loss, medical emergency, reduced income..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
              {error && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5" /> {error}
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              ⚠️ Rescheduling increases total interest paid. An admin will review your request within 1-2 business days.
            </div>

            <Button
              className="w-full bg-[#1a3a6b] text-white h-12 font-bold text-sm"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Reschedule Request'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}