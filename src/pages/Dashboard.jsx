import { useState, useEffect, useRef } from 'react';
import ReferralCard from '@/components/referral/ReferralCard';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, ArrowUpRight, ArrowDownRight, Sparkles, Loader2, RefreshCw, TrendingUp, CreditCard, Shield, Wallet, TrendingDown, Users, Target, Activity, Handshake, Vault, GitCompare } from 'lucide-react';
import MilestoneProgress from '@/components/milestones/MilestoneProgress';
import ChallengesBoard from '@/components/dashboard/ChallengesBoard';
import UnlockRequirements from '@/components/kyc/UnlockRequirements';
import DailyWellnessJourney from '@/components/wellness/DailyWellnessJourney';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const TIP_STYLES = {
  warning: { bg: 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800', icon: 'text-amber-500', text: 'text-amber-800 dark:text-amber-200', sub: 'text-amber-600 dark:text-amber-300' },
  action: { bg: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800', icon: 'text-blue-500', text: 'text-blue-800 dark:text-blue-200', sub: 'text-blue-600 dark:text-blue-300' },
  positive: { bg: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800', icon: 'text-emerald-500', text: 'text-emerald-800 dark:text-emerald-200', sub: 'text-emerald-600 dark:text-emerald-300' },
  tip: { bg: 'bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800', icon: 'text-purple-500', text: 'text-purple-800 dark:text-purple-200', sub: 'text-purple-600 dark:text-purple-300' },
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [savings, setSavings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [badges, setBadges] = useState([]);
  const [creditScore, setCreditScore] = useState(null);
  const [totalInvestments, setTotalInvestments] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const pullStartY = useRef(0);
  const queryClient = useQueryClient();

  const loadData = async () => {
    const me = await base44.auth.me();
    setUser(me);
    const [l, s, n, b, scores, lenderInv, pockets, policies] = await Promise.all([
      base44.entities.LoanApplication.filter({}),
      base44.entities.SavingsPocket.filter({}),
      base44.entities.Notification.filter({ is_read: false }),
      base44.entities.GamificationBadge.filter({}),
      base44.entities.CreditScore.filter({ user_id: me.id }, '-calculated_at', 1),
      base44.entities.LenderInvestment.filter({ lender_id: me.id }),
      base44.entities.SavingsPocket.filter({ user_id: me.id }),
      base44.entities.InsurancePolicy.filter({ user_id: me.id }),
    ]);
    setLoans(l); setSavings(s); setNotifications(n); setBadges(b);
    if (scores.length > 0) setCreditScore(scores[0]);
    const p2pTotal = lenderInv.reduce((sum, i) => sum + (i.amount_invested || 0), 0);
    const savingsTotal = pockets.reduce((sum, p) => sum + (p.current_balance || 0), 0);
    const insuranceTotal = policies.reduce((sum, p) => sum + (p.total_premiums_paid || 0), 0);
    setTotalInvestments(p2pTotal + savingsTotal + insuranceTotal);
  };

  useEffect(() => { loadData(); }, []);

  const { data: tipsData, isLoading: loadingTips } = useQuery({
    queryKey: ['financialTips'],
    queryFn: () => base44.functions.invoke('financialTipsGenerator', {}).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    queryClient.invalidateQueries(['financialTips']);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Pull to refresh
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onTouchStart = (e) => { pullStartY.current = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      const delta = e.changedTouches[0].clientY - pullStartY.current;
      if (delta > 80 && el.scrollTop === 0) handleRefresh();
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
  }, []);

  const activeLoan = loans.find(l => l.status === 'active' || l.status === 'disbursed');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const QUICK_ACTIONS = [
    { icon: CreditCard, label: 'Apply Loan', path: '/loans/apply', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' },
    { icon: Wallet, label: 'Save', path: '/savings', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { icon: Target, label: 'Budget', path: '/budget', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' },
    { icon: Shield, label: 'Insure', path: '/insurance', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300' },
    { icon: TrendingDown, label: 'Debt', path: '/debt-payoff', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
    { icon: Users, label: 'Groups', path: '/savings-groups', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300' },
    { icon: Activity, label: 'Health', path: '/financial-health', color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300' },
    { icon: Target, label: 'Goals', path: '/savings-goals', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300' },
    { icon: Handshake, label: 'P2P', path: '/p2p', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' },
    { icon: GitCompare, label: 'Benchmark', path: '/benchmarking', color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300' },
  ];

  return (
    <div ref={scrollRef} className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-y-auto">
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center pt-4 pb-2">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg text-sm text-gray-600 dark:text-gray-300">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Refreshing...
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-14 pb-20">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-blue-200 text-sm font-medium">{greeting},</p>
            <h1 className="text-2xl font-bold tracking-tight">{user?.full_name?.split(' ')[0] || 'Welcome'} 👋</h1>
          </div>
          <Link to="/notifications" className="relative w-11 h-11 bg-white/10 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#F4B400] text-[#006B3C] text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </Link>
        </div>

        {/* Credit Score Banner */}
        <Link to="/credit-score">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-xs font-medium mb-0.5">Your Credit Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    {creditScore?.score ?? '—'}
                  </span>
                  {creditScore?.risk_band && (
                    <span className={`text-xs rounded-full px-2 py-0.5 mb-1 font-medium ${
                      creditScore.risk_band === 'A' ? 'bg-emerald-400/20 text-emerald-300' :
                      creditScore.risk_band === 'B' ? 'bg-blue-400/20 text-blue-300' :
                      creditScore.risk_band === 'C' ? 'bg-amber-400/20 text-amber-300' :
                      'bg-red-400/20 text-red-300'
                    }`}>
                      Band {creditScore.risk_band}
                    </span>
                  )}
                </div>
                <p className="text-blue-200 text-xs mt-1 opacity-80">
                  {creditScore ? 'Tap to view full report' : 'Tap to calculate your score'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-xs mb-1 font-medium">Available Credit</p>
                <p className="text-2xl font-bold">
                  {creditScore?.max_loan_limit
                    ? `UGX ${(creditScore.max_loan_limit / 1000).toFixed(0)}K`
                    : 'N/A'}
                </p>
                <Link to="/loans/apply" onClick={e => e.stopPropagation()}>
                  <button className="mt-2 bg-[#F4B400] hover:bg-yellow-500 text-[#006B3C] text-xs font-semibold rounded-xl px-4 py-2 transition-colors">
                    Apply Now
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="px-4 -mt-10 space-y-5 pb-32">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Investments</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">UGX {(totalInvestments / 1000).toFixed(0)}K</p>
            <p className="text-xs text-emerald-500 flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" /> {savings.length} pockets
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Active Loan</span>
            </div>
            {activeLoan ? (
              <>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  UGX {((activeLoan.outstanding_balance || activeLoan.amount_approved || 0) / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-orange-500 flex items-center gap-0.5 mt-1">
                  <ArrowDownRight className="w-3 h-3" /> Outstanding
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900 dark:text-white">None</p>
                <p className="text-xs text-gray-400 mt-1">No active loans</p>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ icon: Icon, label, path, color }) => (
              <Link key={label} to={path} className="flex flex-col items-center gap-1.5">
                <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center transition-transform active:scale-95`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* AI Financial Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" /> Your Insights
            </h2>
            <button onClick={handleRefresh} className="text-blue-500 text-xs font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {loadingTips ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex items-center justify-center gap-2 text-gray-400 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Analysing your finances…</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(tipsData?.tips || []).map((tip, i) => {
                const style = TIP_STYLES[tip.type] || TIP_STYLES.tip;
                return (
                  <div key={i} className={`rounded-2xl p-4 border ${style.bg}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl leading-none mt-0.5">{tip.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${style.text}`}>{tip.title}</p>
                        <p className={`text-xs mt-0.5 leading-relaxed ${style.sub}`}>{tip.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!tipsData?.tips || tipsData.tips.length === 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 text-center shadow-sm">
                  <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Log more transactions to unlock insights</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Savings Pockets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">My Savings</h2>
            <Link to="/savings" className="text-blue-500 text-xs font-medium flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {savings.length === 0 ? (
            <Link to="/savings">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-sm">
                <Vault className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Create your first savings pocket</p>
              </div>
            </Link>
          ) : (
            <div className="space-y-2.5">
              {savings.slice(0, 2).map(pocket => {
                const progress = pocket.goal_amount ? Math.min((pocket.current_balance / pocket.goal_amount) * 100, 100) : 0;
                return (
                  <div key={pocket.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{pocket.icon || '🎯'}</span>
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">{pocket.name}</p>
                          <p className="text-xs text-gray-400">Goal: UGX {(pocket.goal_amount / 1000).toFixed(0)}K</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        UGX {(pocket.current_balance / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{progress.toFixed(0)}% of goal</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Unlock Requirements */}
        <UnlockRequirements compact={true} />

        {/* Referral Card */}
        <ReferralCard />

        {/* Daily Wellness Journey */}
        {user && <DailyWellnessJourney userId={user.id} />}

        {/* Challenges & Milestones */}
        {user && (
          <>
            <div><ChallengesBoard userId={user.id} /></div>
            <div><MilestoneProgress userId={user.id} /></div>
          </>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-3">Achievements</h2>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {badges.map(badge => (
                <div key={badge.id} className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm text-center w-20">
                  <div className="text-2xl mb-1">🏆</div>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight">{badge.badge_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}