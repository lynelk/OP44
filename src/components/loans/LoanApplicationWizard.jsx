import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, ChevronRight, ChevronLeft, Zap, Calculator, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoanCostBreakdown, { calcLoanCosts } from '@/components/loans/LoanCostBreakdown';
import KYCDocumentUploader from '@/components/loans/KYCDocumentUploader';

const PURPOSES = ['Emergency', 'School Fees', 'Business', 'Medical', 'Daily Expenses', 'Asset Acquisition', 'Agriculture', 'Rent'];
const STEPS = ['amount', 'purpose', 'documents', 'review', 'submit'];

export default function LoanApplicationWizard({ onClose, onSuccess, user }) {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('3');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preQual, setPreQual] = useState(null);
  const [loadingPreQual, setLoadingPreQual] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const costs = calcLoanCosts(amount, tenure);
  const [extractedDocData, setExtractedDocData] = useState({});
  const [draftId, setDraftId] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [resumedDraft, setResumedDraft] = useState(false);

  useEffect(() => {
    setLoadingPreQual(true);
    base44.functions.invoke('loanPreQualifier', { user_id: user?.id })
      .then(r => setPreQual(r.data))
      .finally(() => setLoadingPreQual(false));
  }, []);

  // Resume an in-progress draft if one exists for this user.
  useEffect(() => {
    if (!user?.id) return;
    base44.entities.LoanApplication.filter({ user_id: user.id, status: 'draft' })
      .then((drafts) => {
        const draft = (drafts || []).sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0))[0];
        if (!draft) return;
        setDraftId(draft.id);
        if (draft.amount_requested) setAmount(String(draft.amount_requested));
        if (draft.tenure_months) setTenure(String(draft.tenure_months));
        if (draft.purpose) setPurpose(draft.purpose);
        if (Number.isInteger(draft.draft_step)) setStep(Math.min(draft.draft_step, STEPS.length - 1));
        setResumedDraft(true);
      })
      .catch(() => {});
  }, [user?.id]);

  // Persist the current wizard state as a draft so the user can resume later.
  const saveDraft = async (nextStep) => {
    if (!user?.id || submitted) return;
    setSavingDraft(true);
    const payload = {
      user_id: user.id,
      amount_requested: amountNum || undefined,
      tenure_months: parseInt(tenure) || undefined,
      purpose: purpose || undefined,
      status: 'draft',
      draft_step: nextStep,
    };
    try {
      if (draftId) {
        await base44.entities.LoanApplication.update(draftId, payload);
      } else {
        const created = await base44.entities.LoanApplication.create(payload);
        setDraftId(created.id);
      }
    } catch (e) {
      console.error('Failed to save loan draft:', e);
    } finally {
      setSavingDraft(false);
    }
  };

  const goToStep = (nextStep) => {
    setStep(nextStep);
    // Fire-and-forget; advancing forward checkpoints progress.
    if (nextStep > step) saveDraft(nextStep);
  };

  const maxAmount = preQual?.max_loan_limit || 2000000;
  const amountNum = parseFloat(amount) || 0;
  const amountValid = amountNum >= 50000 && amountNum <= maxAmount;

  const [autoApproved, setAutoApproved] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);

    // Check if the requested product qualifies for auto-approval
    const eligibleProduct = preQual?.eligible_products?.find(p =>
      p.auto_approve_eligible &&
      amountNum <= (p.auto_approve_max_amount || Infinity) &&
      parseInt(tenure) <= (p.auto_approve_max_tenure_months || Infinity)
    );

    const initialStatus = eligibleProduct ? 'approved' : 'submitted';

    const payload = {
      user_id: user?.id,
      amount_requested: amountNum,
      tenure_months: parseInt(tenure),
      purpose,
      status: initialStatus,
      draft_step: null,
      risk_band: preQual?.final_risk_band || 'C',
      risk_band_at_application: preQual?.final_risk_band || 'C',
      credit_score_at_application: preQual?.credit_score || null,
      monthly_installment: costs.monthly,
      total_repayable: costs.totalRepayable,
      disbursement_fee: costs.disbursementFee,
      insurance_cost: costs.insuranceCost,
      net_disbursement: costs.netDisbursement,
      outstanding_balance: costs.totalRepayable,
    };

    // Promote the existing draft into a real submission, or create fresh.
    const loan = draftId
      ? await base44.entities.LoanApplication.update(draftId, payload)
      : await base44.entities.LoanApplication.create(payload);

    // If auto-approved, immediately trigger disbursement
    if (eligibleProduct) {
      setAutoApproved(true);
      await base44.functions.invoke('disburseLoan', { loan_id: loan.id, action: 'disburse' });
    }

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => onSuccess(loan), 2500);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm">
          <div className={`w-20 h-20 ${autoApproved ? 'bg-orange-100' : 'bg-emerald-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <CheckCircle2 className={`w-10 h-10 ${autoApproved ? 'text-orange-500' : 'text-emerald-500'}`} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {autoApproved ? '⚡ Instantly Approved!' : 'Application Submitted!'}
          </h2>
          <p className="text-sm text-gray-500 mb-2">UGX {amountNum.toLocaleString()} for {tenure} months</p>
          <p className="text-xs text-gray-400">
            {autoApproved
              ? 'Your loan has been approved and is being disbursed to your mobile money account.'
              : 'Under review — you\'ll be notified shortly'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Handle + header */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900">
              {['Loan Amount', 'Purpose & Terms', 'Documents', 'Review Offer', 'Submit'][step]}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div key={i} className={`w-5 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-[#1a3a6b]' : 'bg-gray-200'}`} />
              ))}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          {/* Step 0: Amount */}
          {step === 0 && (
            <div className="space-y-4">
              {/* Pre-qual banner */}
              {loadingPreQual ? (
                <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-xs text-blue-600">Checking pre-qualification...</span>
                </div>
              ) : preQual ? (
                <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Pre-Qualified</span>
                  </div>
                  <p className="text-2xl font-bold">UGX {(maxAmount / 1000000).toFixed(1)}M</p>
                  <p className="text-orange-100 text-xs mt-0.5">
                    Risk Band {preQual.risk_band} · {preQual.credit_score || '--'} credit score
                  </p>
                </div>
              ) : null}

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">How much do you need? (UGX)</label>
                <Input
                  type="number"
                  placeholder="e.g. 500,000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="h-14 text-xl font-bold rounded-xl"
                />
                {amount && !amountValid && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {amountNum < 50000 ? 'Minimum is UGX 50,000' : `Max pre-qualified: UGX ${maxAmount.toLocaleString()}`}
                  </p>
                )}
              </div>

              {/* Quick amount chips */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Quick select</p>
                <div className="grid grid-cols-3 gap-2">
                  {[100000, 250000, 500000, 1000000, 1500000, maxAmount].map(v => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        parseFloat(amount) === v
                          ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-[#1a3a6b]'
                      }`}
                    >
                      {v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`}
                    </button>
                  ))}
                </div>
              </div>

              {resumedDraft && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  We saved your progress — you can pick up right where you left off.
                </div>
              )}

              <button
                disabled={!amountValid}
                onClick={() => goToStep(1)}
                className="w-full h-12 bg-[#1a3a6b] disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Purpose & Tenure */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Repayment Period</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['1','1 Mo'],['2','2 Mo'],['3','3 Mo'],['6','6 Mo'],['9','9 Mo'],['12','12 Mo']].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setTenure(v)}
                      className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                        tenure === v ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#1a3a6b]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Loan Purpose</label>
                <div className="grid grid-cols-2 gap-2">
                  {PURPOSES.map(p => (
                    <button
                      key={p}
                      onClick={() => setPurpose(p)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium border text-left transition-all ${
                        purpose === p ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!purpose}
                onClick={() => goToStep(2)}
                className="w-full h-12 bg-[#1a3a6b] disabled:opacity-40 text-white font-bold rounded-xl"
              >
                Next: Documents →
              </button>
            </div>
          )}

          {/* Step 2: KYC Documents */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-3">
                📎 Upload your documents to speed up approval. Our AI will auto-read key information.
              </p>
              <KYCDocumentUploader
                userId={user?.id}
                onExtracted={(type, data) => setExtractedDocData(p => ({ ...p, [type]: data }))}
              />
              <button
                onClick={() => goToStep(3)}
                className="w-full h-12 bg-[#1a3a6b] text-white font-bold rounded-xl"
              >
                See Offer →
              </button>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#0f2a55] to-[#1e4480] rounded-2xl p-5 text-white">
                <p className="text-blue-200 text-xs mb-1">Your Offer</p>
                <p className="text-3xl font-bold mb-0.5">UGX {amountNum.toLocaleString()}</p>
                <p className="text-blue-200 text-sm">{purpose} · {tenure} months</p>
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-blue-300 text-xs">Monthly Payment</p>
                    <p className="text-lg font-bold">UGX {costs.monthly.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-xs">You Receive</p>
                    <p className="text-lg font-bold">UGX {costs.netDisbursement.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </div>

              <LoanCostBreakdown amount={amount} tenure={tenure} />

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                ⚠️ Disbursement fee (3%) and insurance (1%) are deducted from the loan amount upfront.
              </div>

              <button
                onClick={() => goToStep(4)}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
              >
                Accept & Apply
              </button>
            </div>
          )}

          {/* Step 4: Final submit */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Calculator className="w-8 h-8 text-[#1a3a6b]" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Ready to Submit</h3>
                <p className="text-xs text-gray-500 mt-1">Your application will be reviewed within minutes</p>
              </div>

              <div className="space-y-2 bg-gray-50 rounded-2xl p-4 text-sm">
                {[
                  ['Amount', `UGX ${amountNum.toLocaleString()}`],
                  ['Purpose', purpose],
                  ['Tenure', `${tenure} months`],
                  ['Monthly Instalment', `UGX ${costs.monthly.toLocaleString('en-UG', { maximumFractionDigits: 0 })}`],
                  ['Total Repayable', `UGX ${costs.totalRepayable.toLocaleString('en-UG', { maximumFractionDigits: 0 })}`],
                  ['Net Disbursement', `UGX ${costs.netDisbursement.toLocaleString('en-UG', { maximumFractionDigits: 0 })}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-center text-gray-400">
                By submitting, you agree to our lending terms and authorize credit checks.
              </p>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-12 bg-[#1a3a6b] disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : '🚀 Submit Application'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}