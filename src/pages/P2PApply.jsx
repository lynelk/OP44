import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calculator, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoanDocumentUploader from '@/components/loans/LoanDocumentUploader';
import LoyaltyPointsToggle from '@/components/loans/LoyaltyPointsToggle';

const PURPOSES = [
  { value: 'business', label: '🏪 Business / Trade' },
  { value: 'education', label: '📚 Education' },
  { value: 'medical', label: '🏥 Medical' },
  { value: 'agriculture', label: '🌾 Agriculture' },
  { value: 'housing', label: '🏠 Housing' },
  { value: 'personal', label: '💼 Personal' },
  { value: 'other', label: '📦 Other' },
];

export default function P2PApply() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ amount: '', tenure_months: '3', purpose: '', purpose_category: 'personal', description: '' });
  const [docs, setDocs] = useState({});
  const [applyPoints, setApplyPoints] = useState(false);
  const [scoring, setScoring] = useState(null);
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setOffer(null); };

  useEffect(() => {
    base44.functions.invoke('p2pEngine', { action: 'score_borrower' }).then(r => setScoring(r.data));
  }, []);

  const calculate = async () => {
    if (!form.amount || !form.tenure_months) return;
    setLoading(true);
    setError('');
    const res = await base44.functions.invoke('p2pEngine', {
      action: 'apply_loan',
      amount: parseFloat(form.amount),
      tenure_months: parseInt(form.tenure_months),
      purpose: form.purpose || 'General',
      purpose_category: form.purpose_category,
      description: form.description,
      _preview_only: true
    });
    setLoading(false);
    if (res.data?.error) { setError(res.data.error); return; }
    setOffer(res.data);
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    const res = await base44.functions.invoke('p2pEngine', {
      action: 'apply_loan',
      amount: parseFloat(form.amount),
      tenure_months: parseInt(form.tenure_months),
      purpose: form.purpose || 'General',
      purpose_category: form.purpose_category,
      description: form.description,
      payslip_urls: docs.payslip_urls || [],
      national_id_urls: docs.national_id_urls || [],
      bank_statement_urls: docs.bank_statement_urls || [],
      apply_loyalty_points: applyPoints,
    });
    setSubmitting(false);
    if (res.data?.error) { setError(res.data.error); return; }
    setSuccess(res.data);
  };

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Application Submitted!</h2>
      <p className="text-sm text-gray-500 mb-2">Ref: <strong>{success.loan?.loan_ref}</strong></p>
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm text-left space-y-2 shadow-sm mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Amount</span>
          <span className="font-bold">UGX {success.loan?.amount_approved?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Monthly Payment</span>
          <span className="font-bold text-orange-600">UGX {success.offer?.monthly_installment?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Repayable</span>
          <span className="font-bold">UGX {success.offer?.total_repayable?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Interest Rate</span>
          <span className="font-bold">{success.rates?.final_interest_rate?.toFixed(1)}%/month</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Net Disbursement</span>
          <span className="font-bold text-emerald-600">UGX {success.offer?.net_disbursement?.toLocaleString()}</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-6">Your application is under review. Lenders will fund it on the marketplace.</p>
      <Button onClick={() => navigate('/p2p')} className="w-full max-w-sm">Go to P2P Dashboard</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10 font-sans">
      <div className="bg-gradient-to-br from-[#0f2a55] to-[#1e4480] text-white px-5 pt-12 pb-6">
        <button onClick={() => navigate('/p2p')} className="flex items-center gap-1 text-blue-300 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-black">Apply for P2P Loan</h1>
        {scoring && (
          <div className="mt-2 flex gap-3 text-sm">
            <span className="text-blue-300">Limit: <strong className="text-white">UGX {scoring.max_loan_limit?.toLocaleString()}</strong></span>
            <span className="text-blue-300">Rate: <strong className="text-white">{scoring.rates?.final_interest_rate?.toFixed(1)}%/mo</strong></span>
          </div>
        )}
      </div>

      <div className="px-4 mt-5 max-w-md mx-auto space-y-4">
        {!scoring?.is_eligible && scoring && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">Your credit score does not currently qualify for P2P lending. Improve your score and try again.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Loan Amount (UGX) *</label>
            <Input
              type="number"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="e.g. 1000000"
              className="text-base"
            />
            {scoring?.max_loan_limit && (
              <p className="text-xs text-gray-400 mt-1">Max: UGX {scoring.max_loan_limit?.toLocaleString()}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Repayment Period *</label>
            <Select value={form.tenure_months} onValueChange={v => set('tenure_months', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 6, 9, 12, 18, 24].map(m => (
                  <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Loan Purpose *</label>
            <Select value={form.purpose_category} onValueChange={v => set('purpose_category', v)}>
              <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
              <SelectContent>
                {PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Brief Description</label>
            <Input value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="e.g. Stock for my hardware shop" />
          </div>
        </div>

        {/* Document Uploads */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <LoanDocumentUploader value={docs} onChange={setDocs} />
        </div>

        {/* Loyalty Points Toggle */}
        {form.amount && parseFloat(form.amount) > 0 && (
          <LoyaltyPointsToggle
            loanAmount={parseFloat(form.amount)}
            enabled={applyPoints}
            onToggle={setApplyPoints}
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {offer && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-600" />
              <p className="font-bold text-blue-800 text-sm">Loan Offer Summary</p>
            </div>
            {[
              ['Monthly Payment', `UGX ${offer.offer?.monthly_installment?.toLocaleString()}`],
              ['Total Repayable', `UGX ${offer.offer?.total_repayable?.toLocaleString()}`],
              ['Interest Rate', `${offer.rates?.final_interest_rate?.toFixed(1)}%/month`],
              ['Origination Fee', `UGX ${offer.offer?.origination_fee?.toLocaleString()}`],
              ['Insurance', `UGX ${offer.offer?.insurance_cost?.toLocaleString()}`],
              ['Net Disbursement', `UGX ${offer.offer?.net_disbursement?.toLocaleString()}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-600">{k}</span>
                <span className="font-bold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={calculate} disabled={!form.amount || loading} className="flex-1 gap-2">
            <Calculator className="w-4 h-4" /> {loading ? 'Calculating...' : 'Calculate'}
          </Button>
          <Button
            onClick={submit}
            disabled={!offer || submitting || !scoring?.is_eligible}
            className="flex-1 bg-orange-500 hover:bg-orange-600 font-bold"
          >
            {submitting ? 'Submitting...' : 'Apply Now'}
          </Button>
        </div>

        <p className="text-xs text-gray-400 text-center">By applying you agree to P2P lending terms. Your loan will be listed for funding.</p>
      </div>
    </div>
  );
}