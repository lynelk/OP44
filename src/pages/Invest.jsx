import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, Wallet, ChevronRight, SlidersHorizontal, BarChart2, ArrowUpRight } from 'lucide-react';
import InvestModal from '@/components/invest/InvestModal';
import MyContributions from '@/components/invest/MyContributions';
import RiskProfileSetup from '@/components/invest/RiskProfileSetup';
import PortfolioDashboard from '@/components/invest/PortfolioDashboard';

const TABS = [
  { id: 'portfolio', label: 'Portfolio', icon: '📊' },
  { id: 'marketplace', label: 'Markets', icon: '🏪' },
  { id: 'my_investments', label: 'Mine', icon: '💼' },
  { id: 'risk_profile', label: 'Profile', icon: '⚙️' },
];

export default function Invest() {
  const [pools, setPools] = useState([]);
  const [myContributions, setMyContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedPool, setSelectedPool] = useState(null);
  const [tab, setTab] = useState('portfolio');
  const [profile, setProfile] = useState(null);
  const [profileData, setProfileData] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    const [poolsData, contribs] = await Promise.all([
      base44.entities.InvestmentPool.filter({ status: 'open_for_funding' }, '-created_date'),
      base44.entities.InvestorContribution.filter({ user_id: me.id }, '-invested_at'),
    ]);
    setPools(poolsData); setMyContributions(contribs);
    const res = await base44.functions.invoke('portfolioAllocator', { action: 'get_profile' });
    if (res.data) { setProfile(res.data.profile); setProfileData(res.data); }
    setLoading(false);
  };

  const riskConfig = {
    low:    { pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Low Risk' },
    medium: { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Medium Risk' },
    high:   { pill: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'High Risk' },
  };

  const totalInvested = myContributions.reduce((s, c) => s + (c.contribution_amount || 0), 0);
  const totalReturns = myContributions.reduce((s, c) => s + (c.total_returns_earned || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#0f2a55] via-[#1a3a6b] to-[#1e4480] text-white px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold tracking-tight">Invest & Earn</h1>
          <button onClick={() => setTab('risk_profile')} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
        <p className="text-blue-300 text-sm mb-5">{profile ? `${profile.risk_level} portfolio · ${pools.length} pools open` : 'Set up your risk profile to begin'}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-xs text-slate-300 mb-0.5">Total Invested</p>
            <p className="text-xl font-bold">UGX {(totalInvested / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-xs text-slate-300 mb-0.5">Returns Earned</p>
            <p className="text-xl font-bold text-emerald-400">UGX {(totalReturns / 1000).toFixed(0)}K</p>
            {totalInvested > 0 && <p className="text-xs text-emerald-300 mt-0.5 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />{((totalReturns / totalInvested) * 100).toFixed(1)}% ROI</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'text-[#1a3a6b] dark:text-blue-400 border-b-2 border-[#1a3a6b] dark:border-blue-400' : 'text-gray-400'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-28 animate-pulse" />)}
          </div>
        ) : tab === 'portfolio' ? (
          !profile ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-sm">
              <BarChart2 className="w-12 h-12 text-[#1a3a6b] mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No risk profile set</p>
              <p className="text-sm text-gray-400 mb-4">Set your risk appetite to get personalised portfolio allocation</p>
              <button onClick={() => setTab('risk_profile')}
                className="h-11 px-6 bg-[#1a3a6b] text-white font-semibold rounded-xl">
                Set Up Profile
              </button>
            </div>
          ) : (
            <PortfolioDashboard profile={profile} totalInvested={totalInvested}
              totalReturns={totalReturns} snapshots={profileData.snapshots}
              contributions={myContributions} onRefresh={loadData} />
          )
        ) : tab === 'marketplace' ? (
          pools.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">No investment pools available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map(pool => {
                const fundingPct = pool.target_amount > 0 ? Math.min((pool.current_amount_raised / pool.target_amount) * 100, 100) : 0;
                const rc = riskConfig[pool.risk_level] || riskConfig.medium;
                return (
                  <div key={pool.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedPool(pool)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">{pool.pool_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{pool.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 ml-2 mt-1" />
                    </div>
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rc.pill}`}>{rc.label}</span>
                      {pool.insurance_backed && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" /> Insured
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      {[
                        { label: 'Return', value: `${pool.interest_rate_offered}%`, color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Duration', value: `${pool.loan_duration_months}mo`, color: 'text-gray-800 dark:text-white' },
                        { label: 'Min.', value: `${(pool.min_investment_per_investor / 1000).toFixed(0)}K`, color: 'text-gray-800 dark:text-white' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2">
                          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                          <p className={`font-bold text-sm ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{fundingPct.toFixed(0)}% funded</span>
                        <span>UGX {(pool.current_amount_raised || 0).toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${fundingPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : tab === 'my_investments' ? (
          <MyContributions contributions={myContributions} pools={pools} onRefresh={loadData} />
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
            <RiskProfileSetup existing={profile} onSaved={(p) => { setProfile(p); setTab('portfolio'); loadData(); }} />
          </div>
        )}
      </div>

      {selectedPool && (
        <InvestModal pool={selectedPool} user={user}
          onClose={() => setSelectedPool(null)}
          onSuccess={() => { setSelectedPool(null); loadData(); }} />
      )}
    </div>
  );
}