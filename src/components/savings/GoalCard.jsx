import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Zap, ChevronDown, ChevronUp, Trash2, CheckCircle } from 'lucide-react';
import DigitalPaymentModal from '@/components/payments/DigitalPaymentModal';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
  abandoned: 'bg-red-100 text-red-600'
};

export default function GoalCard({ goal, onUpdated, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const progress = goal.target_amount > 0
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0;
  const remaining = Math.max(0, (goal.target_amount || 0) - (goal.current_amount || 0));

  const handleContributeClick = () => {
    if (!parseFloat(amount)) return;
    setShowPayment(true);
  };

  const handlePaymentSuccess = (result) => {
    setShowPayment(false);
    setAmount('');
    if (result?.goal) onUpdated(result.goal);
    else {
      // Optimistic update with the paid amount
      onUpdated({ ...goal, current_amount: (goal.current_amount || 0) + (result.amount_paid || 0) });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this goal?')) return;
    await base44.functions.invoke('savingsGoalManager', { action: 'delete', goal_id: goal.id });
    onDeleted(goal.id);
  };

  const automationLabel = goal.automation_type === 'round_up'
    ? `⚡ Round-up (${goal.round_up_strategy === 'nearest_5000' ? '5K' : '1K'})`
    : goal.automation_type === 'fixed_transfer'
    ? `⚡ UGX ${goal.fixed_transfer_amount?.toLocaleString()} ${goal.fixed_transfer_frequency}`
    : null;

  return (
  <>
    <Card className="shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Top section */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{goal.emoji || '🎯'}</span>
              <div>
                <p className="font-semibold text-gray-800">{goal.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${STATUS_COLORS[goal.status] || STATUS_COLORS.active}`}>
                    {goal.status}
                  </Badge>
                  {automationLabel && (
                    <span className="text-xs text-blue-600 font-medium">{automationLabel}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-600">UGX {(goal.current_amount || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400">of {goal.target_amount?.toLocaleString()}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
            <div
              className={`h-2.5 rounded-full transition-all ${goal.status === 'completed' ? 'bg-blue-500' : 'bg-green-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-3">
            <span>{progress.toFixed(0)}% achieved</span>
            {remaining > 0 && <span>UGX {remaining.toLocaleString()} remaining</span>}
            {goal.status === 'completed' && <span className="text-blue-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Goal reached!</span>}
          </div>

          {/* Deadline */}
          {goal.deadline && goal.status === 'active' && (
            <p className="text-xs text-orange-500 mb-3">📅 Deadline: {new Date(goal.deadline).toLocaleDateString()}</p>
          )}

          {/* Contribute */}
          {goal.status === 'active' && (
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Add (UGX)"
                className="text-sm h-8"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <Button size="sm" className="bg-green-600 text-white h-8 px-3" onClick={handleContributeClick} disabled={!parseFloat(amount)}>
                Add
              </Button>
            </div>
          )}
        </div>

        {/* Expandable contributions + actions */}
        <div className="border-t">
          <button
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-50"
            onClick={() => setExpanded(!expanded)}
          >
            <span>{goal.recent_contributions?.length || 0} recent contributions</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {expanded && (
            <div className="px-4 pb-3 space-y-2">
              {(goal.recent_contributions || []).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No contributions yet</p>
              ) : (
                goal.recent_contributions.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span>{c.source === 'round_up' ? '⚡' : c.source === 'fixed_transfer' ? '🔄' : '💰'}</span>
                      <span className="text-gray-600">{c.notes || c.source}</span>
                    </div>
                    <span className="font-medium text-green-600">+UGX {c.amount?.toLocaleString()}</span>
                  </div>
                ))
              )}
              <div className="pt-2 flex justify-end">
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 h-7 px-2 text-xs" onClick={handleDelete}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete Goal
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {showPayment && (
      <DigitalPaymentModal
        paymentContext={{
          type: 'savings_goal',
          id: goal.id,
          amount: parseFloat(amount) || 0,
          label: `Contribute to "${goal.name}"`,
        }}
        onSuccess={handlePaymentSuccess}
        onClose={() => setShowPayment(false)}
      />
    )}
  </>
  );
}