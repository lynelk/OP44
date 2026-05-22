import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Zap, Target, AlertCircle, CheckCircle2, ArrowRight, PiggyBank } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DebtPayoff() {
  const [method, setMethod] = useState('snowball');
  const [extraPayment, setExtraPayment] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(null);
  const [redirectAmount, setRedirectAmount] = useState({});

  const fetchPlan = async (meth = method, extra = extraPayment) => {
    setLoading(true);
    const res = await base44.functions.invoke('debtPayoffManager', {
      method: meth,
      extra_monthly_payment: extra ? parseFloat(extra) : 0,
    });
    setPlan(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchPlan(); }, []);

  const handleRedirect = async (loanId) => {
    const amt = parseFloat(redirectAmount[loanId] || 0);
    if (!amt) return;
    setRedirecting(loanId);
    const res = await base44.functions.invoke('debtPayoffManager', {
      method,
      redirect_amount: amt,
      target_loan_id: loanId,
    });
    if (res.data?.redirect_result?.success) {
      await fetchPlan();
    }
    setRedirecting(null);
    setRedirectAmount(prev => ({ ...prev, [loanId]: '' }));
  };

  const monthsSaved = plan?.months_saved || 0;
  const hasDebts = plan?.debts?.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold mb-1">Debt Payoff Manager</h1>
        <p className="text-blue-200 text-sm">Become debt-free faster with smart strategies</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Method Selector */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Choose Your Strategy</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMethod('snowball'); fetchPlan('snowball', extraPayment); }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${method === 'snowball' ? 'border-[#1a3a6b] bg-blue-50' : 'border-gray-200'}`}>
                <div className="text-xl mb-1">⛄</div>
                <p className="font-semibold text-sm">Snowball</p>
                <p className="text-xs text-gray-500">Pay smallest debts first for quick wins</p>
              </button>
              <button
                onClick={() => { setMethod('avalanche'); fetchPlan('avalanche', extraPayment); }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${method === 'avalanche' ? 'border-[#f97316] bg-orange-50' : 'border-gray-200'}`}>
                <div className="text-xl mb-1">🏔️</div>
                <p className="font-semibold text-sm">Avalanche</p>
                <p className="text-xs text-gray-500">Pay highest interest first to save more</p>
              </button>
            </div>

            <div className="mt-3">
              <label className="text-xs text-gray-500 mb-1 block">Extra monthly payment (UGX)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g. 50,000"
                  value={extraPayment}
                  onChange={e => setExtraPayment(e.target.value)}
                  className="text-sm"
                />
                <Button size="sm" className="bg-[#1a3a6b] text-white px-3" onClick={() => fetchPlan(method, extraPayment)}>
                  <Zap className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center py-8 text-gray-400">
            <div className="w-8 h-8 border-4 border-[#1a3a6b] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Calculating your plan...</p>
          </div>
        )}

        {!loading && plan && (
          <>
            {/* Summary */}
            {hasDebts ? (
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-red-500">Total Debt</p>
                    <p className="text-lg font-bold text-red-700">UGX {(plan.total_debt / 1000).toFixed(0)}K</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-green-500">Surplus Savings</p>
                    <p className="text-lg font-bold text-green-700">UGX {(plan.total_surplus_savings / 1000).toFixed(0)}K</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-blue-500">Debt-Free In</p>
                    <p className="text-lg font-bold text-blue-700">{plan.payoff_months_with_extra} months</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${monthsSaved > 0 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                  <CardContent className="p-3 text-center">
                    <p className={`text-xs ${monthsSaved > 0 ? 'text-purple-500' : 'text-gray-400'}`}>Months Saved</p>
                    <p className={`text-lg font-bold ${monthsSaved > 0 ? 'text-purple-700' : 'text-gray-400'}`}>{monthsSaved} months</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-green-300 bg-green-50">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-green-700">You're Debt Free! 🎉</p>
                  <p className="text-sm text-green-600">No active loans found.</p>
                </CardContent>
              </Card>
            )}

            {/* Debt Priority List */}
            {hasDebts && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#1a3a6b]" />
                    {method === 'snowball' ? '⛄ Payoff Order (Smallest First)' : '🏔️ Payoff Order (Highest Interest First)'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.debts.map((debt, idx) => (
                    <div key={debt.id} className="border rounded-xl p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${idx === 0 ? 'bg-[#f97316]' : 'bg-gray-400'}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{debt.name}</p>
                            <p className="text-xs text-gray-400">{debt.interest_rate}% p.a. · UGX {debt.monthly_payment?.toLocaleString()}/mo</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600 text-sm">UGX {(debt.balance / 1000).toFixed(0)}K</p>
                          {idx === 0 && <Badge className="text-xs bg-orange-100 text-orange-700 mt-1">Priority</Badge>}
                        </div>
                      </div>

                      {/* Redirect surplus */}
                      {plan.total_surplus_savings > 0 && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            type="number"
                            placeholder={`Max UGX ${(plan.total_surplus_savings / 1000).toFixed(0)}K`}
                            className="text-xs h-8"
                            value={redirectAmount[debt.id] || ''}
                            onChange={e => setRedirectAmount(prev => ({ ...prev, [debt.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-green-600 text-white px-2 whitespace-nowrap"
                            onClick={() => handleRedirect(debt.id)}
                            disabled={redirecting === debt.id}
                          >
                            {redirecting === debt.id ? '...' : <><PiggyBank className="w-3 h-3 mr-1" />Pay Now</>}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Payoff Chart */}
            {plan.plan?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Debt Payoff Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={plan.plan} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={v => `UGX ${v.toLocaleString()}`} />
                      <Area type="monotone" dataKey="total_balance" stroke="#ef4444" fill="#fee2e2" name="Remaining Debt" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {plan.total_surplus_savings > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-3 flex items-center gap-3">
                  <PiggyBank className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800 text-sm">UGX {(plan.total_surplus_savings / 1000).toFixed(0)}K Available</p>
                    <p className="text-xs text-green-600">Redirecting surplus savings to the #1 priority debt saves you the most time.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}