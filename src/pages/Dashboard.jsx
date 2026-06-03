import { useState, useEffect, useRef } from 'react';
import ReferralCard from '@/components/referral/ReferralCard';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, ArrowUpRight, ArrowDownRight, Sparkles, Loader2, RefreshCw, TrendingUp, CreditCard, Shield, Wallet, TrendingDown, Users, Target, Activity, Handshake, Vault, PieChart } from 'lucide-react';
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

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const loadData = async () => {
    const me = await base44.auth.me();
    setUser(me);

    // Batch 1: core data
    const [l, n, scores] = await Promise.all([
      base44.entities.LoanApplication.filter({ user_id: me.id }),
      base44.entities.Notification.filter({ user_id: me.id, is_read: false }),
      base44.entities.CreditScore.filter({ user_id: me.id }, '-calculated_at', 1),
    ]);
    setLoans(l); setNotifications(n);
    if (scores.length > 0) setCreditScore(scores[0]);

    // Stagger batch 2 to avoid rate limits
    await sleep(300);
    const [pockets, b] = await Promise.all([
      base44.entities.SavingsPocket.filter({ user_id: me.id }),
      base44.entities.GamificationBadge.filter({ user_id: me.id }),
    ]);
    setSavings(pockets); setBadges(b);

    // Stagger batch 3
    await sleep(300);
    const [lenderInv, policies] = await Promise.all([
      base44.entities.LenderInvestment.filter({ lender_id: me.id }),
      base44.entities.InsurancePolicy.filter({ user_id: me.id }),
    ]);
    const p2pTotal = lenderInv.reduce((sum, i) => sum + (i.amount_invested || 0), 0);
    const savingsTotal = pockets.reduce((sum, p) => sum + (p.current_balance || 0), 0);
    const insuranceTotal = policies.reduce((sum, p) => sum + (p.total_premiums_paid || 0), 0);
    setTotalInvestments(p2pTotal + savingsTotal + insuranceTotal);
  };

  useEffect(() => { loadData(); }, []);

  const { data: tipsData, isLoading: loadingTips } = useQuery({
    queryKey: ['financialTips'],
    queryFn: () => base44.functions.invoke('financialTipsGenerator', {}).then(r => r.data),
    staleTime: 1000 * 60 * 30,   // cache for 30 min
    gcTime: 1000 * 60 * 60,      // keep in cache for 1 hour
    retry: false,                  // don't retry on 429
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
  // OpFin brand colors
  const PRIMARY = '#0D1BFF';
  const LIGHT = '#32B4FF';
  const SUCCESS = '#00C48C';

  const formatCurrency = (amount) => {
    if (!amount) return 'UGX 0';
    return `UGX ${amount.toLocaleString('en-UG')}`;
  };

  const QUICK_ACTIONS = [
    { icon: CreditCard, label: 'Apply Loan', path: '/loans/apply', color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
    { icon: Wallet, label: 'Save', path: '/savings', color: 'bg-[#00C48C]/10 text-[#00C48C] dark:bg-[#00C48C]/20 dark:text-[#00C48C]' },
    { icon: Shield, label: 'Insure', path: '/insurance', color: 'bg-[#32B4FF]/10 text-[#32B4FF] dark:bg-[#32B4FF]/20 dark:text-[#32B4FF]' },
    { icon: TrendingUp, label: 'Invest', path: '/invest', color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
    { icon: TrendingDown, label: 'Debt', path: '/debt-payoff', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
    { icon: Users, label: 'Groups', path: '/savings-groups', color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
    { icon: Activity, label: 'Health', path: '/financial-health', color: 'bg-[#00C48C]/10 text-[#00C48C] dark:bg-[#00C48C]/20 dark:text-[#00C48C]' },
    { icon: Handshake, label: 'P2P', path: '/p2p', color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
    { icon: PieChart, label: 'Net Worth', path: '/net-worth', color: 'bg-[#32B4FF]/10 text-[#32B4FF] dark:bg-[#32B4FF]/20 dark:text-[#32B4FF]' },
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
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-20">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-blue-100 text-sm font-medium">{greeting},</p>
            <h1 className="text-2xl font-bold tracking-tight">{user?.full_name?.split(' ')[0] || 'Welcome'} 👋</h1>
          </div>
          <Link to="/notifications" className="relative w-11 h-11 bg-white/10 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#00C48C] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
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
                <p className="text-blue-100 text-xs font-medium mb-0.5">Your Credit Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    {creditScore?.score ?? '—'}
                  </span>
                  {creditScore?.risk_band && (
                    <span className={`text-xs rounded-full px-2 py-0.5 mb-1 font-medium ${
                      creditScore.risk_band === 'A' ? 'bg-[#00C48C]/30 text-[#00C48C]' :
                      creditScore.risk_band === 'B' ? 'bg-[#32B4FF]/30 text-[#32B4FF]' :
                      creditScore.risk_band === 'C' ? 'bg-amber-400/20 text-amber-300' :
                      'bg-red-400/20 text-red-300'
                    }`}>
                      Band {creditScore.risk_band}
                    </span>
                  )}
                </div>
                <p className="text-green-200 text-xs mt-1 opacity-80">
                  {creditScore ? 'Tap to view full report' : 'Tap to calculate your score'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-xs mb-1 font-medium">Available Credit</p>
                <p className="text-2xl font-bold">
                  {creditScore?.max_loan_limit
                    ? formatCurrency(creditScore.max_loan_limit)
                    : 'N/A'}
                </p>
                <button
                  className="mt-2 bg-[#00C48C] hover:bg-[#00a878] text-white text-xs font-semibold rounded-xl px-4 py-2 transition-colors"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = '/loans/apply'; }}
                >
                  Apply Now
                </button>
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
              <div className="w-8 h-8 bg-[#00C48C]/10 dark:bg-[#00C48C]/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#00C48C]" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Investments</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalInvestments)}</p>
            <p className="text-xs text-[#00C48C] flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" /> {savings.length} pockets
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#0D1BFF] dark:text-[#32B4FF]" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Active Loan</span>
            </div>
            {activeLoan ? (
              <>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(activeLoan.outstanding_balance || activeLoan.amount_approved || 0)}
                </p>
                <p className="text-xs text-[#32B4FF] flex items-center gap-0.5 mt-1">
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
            <button onClick={handleRefresh} className="text-[#0D1BFF] text-xs font-bold flex items-center gap-1 hover:text-[#32B4FF] transition-colors">
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
            <Link to="/savings" className="text-[#0D1BFF] text-xs font-medium flex items-center gap-0.5">
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
                          <p className="text-xs text-gray-400">Goal: {formatCurrency(pocket.goal_amount)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#0D1BFF] dark:text-[#32B4FF]">
                        {formatCurrency(pocket.current_balance)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
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

        {/* Journey teaser — tap to explore more */}
        <Link to="/profile">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">My Journey</p>
                <p className="text-xs text-gray-400">Challenges, milestones & badges</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>
        </Link>
      </div>
    </div>
  );
}