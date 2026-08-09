import { Link } from 'react-router-dom';
import {
  CreditCard, Wallet, Shield, TrendingUp, TrendingDown, Users, Activity,
  Handshake, PieChart, Target, Trophy, Bell, FileText, BarChart2, Heart,
} from 'lucide-react';

const MODULES = [
  { icon: CreditCard, label: 'Loans',       desc: 'Apply & manage credit',     path: '/loans',          color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
  { icon: Wallet,    label: 'Savings',     desc: 'Pockets & goals',            path: '/savings',        color: 'bg-[#00C48C]/10 text-[#00C48C] dark:bg-[#00C48C]/20 dark:text-[#00C48C]' },
  { icon: Shield,    label: 'Insurance',   desc: 'Protect your assets',       path: '/insurance',      color: 'bg-[#32B4FF]/10 text-[#32B4FF] dark:bg-[#32B4FF]/20 dark:text-[#32B4FF]' },
  { icon: TrendingUp,label: 'Invest',      desc: 'Grow your money',           path: '/invest',         color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
  { icon: Handshake, label: 'P2P',         desc: 'Peer-to-peer lending',      path: '/p2p',            color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
  { icon: TrendingDown, label: 'Debt Payoff', desc: 'Pay off faster',          path: '/debt-payoff',    color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
  { icon: BarChart2, label: 'Budget',      desc: 'Track expenses',            path: '/budget',         color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
  { icon: Activity,  label: 'Health Score',desc: 'Financial checkup',         path: '/financial-health', color: 'bg-[#00C48C]/10 text-[#00C48C] dark:bg-[#00C48C]/20 dark:text-[#00C48C]' },
  { icon: PieChart,  label: 'Net Worth',   desc: 'Assets & liabilities',     path: '/net-worth',      color: 'bg-[#32B4FF]/10 text-[#32B4FF] dark:bg-[#32B4FF]/20 dark:text-[#32B4FF]' },
  { icon: Users,     label: 'Savings Groups', desc: 'Save together',          path: '/savings-groups', color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
  { icon: Target,    label: 'Challenges',  desc: 'Gamified savings',          path: '/savings-challenges', color: 'bg-[#00C48C]/10 text-[#00C48C] dark:bg-[#00C48C]/20 dark:text-[#00C48C]' },
  { icon: Trophy,    label: 'Rewards',     desc: 'Badges & loyalty',          path: '/rewards',        color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' },
  { icon: FileText,  label: 'Statements',  desc: 'Loan documents',           path: '/loans/statement', color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
  { icon: Heart,     label: 'Wellness',    desc: 'Daily journey',             path: '/profile',        color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300' },
  { icon: Bell,      label: 'Notifications', desc: 'Stay informed',          path: '/notifications',  color: 'bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#0D1BFF]/20 dark:text-[#32B4FF]' },
];

export default function ExploreTab() {
  return (
    <div>
      <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-3">Explore Modules</h2>
      <div className="grid grid-cols-2 gap-3">
        {MODULES.map(({ icon: Icon, label, desc, path, color }) => (
          <Link key={label} to={path}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex flex-col gap-2 transition-transform active:scale-95 h-full">
              <div className={`w-11 h-11 rounded-2xl ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{label}</p>
                <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}