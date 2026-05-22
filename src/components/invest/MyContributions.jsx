import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, TrendingUp } from 'lucide-react';

const statusConfig = {
  active: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Active' },
  matured: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Matured' },
  withdrawn: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Withdrawn' },
};

export default function MyContributions({ contributions, pools, onRefresh }) {
  if (contributions.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        <p className="font-medium mb-1">No investments yet</p>
        <p className="text-sm">Browse the marketplace to start earning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contributions.map(c => {
        const pool = pools.find(p => p.id === c.investment_pool_id);
        const sc = statusConfig[c.status] || statusConfig.active;
        const maturityDate = c.maturity_date ? new Date(c.maturity_date) : null;
        const daysLeft = maturityDate
          ? Math.max(0, Math.ceil((maturityDate - new Date()) / (1000 * 60 * 60 * 24)))
          : null;

        return (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {pool?.pool_name || 'Investment Pool'}
                  </p>
                  {maturityDate && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {daysLeft > 0 ? `Matures in ${daysLeft} days` : 'Matured'}
                    </p>
                  )}
                </div>
                <Badge className={`${sc.color} border text-xs`}>{sc.label}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mt-2">
                <div>
                  <p className="text-xs text-slate-400">Invested</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {(c.contribution_amount / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Current Value</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {((c.current_contribution_value || c.contribution_amount) / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Returns</p>
                  <p className="text-sm font-semibold text-emerald-600 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {(c.total_returns_earned || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}