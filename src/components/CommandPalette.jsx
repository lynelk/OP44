/**
 * CommandPalette — global ⌘K / Ctrl+K quick navigation.
 * Solves discoverability of the 59 pages behind a 5-item bottom nav.
 * Mount once at the app root; opens on keyboard shortcut or the floating button.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  Home, CreditCard, PiggyBank, Wallet, User, TrendingUp, Shield, Activity, Bell,
  Gift, Users, LifeBuoy, BarChart3, Landmark, RefreshCw, Calculator, FileText, Search,
} from 'lucide-react';

const COMMANDS = [
  { group: 'Money', items: [
    { label: 'Dashboard', to: '/', icon: Home, keywords: 'home overview' },
    { label: 'Loans', to: '/loans', icon: CreditCard, keywords: 'borrow repay' },
    { label: 'Repay a Loan', to: '/loans/repay', icon: CreditCard, keywords: 'pay installment' },
    { label: 'Loan Pre-Qualification', to: '/loans/pre-qualify', icon: TrendingUp, keywords: 'eligible borrowing capacity' },
    { label: 'Savings Hub', to: '/savings', icon: PiggyBank, keywords: 'save pockets goals' },
    { label: 'Savings Circles (ROSCA)', to: '/rosca', icon: RefreshCw, keywords: 'circle group rotating' },
    { label: 'Budget', to: '/budget', icon: Wallet, keywords: 'expenses spending' },
    { label: 'Linked Accounts', to: '/budget/linked-accounts', icon: Landmark, keywords: 'bank feed import momo' },
    { label: 'Invest & Earn', to: '/invest', icon: TrendingUp, keywords: 'investment returns' },
    { label: 'P2P Marketplace', to: '/p2p', icon: Activity, keywords: 'peer lending fund' },
    { label: 'P2P Secondary Market', to: '/p2p/secondary', icon: Activity, keywords: 'sell position buy discount' },
    { label: 'Net Worth Calculator', to: '/net-worth', icon: Calculator, keywords: 'assets liabilities' },
    { label: 'Debt Payoff', to: '/debt-payoff', icon: TrendingUp, keywords: 'snowball avalanche' },
  ]},
  { group: 'Protect & Grow', items: [
    { label: 'Insurance', to: '/insurance', icon: Shield, keywords: 'policy cover claim' },
    { label: 'Insurance Claims', to: '/insurance/claims', icon: FileText, keywords: 'claim settlement' },
    { label: 'Credit Score', to: '/credit-score', icon: BarChart3, keywords: 'rating simulator' },
    { label: 'Financial Health', to: '/financial-health', icon: Activity, keywords: 'wellness score' },
    { label: 'Benchmarking', to: '/benchmarking', icon: BarChart3, keywords: 'compare peers' },
  ]},
  { group: 'Account', items: [
    { label: 'Profile', to: '/profile', icon: User, keywords: 'account settings kyc' },
    { label: 'Notifications', to: '/notifications', icon: Bell, keywords: 'alerts' },
    { label: 'Notification Settings', to: '/notification-settings', icon: Bell, keywords: 'channels quiet hours sms push' },
    { label: 'Rewards', to: '/rewards', icon: Gift, keywords: 'loyalty points redeem' },
    { label: 'Refer & Earn', to: '/referrals', icon: Users, keywords: 'invite friends code' },
    { label: 'Help & Support', to: '/support', icon: LifeBuoy, keywords: 'ticket contact help' },
    { label: 'Privacy & Consent', to: '/consent', icon: Shield, keywords: 'data permissions' },
    { label: 'My Data Rights', to: '/data-rights', icon: FileText, keywords: 'gdpr export delete' },
  ]},
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback((to) => {
    setOpen(false);
    navigate(to);
  }, [navigate]);

  return (
    <>
      {/* Floating launcher (mobile-friendly; keyboard users have ⌘K) */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick search"
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-[#0D1BFF] text-white shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Search className="w-5 h-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search features and pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {COMMANDS.map((section, i) => (
            <div key={section.group}>
              {i > 0 && <CommandSeparator />}
              <CommandGroup heading={section.group}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.to + item.label}
                      value={`${item.label} ${item.keywords || ''}`}
                      onSelect={() => go(item.to)}
                    >
                      <Icon className="mr-2 h-4 w-4 text-gray-500" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
