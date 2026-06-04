import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Plus, BarChart2, Camera, X, Building2 } from 'lucide-react';
import ExportExpensesCSV from '@/components/budget/ExportExpensesCSV';
import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import BudgetLimitsManager from '@/components/budget/BudgetLimitsManager';
import ReceiptScanner from '@/components/budget/ReceiptScanner';
import BudgetForecast from '@/components/budget/BudgetForecast';
import AffordabilityMeter from '@/components/budget/AffordabilityMeter';
import { usePageTitle } from '@/lib/usePageTitle';

const CATEGORIES = ['food','transport','housing','health','education','entertainment','utilities','clothing','savings','loan_repayment','other'];
const CATEGORY_COLORS = {
  food:'#f97316', transport:'#3b82f6', housing:'#8b5cf6', health:'#ef4444',
  education:'#06b6d4', entertainment:'#ec4899', utilities:'#f59e0b',
  clothing:'#10b981', savings:'#22c55e', loan_repayment:'#6366f1', other:'#94a3b8'
};
const CATEGORY_ICONS = {
  food:'🍔', transport:'🚌', housing:'🏠', health:'💊', education:'📚',
  entertainment:'🎬', utilities:'💡', clothing:'👗', savings:'💰', loan_repayment:'🏦', other:'📋'
};

export default function Budget() {
  usePageTitle('Budget');
  const [expenses, setExpenses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [user, setUser] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); base44.entities.Expense.filter({ user_id: u?.id }, '-created_date', 500).then(setExpenses).catch(() => null); }).catch(() => null);
  }, []);

  const handleAdd = async () => {
    if (!amount || !category) return;
    setAdding(true);
    const expense = await base44.entities.Expense.create({ user_id: user?.id, amount: parseFloat(amount), category, description, date });
    setExpenses(prev => [expense, ...prev]);
    setShowAdd(false); setAmount(''); setCategory(''); setDescription('');
    setAdding(false);
  };

  const totalSpend = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const byCategory = CATEGORIES.map(cat => ({
    name: cat.replace('_', ' '), value: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + (e.amount || 0), 0), color: CATEGORY_COLORS[cat],
  })).filter(c => c.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Budget & Expenses</h1>
        <p className="text-blue-100 text-sm">Total spent: <span className="font-bold text-white">UGX {totalSpend.toLocaleString()}</span></p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 h-10 bg-[#0D1BFF] hover:bg-[#0D1BFF]/90 text-white text-sm font-semibold px-4 rounded-full transition-colors">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
          <button onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 h-10 bg-[#32B4FF] text-white text-sm font-medium px-4 rounded-full">
            <Camera className="w-4 h-4" /> Scan Receipt
          </button>
          <Link to="/budget/insights">
            <div className="flex items-center gap-1.5 h-10 border border-[#0D1BFF]/30 dark:border-[#32B4FF]/30 text-[#0D1BFF] dark:text-[#32B4FF] text-sm font-medium px-4 rounded-full bg-white dark:bg-gray-900">
              <BarChart2 className="w-4 h-4" /> Insights
            </div>
          </Link>
          <ExportExpensesCSV expenses={expenses} />
          <Link to="/budget/linked-accounts">
            <div className="flex items-center gap-1.5 h-10 border border-[#0D1BFF]/30 dark:border-[#32B4FF]/30 text-[#0D1BFF] dark:text-[#32B4FF] text-sm font-medium px-4 rounded-full bg-white dark:bg-gray-900">
              <Building2 className="w-4 h-4" /> Linked Accounts
            </div>
          </Link>
        </div>

        {showScanner && (
          <ReceiptScanner userId={user?.id} onExpenseAdded={(e) => setExpenses(prev => [e, ...prev])} onClose={() => setShowScanner(false)} />
        )}

        {/* Add Form */}
        {showAdd && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">Add Expense</p>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <Input type="number" placeholder="Amount (UGX)" value={amount} onChange={e => setAmount(e.target.value)} className="h-11 rounded-xl" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="h-11 rounded-xl" />
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
              <button onClick={handleAdd} disabled={adding || !amount || !category}
                className="w-full h-11 bg-[#0D1BFF] disabled:opacity-50 text-white font-semibold rounded-xl">
                {adding ? 'Adding...' : 'Add Expense'}
              </button>
            </div>
          </div>
        )}

        {user && <AffordabilityMeter userId={user.id} expenses={expenses} />}

        {user && <BudgetLimitsManager userId={user.id} expenses={expenses} />}

        {/* AI Budget Forecast */}
        <BudgetForecast />

        {byCategory.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
            <p className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Spending Breakdown</p>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                  {byCategory.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val) => `UGX ${val.toLocaleString()}`} />
                <Legend iconType="circle" iconSize={8} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        )}

        {expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No expenses tracked yet</p>
            <p className="text-sm">Add your first expense above</p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Recent Transactions</p>
            <div className="space-y-2">
              {expenses.slice(0, 20).map(expense => (
                <div key={expense.id} className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${CATEGORY_COLORS[expense.category]}20` }}>
                      {CATEGORY_ICONS[expense.category] || '📋'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{expense.category?.replace('_', ' ')}</p>
                      {expense.description && <p className="text-xs text-gray-400">{expense.description}</p>}
                      <p className="text-xs text-gray-400">{expense.date}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-red-500">-{(expense.amount / 1000).toFixed(0)}K</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}