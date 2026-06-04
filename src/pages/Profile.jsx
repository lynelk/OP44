import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Shield, Bell, LogOut, ChevronRight, Award, ToggleLeft, LayoutDashboard, User, AlertCircle, TrendingUp, Gift, Users, LifeBuoy } from 'lucide-react';
import AchievementHub from '@/components/profile/AchievementHub';
import UnlockRequirements from '@/components/kyc/UnlockRequirements';
import DailyWellnessJourney from '@/components/wellness/DailyWellnessJourney';
import ChallengesBoard from '@/components/dashboard/ChallengesBoard';
import MilestoneProgress from '@/components/milestones/MilestoneProgress';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Profile() {
  usePageTitle('Profile');
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [kyc, setKyc] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser);
    base44.entities.UserProfile.filter({}, '-updated_date', 1).then(r => setUserProfile(r[0] || null));
    base44.entities.KYCDocument.filter({}, '-created_date', 50).then(setKyc);
    base44.entities.GamificationBadge.filter({}, '-created_date', 100).then(setBadges);
  }, []);

  const kycApproved = kyc.some(d => d.status === 'approved');
  const kycPending = kyc.some(d => d.status === 'pending');
  const totalPoints = badges.reduce((sum, b) => sum + (b.points_awarded || 0), 0);

  const handleLogout = () => base44.auth.logout('/');
  const handleDeleteAccount = () => {
    base44.auth.logout('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Profile Hero */}
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-16 pb-20">
        <div className="flex items-center gap-4">
          <div className="w-18 h-18 w-[72px] h-[72px] bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/30">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user?.full_name || 'User'}</h1>
            <p className="text-blue-100 text-sm mt-0.5">{user?.email}</p>
            <div className="mt-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${kycApproved ? 'bg-emerald-400/20 text-emerald-300' : kycPending ? 'bg-amber-400/20 text-amber-300' : 'bg-white/20 text-white/70'}`}>
                {kycApproved ? '✓ KYC Verified' : kycPending ? '⏳ KYC Pending' : 'KYC Required'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-4">
        {/* Points Card */}
        <div className="bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] text-white rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs font-medium">OpFin Points</p>
            <p className="text-4xl font-bold tracking-tight">{totalPoints}</p>
            <p className="text-blue-100 text-xs mt-1">{badges.length} badges earned</p>
          </div>
          <Award className="w-14 h-14 opacity-30" />
        </div>

        {/* KYC Alert */}
        {!kycApproved && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">Complete Your KYC</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Verify your identity to unlock credit access</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
        )}

        {/* KYC Unlock Requirements */}
        <UnlockRequirements compact={false} />

        {/* Journey: Wellness, Challenges, Milestones */}
        {user && <DailyWellnessJourney userId={user.id} />}
        {user && <ChallengesBoard userId={user.id} />}
        {user && <MilestoneProgress userId={user.id} />}

        {/* Achievement Hub */}
        <AchievementHub />

        {/* Lender Analytics Link */}
        {userProfile?.account_type === 'lender' && (
          <Link to="/lender-analytics">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#0D1BFF]/10 to-[#32B4FF]/10 dark:from-[#0D1BFF]/20 dark:to-[#32B4FF]/20 border border-[#0D1BFF]/20 dark:border-[#0D1BFF]/30 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0D1BFF] to-[#32B4FF] flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Lender Analytics</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Track your rental performance</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        )}

        {/* Settings Menu */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          {[
            { icon: Shield, label: 'Identity & KYC', sub: kycApproved ? 'Verified' : 'Action needed', to: '/credit-score', iconBg: 'bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20', iconColor: 'text-[#0D1BFF] dark:text-[#32B4FF]' },
            { icon: Bell, label: 'Notifications', sub: 'Manage alerts', to: '/notifications', iconBg: 'bg-[#00C48C]/10 dark:bg-[#00C48C]/20', iconColor: 'text-[#00C48C]' },
            { icon: Gift, label: 'Rewards', sub: 'Loyalty perks & cashback', to: '/rewards', iconBg: 'bg-[#F4B400]/10', iconColor: 'text-[#F4B400]' },
            { icon: Users, label: 'Refer & Earn', sub: 'Invite friends, earn points', to: '/referrals', iconBg: 'bg-[#32B4FF]/10 dark:bg-[#32B4FF]/20', iconColor: 'text-[#32B4FF]' },
            { icon: LifeBuoy, label: 'Help & Support', sub: 'Get help or raise an issue', to: '/support', iconBg: 'bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20', iconColor: 'text-[#0D1BFF] dark:text-[#32B4FF]' },
            { icon: ToggleLeft, label: 'Data & Consent', sub: 'Manage your consents', to: '/consent', iconBg: 'bg-[#32B4FF]/10 dark:bg-[#32B4FF]/20', iconColor: 'text-[#32B4FF]' },
            { icon: Shield, label: 'My Data Rights', sub: 'Access, export or delete your data', to: '/data-rights', iconBg: 'bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20', iconColor: 'text-[#0D1BFF] dark:text-[#32B4FF]' },
            { icon: User, label: 'Account Settings', sub: 'Edit profile & preferences', to: '/p2p/onboarding', iconBg: 'bg-gray-100 dark:bg-gray-700', iconColor: 'text-gray-600 dark:text-gray-400' },
          ].map(({ icon: Icon, label, sub, to, iconBg, iconColor }, idx, arr) => {
            const inner = (
              <div className={`flex items-center justify-between px-4 py-3.5 min-h-[60px] ${idx < arr.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </div>
            );
            return to ? <Link key={label} to={to}>{inner}</Link> : <div key={label}>{inner}</div>;
          })}
        </div>

        {user?.role === 'admin' && (
          <Link to="/admin">
            <button className="w-full h-12 bg-[#0D1BFF] text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
              <LayoutDashboard className="w-4 h-4" /> Admin Panel
            </button>
          </Link>
        )}

        <button
          className="w-full h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 text-red-500" />
          <span className="text-red-500 font-medium">Sign Out</span>
        </button>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full h-11 text-red-400 dark:text-red-500 text-sm font-medium underline underline-offset-2 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Delete Account
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All your data including loans, savings, and history will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white">
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}