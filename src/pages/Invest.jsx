import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, Wallet, ChevronRight, SlidersHorizontal, BarChart2 } from 'lucide-react';
import InvestModal from '@/components/invest/InvestModal';
import MyContributions from '@/components/invest/MyContributions';
import RiskProfileSetup from '@/components/invest/RiskProfileSetup';
import PortfolioDashboard from '@/components/invest/PortfolioDashboard';

export default function Invest() {
  const [pools, setPools] = useState([]);
  const [myContributions, setMyContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedPool, setSelectedPool] = useState(null);
  const [tab, setTab] = useState('portfolio');
  const [profile, setProfile] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [showRiskSetup, setShowRiskSetup] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    const [poolsData, contribs] = await Promise.all([
      base44.entities.InvestmentPool.filter({ status: 'open_for_funding' }, '-created_date'),
      base44.entities.InvestorContribution.filter({ user_id: me.id }, '-invested_at'),
    ]);
    setPools(poolsData);
    setMyContributions(contribs);

    // Load portfolio data
    const res = await base44.functions.invoke('portfolioAllocator', { action: 'get_profile' });
    if (res.data) {
      setProfile(res.data.profile);
      setProfileData(res.data);
    }
    setLoading(false);
  };

  const riskConfig = {
    low: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Low Risk' },
    medium: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Medium Risk' },
    high: { color: 'bg-red-100 text-red-700 border-red-200', label: 'High Risk' },
  };

  const totalInvested = myContributions.reduce((s, c) => s + (c.contribution_amount || 0), 0);
  const totalReturns = myContributions.reduce((s, c) => s + (c.total_returns_earned || 0), 0);

  const TABS = [
    { id: 'portfolio', label: '📊 Portfolio' },
    { id: 'marketplace', label: '🏪 Marketplace' },
    { id: 'my_investments', label: '💼 Mine' },
    { id: 'risk_profile', label: '⚙️ Profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-[#1a3a6b] text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Invest & Earn</h1>
          <button onClick={() => setTab('risk_profile')} className="bg-white/10 rounded-full p-2">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
        <p className="text-blue-300 text-sm">
          {profile ? `${profile.risk_level} portfolio` : 'Set up your risk profile to begin'}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">Total Invested</p>
            <p className="text-lg font-bold">UGX {totalInvested.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">Returns Earned</p>
            <p className="text-lg font-bold text-emerald-400">UGX {totalReturns.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-medium whitespace-nowrap px-2 transition-colors ${
              tab === t.id ? 'text-[#1a3a6b] border-b-2 border-[#1a3a6b]' : 'text-slate-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1a3a6b] rounded-full animate-spin" />
          </div>
        ) : tab === 'portfolio' ? (
          <div className="space-y-4">
            {!profile ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <BarChart2 className="w-12 h-12 text-[#1a3a6b] mx-auto mb-3 opacity-50" />
                  <p className="font-semibold text-gray-700 mb-1">No risk profile set</p>
                  <p className="text-sm text-gray-400 mb-4">Set your risk appetite to get personalised portfolio allocation</p>
                  <Button className="bg-[#1a3a6b] text-white" onClick={() => setTab('risk_profile')}>
                    Set Up Profile
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <PortfolioDashboard
                profile={profile}
                totalInvested={totalInvested}
                totalReturns={totalReturns}
                snapshots={profileData.snapshots}
                contributions={myContributions}
                onRefresh={loadData}
              />
            )}
          </div>
        ) : tab === 'marketplace' ? (
          <div className="space-y-3">
            {pools.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p>No investment pools available right now.</p>
              </div>
            ) : pools.map(pool => {
              const fundingPct = pool.target_amount > 0
                ? Math.min((pool.current_amount_raised / pool.target_amount) * 100, 100) : 0;
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
                        <p className="text-xs text-slate-500">Min.</p>
                        <p className="font-bold text-slate-700 text-xs">{(pool.min_investment_per_investor / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{fundingPct.toFixed(0)}% funded</span>
                        <span>UGX {(pool.current_amount_raised || 0).toLocaleString()} / {pool.target_amount.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fundingPct}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : tab === 'my_investments' ? (
          <MyContributions contributions={myContributions} pools={pools} onRefresh={loadData} />
        ) : tab === 'risk_profile' ? (
          <Card>
            <CardContent className="p-4">
              <RiskProfileSetup
                existing={profile}
                onSaved={(p) => { setProfile(p); setTab('portfolio'); loadData(); }}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {selectedPool && (
        <InvestModal pool={selectedPool} user={user}
          onClose={() => setSelectedPool(null)}
          onSuccess={() => { setSelectedPool(null); loadData(); }} />
      )}
    </div>
  );
}