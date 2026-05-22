import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, AlertCircle, CheckCircle, Info } from 'lucide-react';
import ScoreGauge from '@/components/credit/ScoreGauge';
import ScoreBreakdown from '@/components/credit/ScoreBreakdown';
import ReasonCodes from '@/components/credit/ReasonCodes';

export default function CreditScore() {
  const [scoreData, setScoreData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);

    const scores = await base44.entities.CreditScore.filter(
      { user_id: me.id },
      '-calculated_at',
      10
    );
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
    A: { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
    B: { label: 'Good', color: 'bg-blue-100 text-blue-700 border-blue-200', bar: 'bg-blue-500' },
    C: { label: 'Fair', color: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-500' },
    D: { label: 'Needs Work', color: 'bg-red-100 text-red-700 border-red-200', bar: 'bg-red-500' },
  };

  const band = scoreData?.risk_band || user?.current_risk_band;
  const score = scoreData?.score || user?.current_credit_score;
  const config = riskBandConfig[band] || riskBandConfig['C'];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Credit Score</h1>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={recalculate}
            disabled={calculating}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Calculating...' : 'Recalculate'}
          </Button>
        </div>
        <p className="text-slate-400 text-sm">Your financial health at a glance</p>
      </div>

      <div className="px-4 -mt-2 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : !score ? (
          <Card className="mt-6">
            <CardContent className="p-8 text-center">
              <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-2">No credit score yet</p>
              <p className="text-slate-400 text-sm mb-4">Calculate your score to understand your borrowing power.</p>
              <Button onClick={recalculate} disabled={calculating}>
                <RefreshCw className={`w-4 h-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
                Calculate Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Score Card */}
            <Card className="mt-4 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500">Credit Score</p>
                    <p className="text-5xl font-bold text-slate-900">{score}</p>
                    <p className="text-xs text-slate-400 mt-1">out of 850</p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${config.color} border text-sm px-3 py-1 mb-2`}>
                      Band {band} — {config.label}
                    </Badge>
                    {scoreData?.max_loan_limit > 0 && (
                      <p className="text-xs text-slate-500">
                        Max loan: <span className="font-semibold text-slate-700">
                          UGX {scoreData.max_loan_limit.toLocaleString()}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <ScoreGauge score={score} />
              </CardContent>
            </Card>

            {/* Score Breakdown */}
            {scoreData?.score_breakdown && (
              <ScoreBreakdown breakdown={scoreData.score_breakdown} />
            )}

            {/* Reason Codes */}
            {scoreData?.reason_codes?.length > 0 && (
              <ReasonCodes codes={scoreData.reason_codes} />
            )}

            {/* Score History */}
            {history.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Score History
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {history.slice(0, 5).map((h, i) => (
                      <div key={h.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          {new Date(h.calculated_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{h.score}</span>
                          <Badge variant="outline" className="text-xs">{h.risk_band}</Badge>
                          {i < history.length - 1 && (
                            <span className={`text-xs font-medium ${h.score > history[i + 1]?.score ? 'text-emerald-600' : 'text-red-500'}`}>
                              {h.score > history[i + 1]?.score ? '↑' : '↓'}
                              {Math.abs(h.score - history[i + 1]?.score)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">How to improve your score</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Complete your KYC verification</li>
                      <li>• Repay loans on or before due dates</li>
                      <li>• Maintain active savings pockets</li>
                      <li>• Declare your income & employment status</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}