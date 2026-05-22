import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChevronLeft, TrendingUp, AlertTriangle, Target, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { addMonths, format, isPast, parseISO } from 'date-fns';

export default function FutureHealthProjection() {
  const [user, setUser] = useState(null);
  const [savings, setSavings] = useState([]);
  const [autoLogs, setAutoLogs] = useState([]);
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      Promise.all([
        base44.entities.SavingsPocket.filter({}),
        base44.entities.AutoSaveLog.filter({}),
        base44.entities.LoanApplication.filter({}),
        base44.entities.Repayment.filter({})
      ]).then(([s, al, l, r]) => {
        setSavings(s);
        setAutoLogs(al);
        setLoans(l.filter(x => ['active','disbursed'].includes(x.status)));
        setRepayments(r);
      });
    });
  }, []);

  // ── Savings Projection ──────────────────────────────────────────
  // Estimate monthly auto-save amount per pocket from recent logs
  const estimateMonthlyAutoSave = (pocketId) => {
    const logs = autoLogs.filter(l => l.pocket_id === pocketId && l.status === 'success');
    if (logs.length === 0) return 0;
    // Count distinct months
    const months = new Set(logs.map(l => {
      const d = new Date(l.executed_at || l.created_date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }));
    const totalAmount = logs.reduce((s, l) => s + l.amount, 0);
    return months.size > 0 ? totalAmount / months.size : 0;
  };

  const totalCurrentSavings = savings.reduce((s, p) => s + (p.current_balance || 0), 0);
  const totalMonthlyAutoSave = savings.reduce((s, p) => s + estimateMonthlyAutoSave(p.id), 0);

  // Build 12-month projection
  const savingsProjection = Array.from({ length: 13 }, (_, i) => ({
    month: i,
    label: i === 0 ? 'Now' : format(addMonths(new Date(), i), 'MMM yy'),
    balance: Math.round(totalCurrentSavings + totalMonthlyAutoSave * i)
  }));

  // ── Repayment Risk Alerts ────────────────────────────────────────
  const upcomingRepayments = repayments
    .filter(r => r.status === 'scheduled' && r.due_date)
    .map(r => {
      const loan = loans.find(l => l.id === r.loan_id);
      const monthsUntilDue = Math.max(0, Math.round((new Date(r.due_date) - new Date()) / (1000 * 60 * 60 * 24 * 30)));
      const projectedBalance = totalCurrentSavings + totalMonthlyAutoSave * monthsUntilDue;
      const atRisk = projectedBalance < r.amount;
      return { ...r, loan, monthsUntilDue, projectedBalance, atRisk };
    })
    .filter(r => !isPast(parseISO(r.due_date)))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  // ── Milestone gap analysis ───────────────────────────────────────
  const pocketGoals = savings.filter(p => p.goal_amount > p.current_balance);

  const getAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const context = `Total savings: UGX ${totalCurrentSavings.toLocaleString()}. Monthly auto-save: UGX ${totalMonthlyAutoSave.toLocaleString()}. Active loans: ${loans.length}. Savings goals: ${pocketGoals.map(p => `${p.name} needs UGX ${(p.goal_amount - p.current_balance).toLocaleString()} more`).join('; ')}.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `I am a user of a savings & loan app in Uganda. ${context}. Give me 3 specific, actionable suggestions to hit my savings goals faster and avoid loan default. Keep each suggestion under 2 sentences. Return as JSON array of strings under key "suggestions".`,
        response_json_schema: {
          type: 'object',
          properties: { suggestions: { type: 'array', items: { type: 'string' } } }
        }
      });
      setSuggestions(res.suggestions || []);
    } catch (e) { /* silent */ }
    setLoadingAI(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <Link to="/" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Future Health Projection</h1>
        <p className="text-blue-200 text-sm">Forecasts & smart alerts for your finances</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Savings Projection Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> 12-Month Savings Forecast
            </CardTitle>
            <p className="text-xs text-gray-400">Based on current auto-save of UGX {totalMonthlyAutoSave.toLocaleString('en-UG', { maximumFractionDigits: 0 })}/month</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">In 6 Months</p>
                <p className="font-bold text-green-700">UGX {((totalCurrentSavings + totalMonthlyAutoSave * 6) / 1000).toFixed(0)}K</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">In 12 Months</p>
                <p className="font-bold text-blue-700">UGX {((totalCurrentSavings + totalMonthlyAutoSave * 12) / 1000).toFixed(0)}K</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={savingsProjection} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [`UGX ${v.toLocaleString('en-UG', { maximumFractionDigits: 0 })}`, 'Savings']} />
                {/* Mark 6-month line */}
                <ReferenceLine x={savingsProjection[6]?.label} stroke="#10b981" strokeDasharray="4 4" label={{ value: '6mo', fontSize: 10, fill: '#10b981' }} />
                <Area type="monotone" dataKey="balance" stroke="#22c55e" fill="#dcfce7" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Repayment Risk Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Repayment Risk Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingRepayments.length === 0 ? (
              <p className="text-sm text-gray-400">No upcoming repayments found.</p>
            ) : (
              <div className="space-y-3">
                {upcomingRepayments.map((r, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${r.atRisk ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700">
                        UGX {r.amount.toLocaleString('en-UG', { maximumFractionDigits: 0 })} due
                      </p>
                      <Badge className={r.atRisk ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                        {r.atRisk ? '⚠ At Risk' : '✓ Covered'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">Due: {format(parseISO(r.due_date), 'dd MMM yyyy')} · {r.monthsUntilDue === 0 ? 'This month' : `${r.monthsUntilDue} month(s) away`}</p>
                    <p className="text-xs text-gray-500">Projected savings by then: <span className="font-medium">UGX {r.projectedBalance.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span></p>
                    {r.atRisk && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        ↑ Increase auto-save by UGX {(r.amount - r.projectedBalance).toLocaleString('en-UG', { maximumFractionDigits: 0 })} to avoid default.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings Goal Gap */}
        {pocketGoals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" /> Goal Acceleration
              </CardTitle>
              <p className="text-xs text-gray-400">How much extra to save to hit goals faster</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pocketGoals.map((p, i) => {
                const gap = p.goal_amount - (p.current_balance || 0);
                const monthsAtCurrent = totalMonthlyAutoSave > 0 ? Math.ceil(gap / totalMonthlyAutoSave) : null;
                const fasterMonthly = Math.ceil(gap / 6); // hit in 6 months
                return (
                  <div key={i} className="border-b pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{p.icon || '🎯'}</span>
                      <p className="text-sm font-medium text-gray-700">{p.name}</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(((p.current_balance || 0) / p.goal_amount) * 100, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">Gap: UGX {gap.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                    {monthsAtCurrent && <p className="text-xs text-gray-400">At current rate: ~{monthsAtCurrent} months</p>}
                    <p className="text-xs text-green-600 font-medium mt-0.5">
                      💡 Save UGX {fasterMonthly.toLocaleString('en-UG', { maximumFractionDigits: 0 })}/month to reach in 6 months
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* AI Suggestions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" /> AI Personalised Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <Button onClick={getAISuggestions} disabled={loadingAI} className="w-full bg-[#1a3a6b] text-white text-sm">
                {loadingAI ? 'Analysing your finances...' : '✨ Get Smart Suggestions'}
              </Button>
            ) : (
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-yellow-50 rounded-lg p-2">
                    <span className="text-yellow-500 font-bold shrink-0">{i + 1}.</span> {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}