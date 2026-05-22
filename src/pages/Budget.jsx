import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Plus, TrendingDown, PieChart, BarChart2 } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import BudgetLimitsManager from '@/components/budget/BudgetLimitsManager';

const CATEGORIES = ['food', 'transport', 'housing', 'health', 'education', 'entertainment', 'utilities', 'clothing', 'savings', 'loan_repayment', 'other'];
const CATEGORY_COLORS = {
  food: '#f97316', transport: '#3b82f6', housing: '#8b5cf6', health: '#ef4444',
  education: '#06b6d4', entertainment: '#ec4899', utilities: '#f59e0b',
  clothing: '#10b981', savings: '#22c55e', loan_repayment: '#6366f1', other: '#94a3b8'
};

export default function Budget() {
  const [expenses, setExpenses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [user, setUser] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.Expense.filter({}).then(setExpenses);
    });
  }, []);

  const handleAdd = async () => {
    if (!amount || !category) return;
    setAdding(true);
    const expense = await base44.entities.Expense.create({
      user_id: user?.id,
      amount: parseFloat(amount),
      category,
      description,
      date,
    });
    setExpenses(prev => [expense, ...prev]);
    setShowAdd(false);
    setAmount(''); setCategory(''); setDescription('');
    setAdding(false);
  };

  const totalSpend = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const byCategory = CATEGORIES.map(cat => ({
    name: cat.replace('_', ' '),
    value: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + (e.amount || 0), 0),
    color: CATEGORY_COLORS[cat],
  })).filter(c => c.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold mb-1">Budget & Expenses</h1>
        <p className="text-blue-200 text-sm">Total spent: UGX {totalSpend.toLocaleString()}</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button className="bg-[#f97316] hover:bg-orange-600 text-white" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-4 h-4" /> Track Expense
          </Button>
          <Link to="/budget/insights">
            <Button variant="outline" className="w-full border-purple-500 text-purple-700">
              <BarChart2 className="w-4 h-4" /> Expense Insights
            </Button>
          </Link>
        </div>

        {showAdd && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input type="number" placeholder="Amount (UGX)" value={amount} onChange={e => setAmount(e.target.value)} />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleAdd} disabled={adding}>
                {adding ? 'Adding...' : 'Add Expense'}
              </Button>
            </CardContent>
          </Card>
        )}

        {user && <BudgetLimitsManager userId={user.id} expenses={expenses} />}

        {byCategory.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PieChart className="w-4 h-4" /> Spending Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPie>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {byCategory.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `UGX ${val.toLocaleString()}`} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No expenses tracked yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="font-semibold text-gray-700 text-sm">Recent Transactions</h2>
            {expenses.slice(0, 20).map(expense => (
              <Card key={expense.id} className="shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: CATEGORY_COLORS[expense.category] || '#94a3b8' }}>
                      {expense.category?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{expense.category?.replace('_', ' ')}</p>
                      {expense.description && <p className="text-xs text-gray-400">{expense.description}</p>}
                      <p className="text-xs text-gray-400">{expense.date}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-red-500">-UGX {expense.amount?.toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}