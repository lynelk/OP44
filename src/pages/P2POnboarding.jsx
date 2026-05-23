import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, User, Briefcase, Wallet, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STEPS = [
  { id: 'type', label: 'Account Type', icon: User },
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'financial', label: 'Financials', icon: Wallet },
  { id: 'verify', label: 'Verification', icon: ShieldCheck },
];

const TIER_COLORS = {
  platinum: 'bg-slate-800 text-white',
  gold: 'bg-yellow-500 text-white',
  silver: 'bg-gray-400 text-white',
  bronze: 'bg-orange-700 text-white',
  restricted: 'bg-red-500 text-white',
};

export default function P2POnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [scoring, setScoring] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    account_type: '', national_id: '', phone_number: '', date_of_birth: '',
    gender: '', address: '', district: '', employment_status: '', employer_name: '',
    job_title: '', monthly_income: '', income_source: '', mobile_money_provider: '',
    mobile_money_account: '', bank_name: '', bank_account_number: '', bank_branch: ''
  });

  useEffect(() => {
    base44.entities.UserProfile && base44.entities.UserProfile.filter
      && base44.entities.UserProfile.filter({ user_id: 'me' }).then(() => {}).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submitProfile = async () => {
    setLoading(true);
    setError('');
    const res = await base44.functions.invoke('p2pEngine', {
      action: 'register_profile', ...form,
      monthly_income: parseFloat(form.monthly_income) || 0
    });
    setProfile(res.data?.profile);
    setLoading(false);
    if (!res.data?.profile) { setError('Failed to save profile'); return; }
    setStep(4);
    // Auto-score after profile creation
    const scoreRes = await base44.functions.invoke('p2pEngine', { action: 'score_borrower' });
    setScoring(scoreRes.data);
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">What best describes you?</h2>
          <p className="text-sm text-gray-500">You can change this later in your profile settings.</p>
          <div className="grid gap-3">
            {[
              { value: 'borrower', label: '💳 Borrower', desc: 'I want to access P2P loans' },
              { value: 'lender', label: '📈 Lender / Investor', desc: 'I want to fund loans and earn returns' },
              { value: 'both', label: '🔄 Both', desc: 'I want to borrow and invest' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { set('account_type', opt.value); setStep(1); }}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${form.account_type === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
              >
                <p className="font-bold text-gray-900">{opt.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      );

      case 1: return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">National ID *</label>
              <Input value={form.national_id} onChange={e => set('national_id', e.target.value)} placeholder="CM90012345UGNA" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number *</label>
              <Input value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="07XXXXXXXX" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Date of Birth *</label>
              <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Gender</label>
              <Select value={form.gender} onValueChange={v => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">District</label>
              <Input value={form.district} onChange={e => set('district', e.target.value)} placeholder="Kampala" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Address *</label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Plot 12, Nakawa, Kampala" />
            </div>
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Employment Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Employment Status *</label>
              <Select value={form.employment_status} onValueChange={v => set('employment_status', v)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self_employed">Self-Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Employer Name</label>
              <Input value={form.employer_name} onChange={e => set('employer_name', e.target.value)} placeholder="Company Ltd" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Job Title</label>
              <Input value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="Accountant" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Monthly Income (UGX) *</label>
              <Input type="number" value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)} placeholder="1500000" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Income Source</label>
              <Select value={form.income_source} onValueChange={v => set('income_source', v)}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="rental">Rental</SelectItem>
                  <SelectItem value="pension">Pension</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );

      case 3: return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Financial Accounts</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mobile Money Provider *</label>
              <Select value={form.mobile_money_provider} onValueChange={v => set('mobile_money_provider', v)}>
                <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                  <SelectItem value="airtel">Airtel Money</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mobile Money Number *</label>
              <Input value={form.mobile_money_account} onChange={e => set('mobile_money_account', e.target.value)} placeholder="07XXXXXXXX" />
            </div>
            <div className="col-span-2 border-t pt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">Bank Account (Optional)</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Bank Name</label>
              <Input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Stanbic Bank" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Account Number</label>
              <Input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} placeholder="9030012345" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Branch</label>
              <Input value={form.bank_branch} onChange={e => set('bank_branch', e.target.value)} placeholder="Kampala Road Branch" />
            </div>
          </div>
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Account Status</h2>
          {profile ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-800">Profile Created!</p>
                  <p className="text-xs text-emerald-600">Complete KYC to activate borrowing/investing.</p>
                </div>
              </div>
              {scoring && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                  <p className="font-bold text-gray-800">Your Credit Assessment</p>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-black text-blue-600">{scoring.score}</div>
                    <div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TIER_COLORS[scoring.tier] || 'bg-gray-200'}`}>
                        {scoring.tier?.toUpperCase()}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">Band: {scoring.band} · Trust: {scoring.trust_score}/100</p>
                    </div>
                  </div>
                  {scoring.is_eligible && (
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-700">Loan Limit: <strong>UGX {scoring.max_loan_limit?.toLocaleString()}</strong></p>
                      <p className="text-xs text-blue-700">Rate from: <strong>{scoring.rates?.final_interest_rate?.toFixed(1)}% / month</strong></p>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                <p className="text-xs text-amber-700 font-medium">⏳ Complete KYC verification within 3 days to activate your account. Incomplete profiles are auto-removed after 3 days.</p>
              </div>
              <Button className="w-full" onClick={() => navigate('/p2p')}>Go to P2P Dashboard →</Button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">Something went wrong. Please try again.</p>
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  const canProceed = () => {
    if (step === 0) return !!form.account_type;
    if (step === 1) return form.national_id && form.phone_number && form.address;
    if (step === 2) return form.employment_status && form.monthly_income;
    if (step === 3) return form.mobile_money_account && form.mobile_money_provider;
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f2a55] to-[#1e4480] text-white px-5 pt-12 pb-6">
        <h1 className="text-2xl font-black tracking-tight">P2P Lending Setup</h1>
        <p className="text-blue-300 text-sm mt-1">Connect with borrowers & lenders</p>
        {/* Progress */}
        <div className="flex gap-1.5 mt-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-orange-400' : 'bg-white/20'}`} />
          ))}
        </div>
        <p className="text-blue-300 text-xs mt-2">Step {step + 1} of {STEPS.length}: {STEPS[step]?.label}</p>
      </div>

      <div className="px-4 mt-6 max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          {renderStep()}
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        </div>

        {step < 4 && (
          <div className="flex gap-3 mt-4">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex-1 gap-1 bg-orange-500 hover:bg-orange-600"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={submitProfile}
                disabled={!canProceed() || loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? 'Saving...' : '✓ Complete Setup'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}