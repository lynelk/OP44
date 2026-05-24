import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const PAGE_TITLES = {
  '/': null,
  '/loans': 'Loans',
  '/loans/apply': 'Apply for Loan',
  '/loans/statement': 'Statement',
  '/loans/repay': 'Repay Loan',
  '/loans/planner': 'Repayment Planner',
  '/loans/pre-qualify': 'Pre-Qualification',
  '/savings': 'Savings',
  '/savings-goals': 'Savings Goals',
  '/savings-groups': 'Group Savings',
  '/budget': 'Budget',
  '/budget/insights': 'Insights',
  '/profile': 'Profile',
  '/credit-score': 'Credit Score',
  '/insurance': 'Insurance',
  '/insurance/claims': 'Claims',
  '/invest': 'Invest & Earn',
  '/financial-health': 'Financial Health',
  '/notifications': 'Notifications',
  '/consent': 'Privacy & Consent',
  '/debt-payoff': 'Debt Payoff',
  '/savings-challenges': 'Savings Challenges',
  '/group-challenges': 'Group Challenges',
  '/data-rights': 'My Data Rights',
  '/p2p': 'P2P Marketplace',
  '/p2p/onboarding': 'P2P Setup',
  '/p2p/apply': 'Apply for P2P Loan',
  '/p2p/marketplace': 'Loan Marketplace',
  '/savings-groups': 'Savings Groups',
  '/benchmarking': 'Benchmarking',
  '/health/projection': 'Health Projection',
  '/budget/insights': 'Budget Insights',
  '/ussd': 'USSD Simulator',
  '/ussd-monitor': 'USSD Monitor',
  '/gps-tracker': 'GPS Tracker',
  '/disputes': 'Dispute Center',
  '/marketplace': 'Asset Marketplace',
};

const ROOT_PATHS = ['/', '/loans', '/savings', '/invest', '/profile', '/budget', '/p2p', '/savings-groups', '/savings-challenges', '/group-challenges', '/notifications', '/debt-payoff', '/benchmarking'];

export default function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const isRoot = ROOT_PATHS.includes(path);
  const title = PAGE_TITLES[path];

  // Don't show header on landing/admin pages or pages with their own headers
  const hideOn = ['/landing', '/about', '/contact', '/admin', '/gps-tracker', '/disputes', '/marketplace', '/privacy', '/terms', '/accessibility'];
  if (hideOn.some(p => path.startsWith(p))) return null;

  // Hide on main tab pages that have their own full headers
  if (['/loans', '/savings', '/savings-goals', '/budget', '/invest', '/insurance', '/credit-score', '/financial-health'].includes(path)) return null;

  if (!title && isRoot) return null;
  if (!title) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between h-11 px-4">
        {!isRoot ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[#006B3C] font-medium text-sm min-w-[44px] min-h-[44px] flex items-center"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        ) : (
          <div className="w-16" />
        )}
        <p className="text-base font-semibold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">{title}</p>
        <div className="w-16" />
      </div>
    </div>
  );
}