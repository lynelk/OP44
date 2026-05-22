import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, Trash2 } from 'lucide-react';

const CATEGORIES = ['food', 'transport', 'housing', 'health', 'education', 'entertainment', 'utilities', 'clothing'];
const CATEGORY_COLORS = {
  food: '#f97316', transport: '#3b82f6', housing: '#8b5cf6', health: '#ef4444',
  education: '#06b6d4', entertainment: '#ec4899', utilities: '#f59e0b', clothing: '#10b981',
};

export default function BudgetLimitsManager({ userId, expenses }) {
  const [budgets, setBudgets] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState('food');
  const [newLimit, setNewLimit] = useState('');
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (!userId) return;
    base44.entities.BudgetCategory.filter({ user_id: userId }).then(setBudgets);
  }, [userId]);

  const getSpentThisMonth = (category) => {
    const startOfMonth = `${monthYear}-01`;
    return expenses
      .filter(e => e.category === category && e.date >= startOfMonth)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const handleAdd = async () => {
    if (!newLimit) return;
    setSaving(true);
    const budget = await base44.entities.BudgetCategory.create({
      user_id: userId,
      category: newCat,
      monthly_limit: parseFloat(newLimit),
      alert_threshold: 80,
      month_year: monthYear,
    });
    setBudgets(prev => [...prev, budget]);
    setNewLimit('');
    setShowAdd(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.BudgetCategory.delete(id);
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Bell className="w-4 h-4 text-orange-500" /> Budget Alerts</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3 h-3 mr-1" />Set Limit
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAdd && (
          <div className="bg-orange-50 rounded-xl p-3 space-y-2">
            <select
              className="w-full h-9 rounded-md border border-input px-3 text-sm"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <Input type="number" placeholder="Monthly limit (UGX)" value={newLimit} onChange={e => setNewLimit(e.target.value)} className="text-sm" />
            <Button size="sm" className="w-full bg-[#1a3a6b] text-white text-xs" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Add Alert'}
            </Button>
          </div>
        )}

        {budgets.length === 0 && !showAdd && (
          <p className="text-xs text-gray-400 text-center py-2">No budget limits set. Add one to get alerts when you overspend.</p>
        )}

        {budgets.map(budget => {
          const spent = getSpentThisMonth(budget.category);
          const pct = budget.monthly_limit > 0 ? Math.min(100, (spent / budget.monthly_limit) * 100) : 0;
          const isWarning = pct >= 80 && pct < 100;
          const isOver = pct >= 100;
          return (
            <div key={budget.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[budget.category] || '#94a3b8' }} />
                  <span className="text-xs font-medium capitalize">{budget.category}</span>
                  {isOver && <Badge className="text-xs bg-red-100 text-red-600 py-0">Over!</Badge>}
                  {isWarning && <Badge className="text-xs bg-orange-100 text-orange-600 py-0">{pct.toFixed(0)}%</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">UGX {spent.toLocaleString()} / {budget.monthly_limit.toLocaleString()}</span>
                  <button onClick={() => handleDelete(budget.id)}>
                    <Trash2 className="w-3 h-3 text-gray-300 hover:text-red-400" />
                  </button>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-green-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}