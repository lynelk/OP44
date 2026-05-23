import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useEffect } from 'react';
// Add page imports here
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import Savings from './pages/Savings';
import Budget from './pages/Budget';
import Profile from './pages/Profile';
import SavingsGoals from './pages/SavingsGoals';
import LoanPreQualify from './pages/LoanPreQualify';
import BottomNav from './components/BottomNav';
import CreditScore from './pages/CreditScore';
import Invest from './pages/Invest';
import ConsentManager from './pages/ConsentManager';
import USSDMonitor from './pages/USSDMonitor';
import Insurance from './pages/Insurance';
import FinancialHealth from './pages/FinancialHealth';
import LoanStatement from './pages/LoanStatement';
import RepayLoan from './pages/RepayLoan';
import Claims from './pages/Claims';
import ExpenseInsights from './pages/ExpenseInsights';
import RepaymentPlanner from './pages/RepaymentPlanner';
import FutureHealthProjection from './pages/FutureHealthProjection';
import SavingsChallenges from './pages/SavingsChallenges';
import DebtPayoff from './pages/DebtPayoff';
import Notifications from './pages/Notifications';
import SavingsGroups from './pages/SavingsGroups';
import SavingsGroupDetail from './pages/SavingsGroupDetail';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProducts from './pages/admin/AdminProducts';
import AdminRules from './pages/admin/AdminRules';
import AdminCRB from './pages/admin/AdminCRB';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminLoans from './pages/admin/AdminLoans';
import AdminRescheduleRequests from './pages/admin/AdminRescheduleRequests';
import USSDSimulator from './pages/USSDSimulator';
import MobileHeader from './components/MobileHeader';
import GroupChallenges from './pages/GroupChallenges';
import About from './pages/About';
import Contact from './pages/Contact';
import P2POnboarding from './pages/P2POnboarding';
import P2PDashboard from './pages/P2PDashboard';
import P2PApply from './pages/P2PApply';
import P2PMarketplace from './pages/P2PMarketplace';
import AdminP2P from './pages/admin/AdminP2P';
import AdminReports from './pages/admin/AdminReports';
import AdminPortfolios from './pages/admin/AdminPortfolios';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DataRights from './pages/DataRights';
import AccessibilityStatement from './pages/AccessibilityStatement';
import ErrorBoundary from './components/ErrorBoundary';

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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <>
    <MobileHeader />
    <AnimatedRoutes>
    <Routes location={location}>
      {/* Add your page Route elements here */}
      <Route path="/" element={<><Dashboard /><BottomNav /></>} />
      <Route path="/loans" element={<><Loans /><BottomNav /></>} />
      <Route path="/loans/apply" element={<><Loans /><BottomNav /></>} />
      <Route path="/loans/statement" element={<><LoanStatement /><BottomNav /></>} />
      <Route path="/loans/repay" element={<><RepayLoan /><BottomNav /></>} />
      <Route path="/savings" element={<><Savings /><BottomNav /></>} />
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
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/products" element={<AdminProducts />} />
      <Route path="/admin/rules" element={<AdminRules />} />
      <Route path="/admin/crb" element={<AdminCRB />} />
      <Route path="/admin/submissions" element={<AdminSubmissions />} />
      <Route path="/admin/loans" element={<AdminLoans />} />
      <Route path="/admin/loans/reschedule" element={<AdminRescheduleRequests />} />
      <Route path="/ussd" element={<USSDSimulator />} />
      <Route path="/p2p" element={<><P2PDashboard /><BottomNav /></>} />
      <Route path="/p2p/onboarding" element={<P2POnboarding />} />
      <Route path="/p2p/apply" element={<P2PApply />} />
      <Route path="/p2p/marketplace" element={<P2PMarketplace />} />
      <Route path="/admin/p2p" element={<AdminP2P />} />
      <Route path="/admin/reports" element={<AdminReports />} />
      <Route path="/admin/portfolios" element={<AdminPortfolios />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/data-rights" element={<><DataRights /><BottomNav /></>} />
      <Route path="/accessibility" element={<AccessibilityStatement />} />
      <Route path="/savings-goals" element={<><SavingsGoals /><BottomNav /></>} />
      <Route path="/loans/pre-qualify" element={<><LoanPreQualify /><BottomNav /></>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </AnimatedRoutes>
    </>
  );
};


function App() {
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
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App