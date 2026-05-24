import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Wallet, ShieldCheck, Star, Plus, ArrowRight, RefreshCw, AlertTriangle, CheckCircle2, Clock, Banknote, Users, BarChart3, Bell } from 'lucide-react';
import LenderAlertPreferences from '@/components/p2p/LenderAlertPreferences';
import { Button } from '@/components/ui/button';


const TIER_CONFIG = {
  platinum: { color: 'bg-slate-800', text: 'text-white', label: 'Platinum', emoji: '💎' },
  gold:     { color: 'bg-yellow-500', text: 'text-white', label: 'Gold', emoji: '🥇' },
  silver:   { color: 'bg-gray-400', text: 'text-white', label: 'Silver', emoji: '🥈' },
  bronze:   { color: 'bg-orange-700', text: 'text-white', label: 'Bronze', emoji: '🥉' },
  restricted: { color: 'bg-red-500', text: 'text-white', label: 'Restricted', emoji: '🔒' },
};

const STATUS_COLOR = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-amber-100 text-amber-700',
  awaiting_funding: 'bg-blue-100 text-blue-700',
  funded: 'bg-indigo-100 text-indigo-700',
  active: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-500',
  defaulted: 'bg-red-200 text-red-800',
};

export default function P2PDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [scoring, setScoring] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const load = async () => {
    setLoading(true);
    const [dash, score] = await Promise.all([
      base44.functions.invoke('p2pEngine', { action: 'get_dashboard' }).catch(() => ({ data: null })),
      base44.functions.invoke('p2pEngine', { action: 'score_borrower' }).catch(() => ({ data: null })),
    ]);
    setData(dash.data);
    setScoring(score.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-200 border-t-[#006B3C] rounded-full animate-spin" />
    </div>
  );

  if (!data?.profile) return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
        <Users className="w-10 h-10 text-[#7BC943]" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Set Up Your P2P Profile</h2>
      <p className="text-sm text-gray-500 mb-6">Join our peer-to-peer lending marketplace as a borrower, lender, or both.</p>
      <Button onClick={() => navigate('/p2p/onboarding')} className="bg-[#006B3C] hover:bg-[#005530] gap-2">
        Get Started <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );

  const profile = data.profile;
  const loans = data.loans || [];
  const investments = data.investments || [];
  const rewards = data.rewards || [];
  const tier = TIER_CONFIG[profile.risk_tier] || TIER_CONFIG.bronze;
  const activeLoans = loans.filter(l => ['active', 'disbursed', 'awaiting_funding', 'funded'].includes(l.status));
  const totalInvested = investments.reduce((s, i) => s + i.amount_invested, 0);
  const totalReturns = investments.reduce((s, i) => s + (i.actual_return_earned || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28 font-poppins">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">P2P Marketplace</h1>
            <p className="text-green-200 text-sm">Peer-to-Peer Lending</p>
          </div>
          <button onClick={load} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-green-200" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tier.color} ${tier.text}`}>
                {tier.emoji} {tier.label}
              </span>
              <span className="text-xs text-blue-300 capitalize">{profile.account_type}</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-200">Trust Score</p>
              <p className="text-lg font-black">{profile.trust_score || 0}<span className="text-xs text-blue-300">/100</span></p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-green-200">Loan Limit</p>
              <p className="text-sm font-bold">{scoring?.max_loan_limit ? `${(scoring.max_loan_limit / 1000000).toFixed(1)}M` : '—'}</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-xs text-green-200">Rate From</p>
              <p className="text-sm font-bold">{scoring?.rates?.final_interest_rate?.toFixed(1) || '—'}%/mo</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-200">Reputation</p>
              <p className="text-sm font-bold capitalize">{profile.reputation_level || 'new'}</p>
            </div>
          </div>
        </div>

        {/* KYC Alert */}
        {profile.kyc_status !== 'verified' && (
          <div className="mt-3 bg-amber-400/20 border border-amber-400/30 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <p className="text-xs text-amber-200">Complete KYC to unlock borrowing & investing</p>
            <Link to="/p2p/kyc" className="ml-auto text-xs text-amber-300 font-bold underline">Verify →</Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 sticky top-0 z-10">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'borrow', label: 'Borrow' },
          { id: 'invest', label: 'Invest' },
          { id: 'rewards', label: 'Rewards' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all ${activeTab === tab.id ? 'border-[#006B3C] text-[#006B3C]' : 'border-transparent text-gray-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-[#006B3C]" />
                  </div>
                  <span className="text-xs text-gray-500">Active Loans</span>
                </div>
                <p className="text-xl font-black text-gray-900">{activeLoans.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeLoans.length > 0 ? `UGX ${(activeLoans.reduce((s, l) => s + (l.outstanding_balance || 0), 0) / 1000).toFixed(0)}K outstanding` : 'No active loans'}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs text-gray-500">Invested</span>
                </div>
                <p className="text-xl font-black text-gray-900">{totalInvested > 0 ? `${(totalInvested / 1000000).toFixed(1)}M` : '—'}</p>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">+UGX {totalReturns.toLocaleString()} earned</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              {(profile.account_type === 'borrower' || profile.account_type === 'both') && (
                <Link to="/p2p/apply">
                  <div className="bg-gradient-to-br from-[#F4B400] to-yellow-500 text-[#006B3C] rounded-2xl p-4 shadow-md">
                    <Plus className="w-5 h-5 mb-2" />
                    <p className="font-bold text-sm">Apply for Loan</p>
                    <p className="text-xs text-[#006B3C]/70">Instant P2P credit</p>
                  </div>
                </Link>
              )}
              {(profile.account_type === 'lender' || profile.account_type === 'both') && (
                <Link to="/p2p/marketplace">
                  <div className="bg-gradient-to-br from-[#006B3C] to-[#7BC943] text-white rounded-2xl p-4 shadow-md">
                    <BarChart3 className="w-5 h-5 mb-2" />
                    <p className="font-bold text-sm">Browse Loans</p>
                    <p className="text-xs text-green-100">Fund & earn returns</p>
                  </div>
                </Link>
              )}
            </div>

            {/* Recent Loans */}
            {loans.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Recent Applications</p>
                <div className="space-y-2">
                  {loans.slice(0, 3).map(loan => (
                    <div key={loan.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">UGX {loan.amount_requested?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{loan.purpose} · {loan.tenure_months}mo · #{loan.loan_ref}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[loan.status] || 'bg-gray-100 text-gray-600'}`}>
                        {loan.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BORROW TAB */}
        {activeTab === 'borrow' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <p className="font-bold text-gray-900">Your Borrowing Profile</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Max Limit</p>
                  <p className="font-bold text-[#006B3C]">UGX {scoring?.max_loan_limit?.toLocaleString() || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Interest Rate</p>
                  <p className="font-bold text-orange-600">{scoring?.rates?.final_interest_rate?.toFixed(1) || '—'}%/mo</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Risk Band</p>
                  <p className="font-bold">{scoring?.band || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Consecutive Payments</p>
                  <p className="font-bold text-emerald-600">{profile.consecutive_on_time_payments || 0}</p>
                </div>
              </div>
            </div>
            <Link to="/p2p/apply">
              <Button className="w-full bg-[#F4B400] hover:bg-yellow-500 text-[#006B3C] h-12 text-base font-bold gap-2">
                <Plus className="w-5 h-5" /> Apply for a P2P Loan
              </Button>
            </Link>
            <div className="space-y-2">
              {loans.map(loan => (
                <div key={loan.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">UGX {loan.amount_requested?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{loan.loan_ref} · {loan.purpose}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLOR[loan.status] || 'bg-gray-100 text-gray-600'}`}>
                      {loan.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {['active', 'disbursed'].includes(loan.status) && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Outstanding</span>
                        <span>UGX {loan.outstanding_balance?.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, ((loan.total_repayable - loan.outstanding_balance) / loan.total_repayable) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loans.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Banknote className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No loan applications yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INVEST TAB */}
        {activeTab === 'invest' && (
          <div className="space-y-3">
            {/* Lender Alert Preferences — shown to lenders/both */}
            {(profile.account_type === 'lender' || profile.account_type === 'both') && (
              <LenderAlertPreferences profile={profile} onSaved={load} />
            )}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-2xl p-4">
              <p className="text-sm font-bold mb-3">Your Investment Portfolio</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-emerald-200">Invested</p>
                  <p className="font-black">UGX {(totalInvested / 1000).toFixed(0)}K</p>
                </div>
                <div className="border-x border-white/20">
                  <p className="text-xs text-emerald-200">Returns</p>
                  <p className="font-black text-yellow-300">+{(totalReturns / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-200">Active</p>
                  <p className="font-black">{investments.filter(i => i.status === 'active').length}</p>
                </div>
              </div>
            </div>
            <Link to="/p2p/marketplace">
              <Button className="w-full bg-[#006B3C] hover:bg-[#005530] gap-2 h-12 font-bold">
                <BarChart3 className="w-5 h-5" /> Browse Loans to Fund
              </Button>
            </Link>
            <div className="space-y-2">
              {investments.map(inv => (
                <div key={inv.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-sm">UGX {inv.amount_invested?.toLocaleString()}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inv.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{inv.ownership_pct?.toFixed(1)}% ownership · Matures {inv.maturity_date}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">+UGX {(inv.actual_return_earned || 0).toLocaleString()} earned</p>
                </div>
              ))}
              {investments.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No investments yet. Browse the marketplace!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REWARDS TAB */}
        {activeTab === 'rewards' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-bold text-gray-900 mb-3">Loyalty & Rewards</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-lg font-black text-amber-600">{profile.loyalty_points || 0}</p>
                  <p className="text-xs text-gray-500">Points</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-lg font-black text-blue-600">{profile.consecutive_on_time_payments || 0}</p>
                  <p className="text-xs text-gray-500">On-Time Streak</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-lg font-black text-emerald-600">{profile.total_loans_completed || 0}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {rewards.length > 0 ? rewards.map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900 capitalize">{r.reward_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500 capitalize">{r.reward_reason?.replace(/_/g, ' ')}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.status}
                  </span>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-400">
                  <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Make on-time repayments to earn rewards!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}