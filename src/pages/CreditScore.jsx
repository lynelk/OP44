import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Info, ShieldCheck, Wallet } from 'lucide-react';
import ScoreGauge from '@/components/credit/ScoreGauge';
import ScoreBreakdown from '@/components/credit/ScoreBreakdown';
import ReasonCodes from '@/components/credit/ReasonCodes';

export default function CreditScore() {
  const [scoreData, setScoreData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    const scores = await base44.entities.CreditScore.filter({ user_id: me.id }, '-calculated_at', 10);
    setHistory(scores);
    if (scores.length > 0) setScoreData(scores[0]);
    setLoading(false);
  };

  const recalculate = async () => {
    setCalculating(true);
    const res = await base44.functions.invoke('calculateCreditScore', {});
    setScoreData(res.data);
    await loadData();
    setCalculating(false);
  };

  const riskBandConfig = {
    A: { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', pill: 'bg-emerald-100 text-emerald-700' },
    B: { label: 'Good',      color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20',       pill: 'bg-blue-100 text-blue-700' },
    C: { label: 'Fair',      color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',     pill: 'bg-amber-100 text-amber-700' },
    D: { label: 'Needs Work',color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',         pill: 'bg-red-100 text-red-700' },
  };

  const band = scoreData?.risk_band || user?.current_risk_band;
  const score = scoreData?.score || user?.current_credit_score;
  const config = riskBandConfig[band] || riskBandConfig['C'];
  
  const formatCurrency = (amount) => {
    if (!amount) return 'UGX 0';
    return `UGX ${amount.toLocaleString('en-UG')}`;
  };
  
  const availableCredit = scoreData?.max_loan_limit || 0;
  const creditUtilization = scoreData && availableCredit > 0 
    ? ((scoreData.max_loan_limit - (scoreData.max_loan_limit * 0.3)) / scoreData.max_loan_limit * 100).toFixed(0)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-14 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Credit Score</h1>
            <p className="text-green-200 text-sm">Your financial health at a glance</p>
          </div>
          <button onClick={recalculate} disabled={calculating}
            className="flex items-center gap-1.5 h-9 px-3 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-full transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Calculating...' : 'Recalculate'}
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-32 animate-pulse" />)}
          </div>
        ) : !score ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-sm">
            <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-semibold mb-2">No credit score yet</p>
            <p className="text-gray-400 text-sm mb-4">Calculate your score to understand your borrowing power.</p>
            <button onClick={recalculate} disabled={calculating}
              className="h-11 px-6 bg-[#006B3C] text-white font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2 mx-auto">
              <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} /> Calculate Now
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Credit Score</p>
                  <p className={`text-5xl font-bold ${config.color}`}>{score}</p>
                  <p className="text-xs text-gray-400 mt-1">out of 850</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${config.pill}`}>
                    Band {band} — {config.label}
                  </span>
                  {availableCredit > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-400">
                        Available credit: <span className="font-semibold text-[#006B3C]">{formatCurrency(availableCredit)}</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        Max loan: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(availableCredit)}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <ScoreGauge score={score} />
            </div>

            {scoreData?.score_breakdown && <ScoreBreakdown breakdown={scoreData.score_breakdown} />}

            {/* Available Credit Card */}
            {availableCredit > 0 && (
              <div className="bg-gradient-to-r from-[#006B3C] to-[#007a44] text-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Available Credit</p>
                      <p className="text-2xl font-bold">{formatCurrency(availableCredit)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-100">Based on Band {band}</p>
                    <p className="text-xs text-green-100">Score: {score}</p>
                  </div>
                </div>
                <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (score / 850) * 100)}%` }} />
                </div>
                <p className="text-xs text-green-100 mt-2">
                  Higher credit scores unlock more available credit
                </p>
              </div>
            )}

            {/* GnuGrid CRB Summary Card */}
            {scoreData?.crb_available && scoreData?.crb_summary && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> GnuGrid CRB Bureau Data
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {scoreData.crb_summary.crb_score && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">CRB Score</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{scoreData.crb_summary.crb_score}</p>
                    </div>
                  )}
                  {scoreData.crb_summary.crb_band && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">CRB Band</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{scoreData.crb_summary.crb_band}</p>
                    </div>
                  )}
                  {scoreData.crb_summary.crb_rating && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">Rating</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{scoreData.crb_summary.crb_rating}</p>
                    </div>
                  )}
                  {scoreData.crb_summary.mno_score && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">MNO Score</p>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{scoreData.crb_summary.mno_score}</p>
                    </div>
                  )}
                  {scoreData.crb_summary.mno_band && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">MNO Band</p>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{scoreData.crb_summary.mno_band}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {scoreData?.reason_codes?.length > 0 && <ReasonCodes codes={scoreData.reason_codes} />}

            {history.length > 1 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4" /> Score History
                </p>
                <div className="space-y-3">
                  {history.slice(0, 5).map((h, i) => (
                    <div key={h.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {new Date(h.calculated_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">{h.score}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskBandConfig[h.risk_band]?.pill || 'bg-gray-100 text-gray-600'}`}>
                          {h.risk_band}
                        </span>
                        {i < history.length - 1 && (
                          <span className={`text-xs font-bold ${h.score > history[i+1]?.score ? 'text-emerald-500' : 'text-red-400'}`}>
                            {h.score > history[i+1]?.score ? '↑' : '↓'}{Math.abs(h.score - history[i+1]?.score)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Improve your score</p>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• Complete KYC verification</li>
                    <li>• Repay loans on or before due dates</li>
                    <li>• Maintain active savings pockets</li>
                    <li>• Declare your income & employment</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}