import { Link, useLocation } from 'react-router-dom';
import { Home, CreditCard, PiggyBank, Receipt, User } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/loans', icon: CreditCard, label: 'Loans' },
  { path: '/savings', icon: PiggyBank, label: 'Save' },
  { path: '/budget', icon: Receipt, label: 'Budget' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 z-50 max-w-md mx-auto">
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        return (
          <Link key={path} to={path} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl ${active ? 'text-[#1a3a6b]' : 'text-gray-400'}`}>
            <Icon className={`w-5 h-5 ${active ? 'text-[#1a3a6b]' : ''}`} />
            <span className={`text-xs ${active ? 'font-semibold' : ''}`}>{label}</span>
            {active && <div className="w-1 h-1 bg-[#1a3a6b] rounded-full" />}
          </Link>
        );
      })}
    </div>
  );
}