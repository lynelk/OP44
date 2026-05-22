import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Shield, TrendingUp, AlertCircle } from 'lucide-react';

export default function InvestModal({ pool, user, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const projectedReturn = amount
    ? Math.round(parseFloat(amount) * (pool.interest_rate_offered / 100) * (pool.loan_duration_months / 12))
    : 0;

  const handleInvest = async () => {
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt < pool.min_investment_per_investor) {
      setError(`Minimum investment is UGX ${pool.min_investment_per_investor.toLocaleString()}`);
      return;
    }
    setLoading(true);
    await base44.entities.InvestorContribution.create({
      user_id: user.id,
      investment_pool_id: pool.id,
      contribution_amount: amt,
      current_contribution_value: amt,
      total_returns_earned: 0,
      status: 'active',
      invested_at: new Date().toISOString(),
      maturity_date: pool.maturity_date
    });

    // Update pool raised amount
    await base44.entities.InvestmentPool.update(pool.id, {
      current_amount_raised: (pool.current_amount_raised || 0) + amt
    });

    setLoading(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-lg">{pool.pool_name}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">{pool.description}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">Annual Return</p>
            <p className="text-xl font-bold text-emerald-600">{pool.interest_rate_offered}%</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">Duration</p>
            <p className="text-xl font-bold text-slate-700">{pool.loan_duration_months} months</p>
          </div>
        </div>

        {pool.insurance_backed && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-3 mb-4">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>This pool is insurance-backed for your protection.</span>
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Investment Amount (UGX)
          </label>
          <Input
            type="number"
            placeholder={`Min. ${pool.min_investment_per_investor.toLocaleString()}`}
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          {error && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}
        </div>

        {projectedReturn > 0 && (
          <div className="bg-emerald-50 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">Projected Return</span>
            </div>
            <span className="font-bold text-emerald-700">+ UGX {projectedReturn.toLocaleString()}</span>
          </div>
        )}

        <Button className="w-full" onClick={handleInvest} disabled={loading}>
          {loading ? 'Processing...' : 'Confirm Investment'}
        </Button>
        <Button variant="ghost" className="w-full mt-2" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}