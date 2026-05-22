import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChevronLeft, Calendar, TrendingDown, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { addMonths, format } from 'date-fns';

const MONTHLY_RATE = 0.05;

function buildSchedule(principal, monthlyPayment) {
  const schedule = [];
  let balance = principal;
  let month = 0;
  while (balance > 0.5 && month < 120) {
    const interest = balance * MONTHLY_RATE;
    const principalPaid = Math.min(monthlyPayment - interest, balance);
    if (principalPaid <= 0) break;
    balance = Math.max(balance - principalPaid, 0);
    month++;
    schedule.push({
      month,
      label: format(addMonths(new Date(), month), 'MMM yy'),
      balance: Math.round(balance),
      interest: Math.round(interest),
      principalPaid: Math.round(principalPaid)
    });
  }
  return schedule;
}

export default function RepaymentPlanner() {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [customPayment, setCustomPayment] = useState('');

  useEffect(() => {
    base44.entities.LoanApplication.filter({}).then(data => {
      const active = data.filter(l => ['active', 'disbursed', 'approved'].includes(l.status));
      setLoans(active);
      if (active.length > 0) {
        setSelectedLoan(active[0]);
        setCustomPayment(String(Math.round(active[0].monthly_installment || 0)));
      }
    });
  }, []);

  const loan = selectedLoan;
  const principal = loan?.outstanding_balance || loan?.amount_approved || loan?.amount_requested || 0;
  const minPayment = loan?.monthly_installment || 0;
  const customAmt = parseFloat(customPayment) || minPayment;

  const standardSchedule = minPayment > 0 ? buildSchedule(principal, minPayment) : [];
  const customSchedule = customAmt > 0 ? buildSchedule(principal, customAmt) : [];

  const standardTotal = standardSchedule.reduce((s, r) => s + r.interest, 0) + principal;
  const customTotal = customSchedule.reduce((s, r) => s + r.interest, 0) + principal;
  const interestSaved = standardTotal - customTotal;
  const monthsSaved = standardSchedule.length - customSchedule.length;

  const debtFreeDate = customSchedule.length > 0
    ? format(addMonths(new Date(), customSchedule.length), 'MMMM yyyy')
    : '—';

  // Chart: show both schedules overlaid
  const maxMonths = Math.max(standardSchedule.length, customSchedule.length);
  const chartData = Array.from({ length: maxMonths }, (_, i) => ({
    month: i + 1,
    label: format(addMonths(new Date(), i + 1), 'MMM yy'),
    standard: standardSchedule[i]?.balance ?? 0,
    accelerated: customSchedule[i]?.balance ?? 0
  }));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <Link to="/loans" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Loans
        </Link>
        <h1 className="text-2xl font-bold">Repayment Planner</h1>
        <p className="text-blue-200 text-sm">Simulate early payoff & save on interest</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {loans.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No active loans to plan.</p>
          </div>
        ) : (
          <>
            {/* Loan Selector */}
            {loans.length > 1 && (
              <Card>
                <CardContent className="p-4">
                  <label className="text-xs text-gray-500 mb-1 block">Select Loan</label>
                  <Select value={selectedLoan?.id} onValueChange={id => {
                    const l = loans.find(x => x.id === id);
                    setSelectedLoan(l);
                    setCustomPayment(String(Math.round(l?.monthly_installment || 0)));
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {loans.map(l => (
                        <SelectItem key={l.id} value={l.id}>
                          UGX {(l.amount_requested / 1000).toFixed(0)}K — {l.purpose}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Custom Payment Input */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Standard Monthly Payment</label>
                  <p className="font-bold text-gray-800">UGX {minPayment.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Your Custom Monthly Payment (UGX)</label>
                  <Input
                    type="number"
                    value={customPayment}
                    onChange={e => setCustomPayment(e.target.value)}
                    placeholder={String(Math.round(minPayment))}
                  />
                  <p className="text-xs text-gray-400 mt-1">Increase this to pay off faster & save on interest</p>
                </div>
              </CardContent>
            </Card>

            {/* Savings Summary */}
            {customAmt > minPayment && interestSaved > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-3 text-center">
                    <Zap className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Interest Saved</p>
                    <p className="font-bold text-green-700 text-sm">UGX {(interestSaved/1000).toFixed(1)}K</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3 text-center">
                    <TrendingDown className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Months Saved</p>
                    <p className="font-bold text-blue-700 text-sm">{monthsSaved} months</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-3 text-center">
                    <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Debt-Free</p>
                    <p className="font-bold text-purple-700 text-xs leading-tight">{debtFreeDate}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Balance Over Time</CardTitle>
                  <p className="text-xs text-gray-400">Standard vs accelerated payoff</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 4)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v, n) => [`UGX ${v.toLocaleString('en-UG', { maximumFractionDigits: 0 })}`, n === 'standard' ? 'Standard' : 'Accelerated']} />
                      <Area type="monotone" dataKey="standard" stroke="#94a3b8" fill="#e2e8f0" strokeWidth={2} name="standard" />
                      <Area type="monotone" dataKey="accelerated" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} name="accelerated" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 justify-center mt-2 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-1 bg-slate-400 inline-block rounded" /> Standard</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-1 bg-blue-500 inline-block rounded" /> Accelerated</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Month-by-month table (first 6 months) */}
            {customSchedule.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">First 6 Months Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b">
                          <th className="text-left pb-2">Month</th>
                          <th className="text-right pb-2">Payment</th>
                          <th className="text-right pb-2">Interest</th>
                          <th className="text-right pb-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customSchedule.slice(0, 6).map((row, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-1.5 text-gray-600">{row.label}</td>
                            <td className="py-1.5 text-right text-gray-700">{customAmt.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</td>
                            <td className="py-1.5 text-right text-red-500">{row.interest.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</td>
                            <td className="py-1.5 text-right font-medium text-gray-800">{row.balance.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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