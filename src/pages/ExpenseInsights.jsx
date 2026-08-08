import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Wallet, AlertCircle, ChevronLeft, Sparkles, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { categorizeExpensesClient, generateRuleBasedSavingsTips } from '@/lib/budgetUtils';

const CATEGORY_COLORS = {
  food: '#f97316', transport: '#3b82f6', housing: '#8b5cf6',
  health: '#10b981', education: '#f59e0b', entertainment: '#ec4899',
  utilities: '#06b6d4', clothing: '#84cc16', savings: '#22c55e',
  loan_repayment: '#ef4444', other: '#9ca3af'
};

const CATEGORY_LABELS = {
  food: 'Food', transport: 'Transport', housing: 'Housing',
  health: 'Health', education: 'Education', entertainment: 'Entertainment',
  utilities: 'Utilities', clothing: 'Clothing', savings: 'Savings',
  loan_repayment: 'Loan Repayment', other: 'Other'
};

export default function ExpenseInsights() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [catResult, setCatResult] = useState(null);

  useEffect(() => {
    base44.entities.Expense.filter({}).then(data => {
      setExpenses(data);
      setLoading(false);
    });
  }, []);

  // Aggregate by category for current month
  const now = new Date();
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const lastMonth = expenses.filter(e => {
    const d = new Date(e.date);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  });

  const aggregateByCategory = (list) => {
    const map = {};
    list.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([cat, total]) => ({
      name: CATEGORY_LABELS[cat] || cat,
      value: total,
      category: cat
    })).sort((a, b) => b.value - a.value);
  };

  const thisMonthData = aggregateByCategory(thisMonth);
  const lastMonthData = aggregateByCategory(lastMonth);
  const totalThisMonth = thisMonth.reduce((s, e) => s + e.amount, 0);
  const totalLastMonth = lastMonth.reduce((s, e) => s + e.amount, 0);

  // Budget suggestion: 90% of average monthly spend per category
  const allMonthlyTotals = {};
  expenses.forEach(e => {
    const key = `${new Date(e.date).getFullYear()}-${new Date(e.date).getMonth()}-${e.category}`;
    allMonthlyTotals[key] = (allMonthlyTotals[key] || 0) + e.amount;
  });
  const categoryAverages = {};
  Object.entries(allMonthlyTotals).forEach(([key, val]) => {
    const cat = key.split('-')[2];
    if (!categoryAverages[cat]) categoryAverages[cat] = { total: 0, months: 0 };
    categoryAverages[cat].total += val;
    categoryAverages[cat].months += 1;
  });

  const budgetSuggestions = Object.entries(categoryAverages).map(([cat, { total, months }]) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || cat,
    avgMonthly: total / months,
    suggestedBudget: Math.round((total / months) * 0.9)
  })).sort((a, b) => b.avgMonthly - a.avgMonthly);

  const runAICategorizer = async () => {
    setCategorizing(true);
    setCatResult(null);
    const data = await categorizeExpensesClient();
    setCatResult(data);
    if (data?.updated > 0) {
      const updated = await base44.entities.Expense.filter({});
      setExpenses(updated);
    }
    setCategorizing(false);
  };

  const getAIInsights = async () => {
    setLoadingSuggestions(true);
    // Rule-based tips — no LLM credits used
    const tips = generateRuleBasedSavingsTips(budgetSuggestions);
    setSuggestions(tips);
    setLoadingSuggestions(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <Link to="/budget" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Budget
        </Link>
        <h1 className="text-2xl font-bold">Expense Insights</h1>
        <p className="text-blue-200 text-sm">Smart analysis of your spending</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Month Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">This Month</p>
              <p className="text-xl font-bold text-gray-800">UGX {(totalThisMonth/1000).toFixed(0)}K</p>
              {totalLastMonth > 0 && (
                <p className={`text-xs mt-1 ${totalThisMonth > totalLastMonth ? 'text-red-500' : 'text-green-500'}`}>
                  {totalThisMonth > totalLastMonth ? '▲' : '▼'} vs last month
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Last Month</p>
              <p className="text-xl font-bold text-gray-800">UGX {(totalLastMonth/1000).toFixed(0)}K</p>
              <p className="text-xs text-gray-400 mt-1">{lastMonthData.length} categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart */}
        {thisMonthData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">This Month by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={thisMonthData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value">
                    {thisMonthData.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.category] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `UGX ${v.toLocaleString('en-UG', { maximumFractionDigits: 0 })}`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {thisMonthData.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[item.category] || '#9ca3af' }} />
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">UGX {item.value.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
                      <span className="text-gray-400 text-xs ml-1">({totalThisMonth > 0 ? ((item.value/totalThisMonth)*100).toFixed(0) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggested Budget Limits */}
        {budgetSuggestions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-600" /> Suggested Monthly Budgets
              </CardTitle>
              <p className="text-xs text-gray-400">Based on your history (10% trimmed to help you save)</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {budgetSuggestions.slice(0, 6).map((b, i) => {
                const thisMonthSpend = thisMonthData.find(d => d.category === b.category)?.value || 0;
                const overBudget = thisMonthSpend > b.suggestedBudget;
                return (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{b.label}</p>
                      <p className="text-xs text-gray-400">Avg: UGX {b.avgMonthly.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${overBudget ? 'text-red-600' : 'text-green-600'}`}>
                        UGX {b.suggestedBudget.toLocaleString('en-UG', { maximumFractionDigits: 0 })}
                      </p>
                      {overBudget && <Badge className="bg-red-100 text-red-600 text-xs">Over budget</Badge>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* AI Categorizer */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" /> AI Expense Categorizer
            </CardTitle>
            <p className="text-xs text-gray-400">Auto-categorize uncategorized transactions using AI</p>
          </CardHeader>
          <CardContent>
            {catResult ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <p className="text-green-700 text-sm font-medium">{catResult.message}</p>
                </div>
                <Button onClick={runAICategorizer} variant="outline" className="w-full text-sm">
                  Run Again
                </Button>
              </div>
            ) : (
              <Button onClick={runAICategorizer} disabled={categorizing} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm">
                {categorizing ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Categorizing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Auto-Categorize with AI</>}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* AI Tips */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" /> AI Saving Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <Button onClick={getAIInsights} disabled={loadingSuggestions} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm">
                {loadingSuggestions ? 'Analysing...' : '✨ Get AI Savings Tips'}
              </Button>
            ) : (
              <ul className="space-y-2">
                {suggestions.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-purple-500 font-bold">{i + 1}.</span> {tip}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {expenses.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No expense data yet. Add expenses in the Budget tab.</p>
          </div>
        )}
      </div>
    </div>
  );
}