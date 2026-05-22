import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TrendingUp, Shield, Clock, ChevronRight, Wallet, Plus } from 'lucide-react';
import InvestModal from '@/components/invest/InvestModal';
import MyContributions from '@/components/invest/MyContributions';

export default function Invest() {
  const [pools, setPools] = useState([]);
  const [myContributions, setMyContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedPool, setSelectedPool] = useState(null);
  const [tab, setTab] = useState('marketplace');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    const [poolsData, contribs] = await Promise.all([
      base44.entities.InvestmentPool.filter({ status: 'open_for_funding' }, '-created_date'),
      base44.entities.InvestorContribution.filter({ user_id: me.id }, '-invested_at')
    ]);
    setPools(poolsData);
    setMyContributions(contribs);
    setLoading(false);
  };

  const riskConfig = {
    low: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Low Risk' },
    medium: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Medium Risk' },
    high: { color: 'bg-red-100 text-red-700 border-red-200', label: 'High Risk' },
  };

  const totalInvested = myContributions.reduce((s, c) => s + (c.contribution_amount || 0), 0);
  const totalReturns = myContributions.reduce((s, c) => s + (c.total_returns_earned || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 pt-12 pb-6">
        <h1 className="text-xl font-bold mb-1">Invest & Earn</h1>
        <p className="text-slate-400 text-sm">P2P marketplace — fund loans, earn returns</p>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-400">Total Invested</p>
            <p className="text-lg font-bold">UGX {totalInvested.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-400">Returns Earned</p>
            <p className="text-lg font-bold text-emerald-400">UGX {totalReturns.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
        {['marketplace', 'my_investments'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400'
            }`}
          >
            {t === 'marketplace' ? 'Marketplace' : 'My Investments'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : tab === 'marketplace' ? (
          pools.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p>No investment pools available right now.</p>
            </div>
          ) : (
            pools.map(pool => {
              const fundingPct = pool.target_amount > 0
                ? Math.min((pool.current_amount_raised / pool.target_amount) * 100, 100)
                : 0;
              const rc = riskConfig[pool.risk_level] || riskConfig.medium;
              return (
                <Card key={pool.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedPool(pool)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{pool.pool_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{pool.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge className={`${rc.color} border text-xs`}>{rc.label}</Badge>
                      {pool.insurance_backed && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-xs">
                          <Shield className="w-3 h-3 mr-1" /> Insured
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="bg-emerald-50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">Return</p>
                        <p className="font-bold text-emerald-600">{pool.interest_rate_offered}%</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">Duration</p>
                        <p className="font-bold text-slate-700">{pool.loan_duration_months}mo</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">Min. Invest</p>
                        <p className="font-bold text-slate-700 text-xs">
                          {(pool.min_investment_per_investor / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>

                    {/* Funding Progress */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{fundingPct.toFixed(0)}% funded</span>
                        <span>UGX {(pool.current_amount_raised || 0).toLocaleString()} / {pool.target_amount.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${fundingPct}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )
        ) : (
          <MyContributions contributions={myContributions} pools={pools} onRefresh={loadData} />
        )}
      </div>

      {selectedPool && (
        <InvestModal
          pool={selectedPool}
          user={user}
          onClose={() => setSelectedPool(null)}
          onSuccess={() => { setSelectedPool(null); loadData(); }}
        />
      )}
    </div>
  );
}