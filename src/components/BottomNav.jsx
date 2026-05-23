import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, CreditCard, Wallet, Users, User } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/loans', icon: CreditCard, label: 'Loans' },
  { path: '/savings', icon: Wallet, label: 'Save' },
  { path: '/p2p', icon: Users, label: 'P2P' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = (e, path) => {
    if (location.pathname === path) {
      // Already on root path — scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (location.pathname.startsWith(path + '/')) {
      // On a sub-path — navigate to root path
      e.preventDefault();
      navigate(path);
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 flex items-center justify-around px-2 z-50"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)', paddingTop: '8px' }}
    >
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));
        return (
          <Link
            key={path}
            to={path}
            onClick={(e) => handleClick(e, path)}
            className={`flex flex-col items-center gap-0.5 min-w-[52px] min-h-[44px] justify-center rounded-xl transition-all duration-150 select-none ${
              active ? 'text-[#006B3C] dark:text-[#7BC943]' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-150 ${active ? 'bg-green-50 dark:bg-green-900/40' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}