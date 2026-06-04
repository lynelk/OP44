import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from './components/ErrorBoundary';
import AdminRoute from './components/AdminRoute';
import BottomNav from './components/BottomNav';
import MobileHeader from './components/MobileHeader';
import CommandPalette from './components/CommandPalette';
import { useEffect, lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { SyncProvider } from './lib/SyncContext';
import OfflineStatusBar from './components/OfflineStatusBar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Loans = lazy(() => import('./pages/Loans'));
const Savings = lazy(() => import('./pages/Savings'));
const SavingsHub = lazy(() => import('./pages/SavingsHub'));
const Budget = lazy(() => import('./pages/Budget'));
const Profile = lazy(() => import('./pages/Profile'));
const SavingsGoals = lazy(() => import('./pages/SavingsGoals'));
const LoanPreQualify = lazy(() => import('./pages/LoanPreQualify'));
const CreditScore = lazy(() => import('./pages/CreditScore'));
const Invest = lazy(() => import('./pages/Invest'));
const ConsentManager = lazy(() => import('./pages/ConsentManager'));
const USSDMonitor = lazy(() => import('./pages/USSDMonitor'));
const Insurance = lazy(() => import('./pages/Insurance'));
const FinancialHealth = lazy(() => import('./pages/FinancialHealth'));
const LoanStatement = lazy(() => import('./pages/LoanStatement'));
const RepayLoan = lazy(() => import('./pages/RepayLoan'));
const Claims = lazy(() => import('./pages/Claims'));
const ExpenseInsights = lazy(() => import('./pages/ExpenseInsights'));
const RepaymentPlanner = lazy(() => import('./pages/RepaymentPlanner'));
const FutureHealthProjection = lazy(() => import('./pages/FutureHealthProjection'));
const SavingsChallenges = lazy(() => import('./pages/SavingsChallenges'));
const DebtPayoff = lazy(() => import('./pages/DebtPayoff'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SavingsGroups = lazy(() => import('./pages/SavingsGroups'));
const SavingsGroupDetail = lazy(() => import('./pages/SavingsGroupDetail'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminRules = lazy(() => import('./pages/admin/AdminRules'));
const AdminCRB = lazy(() => import('./pages/admin/AdminCRB'));
const AdminSubmissions = lazy(() => import('./pages/admin/AdminSubmissions'));
const AdminLoans = lazy(() => import('./pages/admin/AdminLoans'));
const AdminRescheduleRequests = lazy(() => import('./pages/admin/AdminRescheduleRequests'));
const USSDSimulator = lazy(() => import('./pages/USSDSimulator'));
const GroupChallenges = lazy(() => import('./pages/GroupChallenges'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const P2POnboarding = lazy(() => import('./pages/P2POnboarding'));
const P2PDashboard = lazy(() => import('./pages/P2PDashboard'));
const P2PApply = lazy(() => import('./pages/P2PApply'));
const P2PMarketplace = lazy(() => import('./pages/P2PMarketplace'));
const AdminP2P = lazy(() => import('./pages/admin/AdminP2P'));
const AdminDocumentReview = lazy(() => import('./pages/admin/AdminDocumentReview'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminPortfolios = lazy(() => import('./pages/admin/AdminPortfolios'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const DataRights = lazy(() => import('./pages/DataRights'));
const AccessibilityStatement = lazy(() => import('./pages/AccessibilityStatement'));
const Benchmarking = lazy(() => import('./pages/Benchmarking'));
const CollectionsMonitor = lazy(() => import('./pages/CollectionsMonitor'));
const GPSTrackingDashboard = lazy(() => import('./pages/GPSTrackingDashboard'));
const DeviceVerificationQueue = lazy(() => import('./pages/admin/DeviceVerificationQueue'));
const RentalDisputeCenter = lazy(() => import('./pages/RentalDisputeCenter'));
const AdminRevenue = lazy(() => import('./pages/admin/AdminRevenue'));
const AdminAccountBalances = lazy(() => import('./pages/admin/AdminAccountBalances'));
const DeviceMaintenance = lazy(() => import('./pages/admin/DeviceMaintenance'));
const AdminAuditTrail = lazy(() => import('./pages/admin/AdminAuditTrail'));
const DeviceMarketplace = lazy(() => import('./pages/DeviceMarketplace'));
const LenderAnalytics = lazy(() => import('./pages/LenderAnalytics'));
const NetWorthCalculator = lazy(() => import('./pages/NetWorthCalculator'));
const DeleteAccount = lazy(() => import('./pages/DeleteAccount'));
const Support = lazy(() => import('./pages/Support'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Rosca = lazy(() => import('./pages/Rosca'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const P2PSecondaryMarket = lazy(() => import('./pages/P2PSecondaryMarket'));
const LinkedAccounts = lazy(() => import('./pages/LinkedAccounts'));

// Root paths get a fade transition; child paths slide in from the right
const ROOT_PATHS = ['/', '/loans', '/savings', '/budget', '/profile', '/credit-score', '/invest', '/insurance', '/financial-health', '/notifications', '/p2p', '/savings-goals', '/savings-groups', '/savings-challenges', '/group-challenges', '/debt-payoff', '/about', '/contact', '/privacy', '/terms', '/accessibility'];

const slideVariants = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: '-30%', transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function AnimatedRoutes({ children }) {
  const location = useLocation();
  const isRoot = ROOT_PATHS.includes(location.pathname);
  const variants = isRoot ? fadeVariants : slideVariants;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ position: 'relative', width: '100%', overflowX: 'hidden' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

const SPINNER = <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-100 border-t-[#0D1BFF] rounded-full animate-spin"></div></div>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  const location = useLocation();

  // Hide the quick-search launcher on public/auth pages
  const PUBLIC_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password', '/landing', '/about', '/contact', '/privacy', '/terms', '/accessibility', '/ussd'];
  const showPalette = isAuthenticated && !PUBLIC_PREFIXES.some(p => location.pathname.startsWith(p));

  if (isLoadingPublicSettings || isLoadingAuth) return SPINNER;

  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  // Render the main app
  return (
    <>
    <MobileHeader />
    {showPalette && <CommandPalette />}
    <AnimatedRoutes>
    <ErrorBoundary>
    <Suspense fallback={SPINNER}>
    <Routes location={location}>
      {/* Auth routes — public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public informational pages */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/accessibility" element={<AccessibilityStatement />} />
      <Route path="/ussd" element={<USSDSimulator />} />

      {/* All protected routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<><Dashboard /><BottomNav /></>} />
        <Route path="/loans" element={<><Loans /><BottomNav /></>} />
        <Route path="/loans/apply" element={<><Loans /><BottomNav /></>} />
        <Route path="/loans/statement" element={<><LoanStatement /><BottomNav /></>} />
        <Route path="/loans/repay" element={<><RepayLoan /><BottomNav /></>} />
        <Route path="/savings" element={<><SavingsHub /><BottomNav /></>} />
        <Route path="/savings/pockets" element={<><Savings /><BottomNav /></>} />
        <Route path="/budget" element={<><Budget /><BottomNav /></>} />
        <Route path="/profile" element={<><Profile /><BottomNav /></>} />
        <Route path="/credit-score" element={<><CreditScore /><BottomNav /></>} />
        <Route path="/consent" element={<><ConsentManager /><BottomNav /></>} />
        <Route path="/ussd-monitor" element={<><USSDMonitor /><BottomNav /></>} />
        <Route path="/insurance" element={<><Insurance /><BottomNav /></>} />
        <Route path="/insurance/claims" element={<><Claims /><BottomNav /></>} />
        <Route path="/loans/planner" element={<><RepaymentPlanner /><BottomNav /></>} />
        <Route path="/budget/insights" element={<><ExpenseInsights /><BottomNav /></>} />
        <Route path="/health/projection" element={<><FutureHealthProjection /><BottomNav /></>} />
        <Route path="/savings-challenges" element={<><SavingsChallenges /><BottomNav /></>} />
        <Route path="/group-challenges" element={<><GroupChallenges /><BottomNav /></>} />
        <Route path="/debt-payoff" element={<><DebtPayoff /><BottomNav /></>} />
        <Route path="/notifications" element={<><Notifications /><BottomNav /></>} />
        <Route path="/savings-groups" element={<><SavingsGroups /><BottomNav /></>} />
        <Route path="/savings-groups/:groupId" element={<><SavingsGroupDetail /><BottomNav /></>} />
        <Route path="/financial-health" element={<><FinancialHealth /><BottomNav /></>} />
        <Route path="/invest" element={<><Invest /><BottomNav /></>} />
        <Route path="/data-rights" element={<><DataRights /><BottomNav /></>} />
        <Route path="/benchmarking" element={<><Benchmarking /><BottomNav /></>} />
        <Route path="/gps-tracker" element={<><GPSTrackingDashboard /><BottomNav /></>} />
        <Route path="/disputes" element={<><RentalDisputeCenter /><BottomNav /></>} />
        <Route path="/marketplace" element={<><DeviceMarketplace /><BottomNav /></>} />
        <Route path="/lender-analytics" element={<><LenderAnalytics /><BottomNav /></>} />
        <Route path="/savings-goals" element={<><SavingsGoals /><BottomNav /></>} />
        <Route path="/loans/pre-qualify" element={<><LoanPreQualify /><BottomNav /></>} />
        <Route path="/net-worth" element={<><NetWorthCalculator /><BottomNav /></>} />
        <Route path="/support" element={<><Support /><BottomNav /></>} />
        <Route path="/rewards" element={<><Rewards /><BottomNav /></>} />
        <Route path="/referrals" element={<><Referrals /><BottomNav /></>} />
        <Route path="/rosca" element={<><Rosca /><BottomNav /></>} />
        <Route path="/notification-settings" element={<><NotificationSettings /><BottomNav /></>} />
        <Route path="/p2p/secondary" element={<><P2PSecondaryMarket /><BottomNav /></>} />
        <Route path="/budget/linked-accounts" element={<><LinkedAccounts /><BottomNav /></>} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="/p2p" element={<><P2PDashboard /><BottomNav /></>} />
        <Route path="/p2p/onboarding" element={<P2POnboarding />} />
        <Route path="/p2p/apply" element={<P2PApply />} />
        <Route path="/p2p/marketplace" element={<P2PMarketplace />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/rules" element={<AdminRoute><AdminRules /></AdminRoute>} />
        <Route path="/admin/crb" element={<AdminRoute><AdminCRB /></AdminRoute>} />
        <Route path="/admin/submissions" element={<AdminRoute><AdminSubmissions /></AdminRoute>} />
        <Route path="/admin/loans" element={<AdminRoute><AdminLoans /></AdminRoute>} />
        <Route path="/admin/loans/reschedule" element={<AdminRoute><AdminRescheduleRequests /></AdminRoute>} />
        <Route path="/admin/p2p" element={<AdminRoute><AdminP2P /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
        <Route path="/admin/portfolios" element={<AdminRoute><AdminPortfolios /></AdminRoute>} />
        <Route path="/admin/collections" element={<AdminRoute><CollectionsMonitor /></AdminRoute>} />
        <Route path="/admin/documents" element={<AdminRoute><AdminDocumentReview /></AdminRoute>} />
        <Route path="/admin/device-verification" element={<AdminRoute><DeviceVerificationQueue /></AdminRoute>} />
        <Route path="/admin/revenue" element={<AdminRoute><AdminRevenue /></AdminRoute>} />
        <Route path="/admin/account-balances" element={<AdminRoute><AdminAccountBalances /></AdminRoute>} />
        <Route path="/admin/device-maintenance" element={<AdminRoute><DeviceMaintenance /></AdminRoute>} />
        <Route path="/admin/audit-trail" element={<AdminRoute><AdminAuditTrail /></AdminRoute>} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
    </AnimatedRoutes>
    </>
  );
};


function App() {
  useEffect(() => {
    // Initialise error monitoring (no-op unless VITE_SENTRY_DSN + @sentry/react present)
    import('@/lib/monitoring').then(m => m.initMonitoring()).catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => {
      if (e.matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <SyncProvider>
            <Router>
              <OfflineStatusBar />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </SyncProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App