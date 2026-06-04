import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Smartphone, CheckCircle2, XCircle, Loader2, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PROVIDERS = [
  { id: 'mtn', name: 'MTN Mobile Money', color: 'bg-yellow-400', textColor: 'text-yellow-900', logo: '📱', prefix: '077, 078, 076' },
  { id: 'airtel', name: 'Airtel Money', color: 'bg-red-500', textColor: 'text-white', logo: '📲', prefix: '070, 075' },
];

export default function MobileMoneyModal({ loan, onSuccess, onClose }) {
  const [provider, setProvider] = useState(null);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState('provider'); // provider | phone | pin | processing | success | pending | failed
  const [result, setResult] = useState(null);
  const [amount, setAmount] = useState(String(loan?.monthly_installment || ''));
  const [checking, setChecking] = useState(false);

  const handleProviderSelect = (p) => {
    setProvider(p);
    setStep('phone');
  };

  const handlePhoneNext = () => {
    if (phone.length < 9) return;
    setStep('pin');
  };

  const handleSubmit = async () => {
    setStep('processing');
    const res = await base44.functions.invoke('processMobileMoneyPayment', {
      loan_id: loan.id,
      amount: parseFloat(amount),
      phone_number: phone,
      provider: provider.id,
      pin,
    });
    const data = res.data;
    setResult(data);
    setStep(data.success ? 'success' : data.pending ? 'pending' : 'failed');
  };

  const handleCheckStatus = async () => {
    if (!result?.txn_ref) return;
    setChecking(true);
    const res = await base44.functions.invoke('processMobileMoneyPayment', {
      action: 'check_status', check_txn_ref: result.txn_ref,
    });
    setChecking(false);
    const status = res.data?.status;
    if (status === 'paid') {
      setResult(r => ({ ...r, success: true }));
      setStep('success');
    } else if (status === 'failed') {
      setStep('failed');
    }
    // else: still pending — leave the screen as-is
  };

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    return digits;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl pb-8 overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {step === 'provider' && (
          <div className="px-5">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Mobile Money Payment</h2>
            <p className="text-sm text-gray-500 mb-5">Select your mobile money provider</p>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount (UGX)</label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-12 text-lg font-bold rounded-xl"
              />
              {loan?.outstanding_balance > 0 && (
                <div className="flex gap-2 mt-2">
                  {[loan.monthly_installment, loan.outstanding_balance].filter(Boolean).map((v, i) => (
                    <button key={i} onClick={() => setAmount(String(v))}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
                      {i === 0 ? '1 Instalment' : 'Full Balance'}<br />
                      <span className="font-bold">UGX {(v / 1000).toFixed(0)}K</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProviderSelect(p)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-300 transition-all text-left"
                >
                  <div className={`w-12 h-12 ${p.color} rounded-xl flex items-center justify-center text-2xl`}>
                    {p.logo}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.prefix}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-full mt-4 text-sm text-gray-400 py-2">Cancel</button>
          </div>
        )}

        {step === 'phone' && (
          <div className="px-5">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 ${provider.color} rounded-xl flex items-center justify-center text-xl`}>{provider.logo}</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{provider.name}</h2>
                <p className="text-xs text-gray-500">Enter your registered number</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden h-12">
                <span className="px-3 text-sm font-medium text-gray-600 bg-gray-50 border-r border-gray-200 h-full flex items-center">+256</span>
                <input
                  type="tel"
                  placeholder="700 000 000"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  className="flex-1 px-3 outline-none text-base"
                  maxLength={9}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Prefixes: {provider.prefix}</p>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-5 text-xs text-blue-700">
              📲 You'll receive a USSD prompt on <strong>+256 {phone || 'XXXXXXXXX'}</strong> to approve <strong>UGX {parseFloat(amount || 0).toLocaleString()}</strong>
            </div>

            <Button className="w-full h-12 bg-[#1a3a6b] rounded-xl text-base" disabled={phone.length < 9} onClick={handlePhoneNext}>
              Continue
            </Button>
            <button onClick={() => setStep('provider')} className="w-full mt-3 text-sm text-gray-400 py-2">← Back</button>
          </div>
        )}

        {step === 'pin' && (
          <div className="px-5">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-8 h-8 text-gray-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Enter PIN</h2>
              <p className="text-sm text-gray-500">Your {provider.name} PIN</p>
            </div>

            <div className="mb-2">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Mobile Money PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="w-full h-14 text-center text-2xl font-bold tracking-[0.5em] border border-gray-200 rounded-xl outline-none focus:border-blue-400"
                placeholder="• • • • •"
              />
            </div>
            <p className="text-xs text-center text-gray-400 mb-5">This simulates the mobile money PIN verification</p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-700">
              <strong>Payment Summary</strong><br />
              Amount: UGX {parseFloat(amount || 0).toLocaleString()}<br />
              To: OpFin Loan Repayment<br />
              Via: {provider.name}
            </div>

            <Button className="w-full h-12 bg-orange-500 hover:bg-orange-600 rounded-xl text-base font-bold"
              disabled={pin.length < 4}
              onClick={handleSubmit}>
              Confirm Payment
            </Button>
            <button onClick={() => setStep('phone')} className="w-full mt-3 text-sm text-gray-400 py-2">← Back</button>
          </div>
        )}

        {step === 'processing' && (
          <div className="px-5 py-10 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Processing...</h2>
            <p className="text-sm text-gray-500">Connecting to {provider?.name}</p>
            <div className="mt-4 space-y-1.5">
              {['Initiating transaction', 'Verifying PIN', 'Processing payment', 'Updating loan balance'].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'success' && result && (
          <div className="px-5 py-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Successful!</h2>
            <p className="text-sm text-gray-500 mb-4">Your repayment has been processed</p>
            <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-bold text-gray-900">UGX {result.amount_paid?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono text-xs text-gray-700">{result.txn_ref}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Provider</span>
                <span className="font-medium">{provider?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">New Balance</span>
                <span className={`font-bold ${result.new_balance <= 0 ? 'text-emerald-600' : 'text-orange-500'}`}>
                  {result.loan_closed ? '✅ Fully Paid!' : `UGX ${result.new_balance?.toLocaleString()}`}
                </span>
              </div>
            </div>
            <Button className="w-full h-12 bg-[#1a3a6b] rounded-xl" onClick={() => onSuccess(result)}>Done</Button>
          </div>
        )}

        {step === 'pending' && (
          <div className="px-5 py-8 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Awaiting Confirmation</h2>
            <p className="text-sm text-gray-500 mb-4">
              We sent a prompt to your phone but haven't received confirmation from {provider?.name} yet.
              If you approved it, it will clear shortly — we won't charge you twice.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-gray-900">UGX {parseFloat(amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono text-xs text-gray-700">{result?.txn_ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold text-amber-600">Pending</span>
              </div>
            </div>
            <Button className="w-full h-12 bg-[#1a3a6b] rounded-xl mb-2 flex items-center justify-center gap-2" disabled={checking} onClick={handleCheckStatus}>
              {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : 'Check Payment Status'}
            </Button>
            <button onClick={onClose} className="w-full text-sm text-gray-400 py-2">Close — I'll check later</button>
            <p className="text-xs text-gray-400 mt-2">You can track this payment in your loan statement.</p>
          </div>
        )}

        {step === 'failed' && (
          <div className="px-5 py-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Failed</h2>
            <p className="text-sm text-gray-500 mb-5">{result?.error || 'Transaction was declined. Please try again.'}</p>
            <Button className="w-full h-12 bg-orange-500 rounded-xl mb-2" onClick={() => setStep('pin')}>Try Again</Button>
            <button onClick={onClose} className="w-full text-sm text-gray-400 py-2">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}