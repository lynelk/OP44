import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Shield, Bell, LogOut, ChevronRight, Star, Award, ToggleLeft, LayoutDashboard, User, AlertCircle } from 'lucide-react';
import AchievementHub from '@/components/profile/AchievementHub';
import UnlockRequirements from '@/components/kyc/UnlockRequirements';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [kyc, setKyc] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser);
    base44.entities.KYCDocument.filter({}).then(setKyc);
    base44.entities.GamificationBadge.filter({}).then(setBadges);
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
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-16 pb-20">
        <div className="flex items-center gap-4">
          <div className="w-18 h-18 w-[72px] h-[72px] bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/30">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user?.full_name || 'User'}</h1>
            <p className="text-green-200 text-sm mt-0.5">{user?.email}</p>
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
        <div className="bg-gradient-to-r from-[#006B3C] to-[#7BC943] text-white rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-green-100 text-xs font-medium">Pipiya Points</p>
            <p className="text-4xl font-bold tracking-tight">{totalPoints}</p>
            <p className="text-green-100 text-xs mt-1">{badges.length} badges earned</p>
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

        {/* Achievement Hub */}
        <AchievementHub />

        {/* Settings Menu */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          {[
            { icon: Shield, label: 'Identity & KYC', sub: kycApproved ? 'Verified' : 'Action needed', to: null, iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400' },
            { icon: Bell, label: 'Notifications', sub: 'Manage alerts', to: '/notifications', iconBg: 'bg-red-100 dark:bg-red-900/40', iconColor: 'text-red-500' },
            { icon: ToggleLeft, label: 'Data & Consent', sub: 'Manage your consents', to: '/consent', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400' },
            { icon: Shield, label: 'My Data Rights', sub: 'Access, export or delete your data', to: '/data-rights', iconBg: 'bg-green-100 dark:bg-green-900/40', iconColor: 'text-green-600 dark:text-green-400' },
            { icon: User, label: 'Account Settings', sub: 'Profile & preferences', to: null, iconBg: 'bg-gray-100 dark:bg-gray-700', iconColor: 'text-gray-600 dark:text-gray-400' },
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
            <button className="w-full h-12 bg-[#006B3C] text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
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