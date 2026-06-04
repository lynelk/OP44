/**
 * DigitalPaymentModal
 *
 * Unified payment bottom-sheet that supports:
 *   - Mobile Money: MTN MoMo and Airtel Money (real push-to-pay)
 *   - Card: Visa / Mastercard via Flutterwave (PIN + OTP flows)
 *
 * Props:
 *   paymentContext  { type, id, amount, label }
 *     type  'loan' | 'p2p_loan' | 'savings_pocket' | 'savings_goal' | 'savings_group'
 *     id    entity ID
 *     amount  suggested amount (number, editable)
 *     label   human-readable name shown in UI
 *   onSuccess(result)  called with the server response on success
 *   onClose()
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Smartphone, CreditCard, CheckCircle2, XCircle, Loader2,
  ChevronRight, Clock, Eye, EyeOff, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Constants ────────────────────────────────────────────────────────────────
const MM_PROVIDERS = [
  { id: 'mtn',    name: 'MTN Mobile Money', color: 'bg-yellow-400', textColor: 'text-yellow-900', logo: '📱', prefix: '077, 078, 076' },
  { id: 'airtel', name: 'Airtel Money',      color: 'bg-red-500',    textColor: 'text-white',      logo: '📲', prefix: '070, 075' },
];

const PAYMENT_TABS = [
  { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { id: 'card',         label: 'Card',          icon: CreditCard  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildPayload(type, id, amount) {
  if (type === 'loan')           return { loan_id: id, amount };
  if (type === 'p2p_loan')       return { p2p_loan_id: id, amount };
  if (type === 'savings_pocket') return { savings_pocket_id: id, amount };
  if (type === 'savings_goal')   return { savings_goal_id: id, amount };
  if (type === 'savings_group')  return { savings_group_id: id, amount };
  return { amount };
}

function formatCardNumber(raw) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function detectCard(num) {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n))          return { brand: 'Visa',       color: 'text-blue-600' };
  if (/^5[1-5]/.test(n))     return { brand: 'Mastercard', color: 'text-orange-500' };
  if (/^62/.test(n))         return { brand: 'UnionPay',   color: 'text-red-600' };
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DigitalPaymentModal({ paymentContext, onSuccess, onClose }) {
  const { type, id, amount: suggestedAmount, label } = paymentContext;

  const [tab, setTab]         = useState('mobile_money');
  const [amount, setAmount]   = useState(String(suggestedAmount || ''));
  const [step, setStep]       = useState('method'); // method | mm_provider | mm_phone | mm_pin | card_form | card_pin | card_otp | processing | success | pending | failed
  const [result, setResult]   = useState(null);

  // Mobile Money state
  const [mmProvider, setMmProvider] = useState(null);
  const [phone, setPhone]           = useState('');
  const [pin, setPin]               = useState('');
  const [checking, setChecking]     = useState(false);

  // Card state
  const [cardNumber, setCardNumber]     = useState('');
  const [cardExpiry, setCardExpiry]     = useState('');
  const [cardCvv, setCardCvv]           = useState('');
  const [cardName, setCardName]         = useState('');
  const [showCvv, setShowCvv]           = useState(false);
  const [cardPin, setCardPin]           = useState('');
  const [cardOtp, setCardOtp]           = useState('');
  const [flwRef, setFlwRef]             = useState('');
  const [flwTxnId, setFlwTxnId]         = useState('');

  const payAmount = parseFloat(amount) || 0;

  // ── Mobile Money flow ────────────────────────────────────────────────────
  const handleMmProviderSelect = (p) => { setMmProvider(p); setStep('mm_phone'); };

  const handleMmPhoneNext = () => { if (phone.length >= 9) setStep('mm_pin'); };

  const handleMmSubmit = async () => {
    setStep('processing');
    try {
      const res = await base44.functions.invoke('processMobileMoneyPayment', {
        ...buildPayload(type, id, payAmount),
        phone_number: phone,
        provider: mmProvider.id,
        pin,
      });
      const data = res.data;
      setResult(data);
      setStep(data?.success ? 'success' : data?.pending ? 'pending' : 'failed');
    } catch (err) {
      setResult({ error: err?.message || 'Payment failed. Please try again.' });
      setStep('failed');
    }
  };

  const handleCheckMmStatus = async () => {
    if (!result?.txn_ref) return;
    setChecking(true);
    try {
      const res = await base44.functions.invoke('processMobileMoneyPayment', {
        action: 'check_status', check_txn_ref: result.txn_ref,
      });
      const status = res.data?.status;
      if (status === 'paid') { setResult(r => ({ ...r, success: true })); setStep('success'); }
      else if (status === 'failed') setStep('failed');
    } catch (_) {}
    setChecking(false);
  };

  // ── Card flow ────────────────────────────────────────────────────────────
  const handleCardSubmit = async () => {
    setStep('processing');
    const [expMonth, expYear] = cardExpiry.split('/');
    try {
      const res = await base44.functions.invoke('processCardPayment', {
        ...buildPayload(type, id, payAmount),
        card_number: cardNumber.replace(/\s/g, ''),
        cvv: cardCvv,
        expiry_month: expMonth?.trim(),
        expiry_year: expYear?.trim(),
      });
      const data = res.data;

      if (data?.action_required === 'pin') {
        setFlwRef(data.flw_ref);
        setStep('card_pin');
      } else if (data?.action_required === 'otp') {
        setFlwRef(data.flw_ref);
        setStep('card_otp');
      } else if (data?.action_required === 'redirect') {
        // 3DS redirect — open in same tab
        window.location.href = data.redirect_url;
      } else if (data?.success) {
        setResult(data);
        setStep('success');
      } else {
        setResult(data);
        setStep('failed');
      }
    } catch (err) {
      setResult({ error: err?.message || 'Card payment failed.' });
      setStep('failed');
    }
  };

  const handleCardPinSubmit = async () => {
    setStep('processing');
    try {
      const res = await base44.functions.invoke('processCardPayment', {
        action: 'validate_pin', flw_ref: flwRef, otp: cardPin,
      });
      const data = res.data;
      if (data?.success) {
        // Now verify and settle
        const verifyRes = await base44.functions.invoke('processCardPayment', {
          action: 'verify_and_settle',
          transaction_id: data.transaction_id,
          ...buildPayload(type, id, payAmount),
        });
        setResult(verifyRes.data);
        setStep(verifyRes.data?.success ? 'success' : 'failed');
      } else if (data?.action_required === 'otp') {
        setFlwRef(data.flw_ref);
        setStep('card_otp');
      } else {
        setResult(data);
        setStep('failed');
      }
    } catch (err) {
      setResult({ error: err?.message || 'PIN validation failed.' });
      setStep('failed');
    }
  };

  const handleCardOtpSubmit = async () => {
    setStep('processing');
    try {
      const res = await base44.functions.invoke('processCardPayment', {
        action: 'validate_pin', flw_ref: flwRef, otp: cardOtp,
      });
      const data = res.data;
      if (data?.success) {
        const verifyRes = await base44.functions.invoke('processCardPayment', {
          action: 'verify_and_settle',
          transaction_id: data.transaction_id,
          ...buildPayload(type, id, payAmount),
        });
        setResult(verifyRes.data);
        setStep(verifyRes.data?.success ? 'success' : 'failed');
      } else {
        setResult(data);
        setStep('failed');
      }
    } catch (err) {
      setResult({ error: err?.message || 'OTP validation failed.' });
      setStep('failed');
    }
  };

  const handleCardExpiryInput = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)} / ${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const cardInfo = detectCard(cardNumber);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl pb-8 overflow-hidden"
        style={{ maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        {/* ── METHOD SELECTION ─────────────────────────────────────────────── */}
        {step === 'method' && (
          <div className="px-5 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">Make a Payment</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {label ? `To: ${label}` : 'Choose how to pay'}
            </p>

            {/* Amount field */}
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Amount (UGX)</label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-12 text-lg font-bold rounded-xl dark:bg-gray-800"
                placeholder="0"
              />
              {suggestedAmount > 0 && parseFloat(amount) !== suggestedAmount && (
                <button
                  onClick={() => setAmount(String(suggestedAmount))}
                  className="text-xs text-blue-600 mt-1"
                >
                  Reset to UGX {suggestedAmount.toLocaleString()}
                </button>
              )}
            </div>

            {/* Payment method tabs */}
            <div className="flex gap-2 mb-5">
              {PAYMENT_TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 font-semibold text-sm transition-all ${
                      tab === t.id
                        ? 'border-[#1a3a6b] bg-[#1a3a6b]/5 text-[#1a3a6b] dark:border-blue-400 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Mobile Money providers */}
            {tab === 'mobile_money' && (
              <div className="space-y-3">
                {MM_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    disabled={!payAmount}
                    onClick={() => { setMmProvider(p); setStep('mm_phone'); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-left disabled:opacity-50"
                  >
                    <div className={`w-12 h-12 ${p.color} rounded-xl flex items-center justify-center text-2xl`}>{p.logo}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.prefix}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            {/* Card */}
            {tab === 'card' && (
              <div className="space-y-3">
                {/* Card number */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Card Number</label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      className="h-12 rounded-xl pr-16 font-mono dark:bg-gray-800"
                      maxLength={19}
                    />
                    {cardInfo && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${cardInfo.color}`}>
                        {cardInfo.brand}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Expiry</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM / YY"
                      value={cardExpiry}
                      onChange={e => handleCardExpiryInput(e.target.value)}
                      className="h-12 rounded-xl text-center font-mono dark:bg-gray-800"
                      maxLength={7}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">CVV</label>
                    <div className="relative">
                      <Input
                        type={showCvv ? 'text' : 'password'}
                        inputMode="numeric"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="h-12 rounded-xl text-center font-mono dark:bg-gray-800"
                        maxLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvv(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Cardholder Name</label>
                  <Input
                    type="text"
                    placeholder="Name on card"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    className="h-12 rounded-xl dark:bg-gray-800"
                  />
                </div>

                {/* Security badge */}
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Your card details are encrypted and processed by Flutterwave. OpFin never stores raw card data.</span>
                </div>

                <Button
                  className="w-full h-12 bg-[#1a3a6b] rounded-xl text-base font-bold mt-1"
                  disabled={!payAmount || cardNumber.replace(/\s/g, '').length < 13 || !cardExpiry.includes('/') || cardCvv.length < 3}
                  onClick={handleCardSubmit}
                >
                  Pay UGX {payAmount.toLocaleString()} by Card
                </Button>
              </div>
            )}

            <button onClick={onClose} className="w-full mt-5 text-sm text-gray-400 py-2">Cancel</button>
          </div>
        )}

        {/* ── MM PHONE ──────────────────────────────────────────────────────── */}
        {step === 'mm_phone' && mmProvider && (
          <div className="px-5">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 ${mmProvider.color} rounded-xl flex items-center justify-center text-xl`}>{mmProvider.logo}</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{mmProvider.name}</h2>
                <p className="text-xs text-gray-500">Enter your registered number</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Phone Number</label>
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden h-12">
                <span className="px-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex items-center">+256</span>
                <input
                  type="tel"
                  placeholder="700 000 000"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="flex-1 px-3 outline-none text-base bg-transparent dark:text-white"
                  maxLength={9}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Prefixes: {mmProvider.prefix}</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-5 text-xs text-blue-700 dark:text-blue-300">
              📲 You'll receive a USSD prompt on <strong>+256 {phone || 'XXXXXXXXX'}</strong> to approve <strong>UGX {payAmount.toLocaleString()}</strong>
            </div>

            <Button className="w-full h-12 bg-[#1a3a6b] rounded-xl text-base" disabled={phone.length < 9} onClick={handleMmPhoneNext}>
              Continue
            </Button>
            <button onClick={() => setStep('method')} className="w-full mt-3 text-sm text-gray-400 py-2">← Back</button>
          </div>
        )}

        {/* ── MM PIN ────────────────────────────────────────────────────────── */}
        {step === 'mm_pin' && (
          <div className="px-5">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-8 h-8 text-gray-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Payment</h2>
              <p className="text-sm text-gray-500">Enter your {mmProvider?.name} PIN</p>
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={5}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="w-full h-14 text-center text-2xl font-bold tracking-[0.5em] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-400 bg-transparent dark:text-white mb-2"
              placeholder="• • • • •"
            />

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-5 text-xs text-amber-700 dark:text-amber-300">
              <strong>Payment Summary</strong><br />
              Amount: UGX {payAmount.toLocaleString()}<br />
              To: {label || 'OpFin Payment'}<br />
              Via: {mmProvider?.name}
            </div>

            <Button className="w-full h-12 bg-orange-500 hover:bg-orange-600 rounded-xl text-base font-bold"
              disabled={pin.length < 4}
              onClick={handleMmSubmit}>
              Confirm Payment
            </Button>
            <button onClick={() => setStep('mm_phone')} className="w-full mt-3 text-sm text-gray-400 py-2">← Back</button>
          </div>
        )}

        {/* ── CARD PIN ──────────────────────────────────────────────────────── */}
        {step === 'card_pin' && (
          <div className="px-5">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Enter Card PIN</h2>
              <p className="text-sm text-gray-500">Your 4-digit card PIN</p>
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={cardPin}
              onChange={e => setCardPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full h-14 text-center text-2xl font-bold tracking-[0.5em] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-400 bg-transparent dark:text-white mb-5"
              placeholder="• • • •"
            />

            <Button className="w-full h-12 bg-[#1a3a6b] rounded-xl text-base font-bold"
              disabled={cardPin.length < 4}
              onClick={handleCardPinSubmit}>
              Confirm PIN
            </Button>
          </div>
        )}

        {/* ── CARD OTP ──────────────────────────────────────────────────────── */}
        {step === 'card_otp' && (
          <div className="px-5">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Enter OTP</h2>
              <p className="text-sm text-gray-500">Enter the code sent to your phone or email</p>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={cardOtp}
              onChange={e => setCardOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full h-14 text-center text-2xl font-bold tracking-[0.3em] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-400 bg-transparent dark:text-white mb-5"
              placeholder="• • • • • •"
            />

            <Button className="w-full h-12 bg-purple-600 hover:bg-purple-700 rounded-xl text-base font-bold"
              disabled={cardOtp.length < 4}
              onClick={handleCardOtpSubmit}>
              Verify OTP
            </Button>
          </div>
        )}

        {/* ── PROCESSING ────────────────────────────────────────────────────── */}
        {step === 'processing' && (
          <div className="px-5 py-10 text-center">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Processing...</h2>
            <p className="text-sm text-gray-500">Please wait</p>
            <div className="mt-4 space-y-1.5">
              {['Verifying details', 'Processing payment', 'Updating balance'].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SUCCESS ───────────────────────────────────────────────────────── */}
        {step === 'success' && result && (
          <div className="px-5 py-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Payment Successful!</h2>
            <p className="text-sm text-gray-500 mb-4">Your payment has been confirmed</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-left space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-gray-900 dark:text-white">UGX {result.amount_paid?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{result.txn_ref}</span>
              </div>
              {result.new_balance != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {type === 'loan' || type === 'p2p_loan' ? 'Remaining Balance' : 'New Balance'}
                  </span>
                  <span className={`font-bold ${result.loan_closed ? 'text-emerald-600' : 'text-orange-500'}`}>
                    {result.loan_closed ? '✅ Fully Paid!' : `UGX ${result.new_balance?.toLocaleString()}`}
                  </span>
                </div>
              )}
            </div>
            <Button className="w-full h-12 bg-[#1a3a6b] rounded-xl" onClick={() => onSuccess(result)}>Done</Button>
          </div>
        )}

        {/* ── PENDING ───────────────────────────────────────────────────────── */}
        {step === 'pending' && (
          <div className="px-5 py-8 text-center">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Awaiting Confirmation</h2>
            <p className="text-sm text-gray-500 mb-4">
              We sent a payment prompt to your phone. Approve it and tap Check Status to confirm.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 text-left space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold dark:text-white">UGX {payAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{result?.txn_ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold text-amber-600">Pending</span>
              </div>
            </div>
            <Button className="w-full h-12 bg-[#1a3a6b] rounded-xl mb-2 flex items-center justify-center gap-2"
              disabled={checking} onClick={handleCheckMmStatus}>
              {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : 'Check Payment Status'}
            </Button>
            <button onClick={onClose} className="w-full text-sm text-gray-400 py-2">Close — I'll check later</button>
          </div>
        )}

        {/* ── FAILED ────────────────────────────────────────────────────────── */}
        {step === 'failed' && (
          <div className="px-5 py-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Payment Failed</h2>
            <p className="text-sm text-gray-500 mb-5">{result?.error || 'Transaction was declined. Please try again.'}</p>
            <Button className="w-full h-12 bg-orange-500 rounded-xl mb-2" onClick={() => setStep('method')}>Try Again</Button>
            <button onClick={onClose} className="w-full text-sm text-gray-400 py-2">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
