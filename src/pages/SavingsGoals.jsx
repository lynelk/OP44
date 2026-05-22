import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, Zap, TrendingUp, CheckCircle, PauseCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import GoalForm from '@/components/savings/GoalForm';
import GoalCard from '@/components/savings/GoalCard';

export default function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);

  const loadGoals = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('savingsGoalManager', { action: 'list' });
    setGoals(res.data?.goals || []);
    setLoading(false);
  };

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); loadGoals(); });
  }, []);

  const totalTarget = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a3a6b] to-[#0d2a52] text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold mb-1">Savings Goals</h1>
        <p className="text-blue-200 text-sm mb-4">Track and automate your savings targets</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-xl font-bold">{activeGoals}</p>
            <p className="text-xs text-blue-200">Active</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-xl font-bold">{completedGoals}</p>
            <p className="text-xs text-blue-200">Completed</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-xl font-bold">{overallProgress.toFixed(0)}%</p>
            <p className="text-xs text-blue-200">Overall</p>
          </div>
        </div>
        {totalTarget > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-blue-200 mb-1">
              <span>UGX {totalSaved.toLocaleString()} saved</span>
              <span>of UGX {totalTarget.toLocaleString()}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-green-400 h-2 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-4">
        <Button
          className="w-full bg-[#1a3a6b] text-white"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Create New Goal'}
        </Button>

        {showForm && (
          <GoalForm
            onCreated={(goal) => {
              setGoals(prev => [{ ...goal, recent_contributions: [] }, ...prev]);
              setShowForm(false);
            }}
          />
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No savings goals yet</p>
            <p className="text-sm mt-1">Create a goal to start saving toward something specific</p>
          </div>
        ) : (
          goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdated={(updated) => setGoals(prev => prev.map(g => g.id === updated.id ? { ...updated, recent_contributions: g.recent_contributions } : g))}
              onDeleted={(id) => setGoals(prev => prev.filter(g => g.id !== id))}
            />
          ))
        )}
      </div>
    </div>
  );
}