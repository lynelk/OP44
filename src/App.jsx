import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import Savings from './pages/Savings';
import Budget from './pages/Budget';
import Profile from './pages/Profile';
import GitHubDashboard from './pages/GitHubDashboard';
import DriveReview from './pages/DriveReview';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    <Routes>
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
      <Route path="/financial-health" element={<><FinancialHealth /><BottomNav /></>} />
      <Route path="/invest" element={<><Invest /><BottomNav /></>} />
      <Route path="/github" element={<GitHubDashboard />} />
      <Route path="/drive-review" element={<DriveReview />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App