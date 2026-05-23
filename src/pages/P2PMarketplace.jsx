import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Filter, TrendingUp, Shield, Clock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TIER_CONFIG = {
  platinum: { color: 'bg-slate-800 text-white', emoji: '💎' },
  gold:     { color: 'bg-yellow-500 text-white', emoji: '🥇' },
  silver:   { color: 'bg-gray-400 text-white', emoji: '🥈' },
  bronze:   { color: 'bg-orange-700 text-white', emoji: '🥉' },
};

const BAND_RETURN = { A: '8–12%', B: '14–18%', C: '20–26%', D: '28–35%' };

export default function P2PMarketplace() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [funding, setFunding] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const pullStartY = useRef(0);

  const load = async () => {
    setLoading(true);
    const res = await base44.asServiceRole?.entities?.P2PLoan?.filter({ status: 'awaiting_funding' }).catch(() => []);
    setLoans(res || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Pull to refresh
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onTouchStart = (e) => { pullStartY.current = e.touches[0].clientY; };
    const onTouchEnd = async (e) => {
      const delta = e.changedTouches[0].clientY - pullStartY.current;
      if (delta > 80 && el.scrollTop === 0) {
        setIsRefreshing(true);
        await load();
        setTimeout(() => setIsRefreshing(false), 600);
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
  }, []);

  const filtered = filter === 'all' ? loans : loans.filter(l => l.risk_band === filter);

  const handleFund = async () => {
    if (!fundAmount || !selectedLoan) return;
    setFunding(true);
    setError('');
    const res = await base44.functions.invoke('p2pEngine', {
      action: 'fund_loan',
      loan_id: selectedLoan.id,
      amount: parseFloat(fundAmount)
    });
    setFunding(false);
    if (res.data?.error) { setError(res.data.error); return; }
    setSuccess(res.data);
  };

  return (
    <div ref={scrollRef} className="min-h-screen bg-gray-50 pb-10 font-sans overflow-y-auto">
      {isRefreshing && (
        <div className="flex justify-center pt-4 pb-2">
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-lg text-sm text-gray-600">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Refreshing...
          </div>
        </div>
      )}
      <div className="bg-gradient-to-br from-[#0f2a55] to-[#1e4480] text-white px-5 pt-12 pb-6">
        <button onClick={() => navigate('/p2p')} className="flex items-center gap-1 text-blue-300 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-black">Loan Marketplace</h1>
        <p className="text-blue-300 text-sm mt-1">Fund vetted borrowers, earn competitive returns</p>

        <div className="bg-white/10 rounded-2xl p-3 mt-3 grid grid-cols-3 text-center text-sm">
          <div><p className="text-blue-300 text-xs">Band A Returns</p><p className="font-bold">{BAND_RETURN.A} pa</p></div>
          <div className="border-x border-white/20"><p className="text-blue-300 text-xs">Band B Returns</p><p className="font-bold">{BAND_RETURN.B} pa</p></div>
          <div><p className="text-blue-300 text-xs">Band C Returns</p><p className="font-bold">{BAND_RETURN.C} pa</p></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {['all', 'A', 'B', 'C', 'D'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {f === 'all' ? 'All Bands' : `Band ${f}`}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No loans available for funding</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon as new applications are approved</p>
          </div>
        ) : (
          filtered.map(loan => {
            const pctFunded = loan.amount_approved > 0 ? Math.min(100, ((loan.amount_funded || 0) / loan.amount_approved) * 100) : 0;
            const tierCfg = TIER_CONFIG[loan.risk_tier] || TIER_CONFIG.bronze;
            return (
              <div key={loan.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-black text-xl text-gray-900">UGX {loan.amount_approved?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{loan.purpose} · {loan.tenure_months} months</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${tierCfg.color}`}>
                        {tierCfg.emoji} Band {loan.risk_band}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3 text-center">
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-xs text-gray-400">Rate</p>
                      <p className="text-sm font-bold text-orange-600">{loan.final_interest_rate?.toFixed(1)}%/mo</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-xs text-gray-400">Remaining</p>
                      <p className="text-sm font-bold text-blue-600">UGX {((loan.amount_approved - (loan.amount_funded || 0)) / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-xs text-gray-400">Max Share</p>
                      <p className="text-sm font-bold">40%</p>
                    </div>
                  </div>

                  {/* Funding Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{pctFunded.toFixed(0)}% funded</span>
                      <span>Need {loan.funding_threshold_pct}% to disburse</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                        style={{ width: `${pctFunded}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => { setSelectedLoan(loan); setFundAmount(''); setError(''); setSuccess(null); }}
                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                  >
                    Fund This Loan →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Fund Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            {success ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-black text-lg">Investment Confirmed!</p>
                <p className="text-sm text-gray-500">UGX {parseFloat(fundAmount).toLocaleString()} invested · {success.investment?.ownership_pct?.toFixed(1)}% ownership</p>
                {success.threshold_met && <p className="text-emerald-600 font-bold mt-2">🎉 Loan fully funded! Disbursement initiated.</p>}
                <Button className="w-full mt-4" onClick={() => { setSelectedLoan(null); load(); }}>Done</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg">Fund This Loan</h3>
                  <button onClick={() => setSelectedLoan(null)} className="text-gray-400 text-2xl leading-none">×</button>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Loan Amount</span><span className="font-bold">UGX {selectedLoan.amount_approved?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Interest Rate</span><span className="font-bold text-orange-600">{selectedLoan.final_interest_rate?.toFixed(1)}%/mo</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Your max (40%)</span><span className="font-bold">UGX {(selectedLoan.amount_approved * 0.4).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Your lender share</span><span className="font-bold text-emerald-600">55% of interest</span></div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Amount to Invest (UGX)</label>
                  <Input type="number" value={fundAmount} onChange={e => setFundAmount(e.target.value)} placeholder="e.g. 200000" className="text-base" />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 rounded-xl p-3">
                  <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span>15% of your interest earnings go to the Reserve Fund for lender protection.</span>
                </div>
                <Button onClick={handleFund} disabled={!fundAmount || funding} className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-12">
                  {funding ? 'Processing...' : `Invest UGX ${parseFloat(fundAmount || 0).toLocaleString()}`}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}