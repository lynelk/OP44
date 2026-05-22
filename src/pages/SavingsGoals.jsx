import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Target, X } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f2952] via-[#1a3a6b] to-[#1e4d8c] text-white px-5 pt-14 pb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-0.5">Savings Goals</h1>
        <p className="text-blue-200 text-sm mb-5">Track and automate your savings targets</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active', value: activeGoals },
            { label: 'Completed', value: completedGoals },
            { label: 'Overall', value: `${overallProgress.toFixed(0)}%` },
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-blue-200 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
        {totalTarget > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-blue-200 mb-1.5">
              <span>UGX {totalSaved.toLocaleString()} saved</span>
              <span>of UGX {totalTarget.toLocaleString()}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div className="bg-emerald-400 h-1.5 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-3">
        <button
          className="w-full h-12 bg-[#1a3a6b] text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Create New Goal'}
        </button>

        {showForm && (
          <GoalForm onCreated={(goal) => { setGoals(prev => [{ ...goal, recent_contributions: [] }, ...prev]); setShowForm(false); }} />
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-[#1a3a6b] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading goals…</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-gray-500 dark:text-gray-400">No savings goals yet</p>
            <p className="text-sm mt-1">Create a goal to start saving toward something specific</p>
          </div>
        ) : (
          goals.map(goal => (
            <GoalCard key={goal.id} goal={goal}
              onUpdated={(updated) => setGoals(prev => prev.map(g => g.id === updated.id ? { ...updated, recent_contributions: g.recent_contributions } : g))}
              onDeleted={(id) => setGoals(prev => prev.filter(g => g.id !== id))}
            />
          ))
        )}
      </div>
    </div>
  );
}