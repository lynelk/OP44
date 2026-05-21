import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, PiggyBank, CreditCard, Shield, Bell, ChevronRight, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [savings, setSavings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser);
    base44.entities.LoanApplication.filter({}).then(setLoans);
    base44.entities.SavingsPocket.filter({}).then(setSavings);
    base44.entities.Notification.filter({ is_read: false }).then(setNotifications);
    base44.entities.GamificationBadge.filter({}).then(setBadges);
  }, []);

  const activeLoan = loans.find(l => l.status === 'active' || l.status === 'disbursed');
  const totalSavings = savings.reduce((sum, s) => sum + (s.current_balance || 0), 0);
  const creditScore = activeLoan ? (activeLoan.risk_band === 'A' ? 820 : activeLoan.risk_band === 'B' ? 720 : 620) : 680;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-200 text-sm">Good morning,</p>
            <h1 className="text-2xl font-bold">{user?.full_name?.split(' ')[0] || 'User'} 👋</h1>
          </div>
          <Link to="/notifications" className="relative">
            <Bell className="w-6 h-6" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </Link>
        </div>

        {/* Credit Score Card */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs mb-1">Your Credit Score</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{creditScore}</span>
                <Badge className="bg-green-400 text-white text-xs mb-1">Good</Badge>
              </div>
              <p className="text-blue-200 text-xs mt-1">Keep up your repayments!</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs mb-1">Available Credit</p>
              <p className="text-2xl font-bold">UGX 500K</p>
              <Link to="/loans/apply">
                <Button size="sm" className="mt-2 bg-[#f97316] hover:bg-orange-600 text-white text-xs">
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 -mt-8 grid grid-cols-2 gap-3">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <PiggyBank className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-xs text-gray-500">Total Savings</span>
            </div>
            <p className="text-xl font-bold text-gray-800">UGX {(totalSavings / 1000).toFixed(0)}K</p>
            <p className="text-xs text-green-500 flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" /> {savings.length} pockets
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-xs text-gray-500">Active Loan</span>
            </div>
            {activeLoan ? (
              <>
                <p className="text-xl font-bold text-gray-800">UGX {((activeLoan.outstanding_balance || activeLoan.amount_approved || 0) / 1000).toFixed(0)}K</p>
                <p className="text-xs text-orange-500 flex items-center gap-0.5 mt-1">
                  <ArrowDownRight className="w-3 h-3" /> Outstanding
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-800">None</p>
                <p className="text-xs text-gray-400 mt-1">No active loans</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <h2 className="font-semibold text-gray-700 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: CreditCard, label: 'Apply Loan', path: '/loans/apply', color: 'bg-blue-100 text-blue-600' },
            { icon: PiggyBank, label: 'Save', path: '/savings', color: 'bg-green-100 text-green-600' },
            { icon: TrendingUp, label: 'Invest', path: '/investments', color: 'bg-purple-100 text-purple-600' },
            { icon: Shield, label: 'Insure', path: '/insurance', color: 'bg-orange-100 text-orange-600' },
          ].map(({ icon: Icon, label, path, color }) => (
            <Link key={label} to={path} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-gray-600 text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Savings Pockets */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">My Savings Pockets</h2>
          <Link to="/savings" className="text-blue-600 text-sm flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {savings.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-4 text-center">
              <PiggyBank className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No savings pockets yet</p>
              <Link to="/savings">
                <Button size="sm" variant="outline" className="mt-2 text-xs">Create Pocket</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {savings.slice(0, 2).map(pocket => {
              const progress = pocket.goal_amount ? Math.min((pocket.current_balance / pocket.goal_amount) * 100, 100) : 0;
              return (
                <Card key={pocket.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{pocket.icon || '🎯'}</span>
                        <div>
                          <p className="font-medium text-sm">{pocket.name}</p>
                          <p className="text-xs text-gray-400">Goal: UGX {(pocket.goal_amount / 1000).toFixed(0)}K</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600">
                        UGX {(pocket.current_balance / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{progress.toFixed(0)}% of goal</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="px-4 mt-6 mb-8">
          <h2 className="font-semibold text-gray-700 mb-3">Your Achievements</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {badges.map(badge => (
              <div key={badge.id} className="flex-shrink-0 bg-white rounded-xl p-3 shadow-sm text-center w-20">
                <div className="text-2xl mb-1">🏆</div>
                <p className="text-xs text-gray-600 leading-tight">{badge.badge_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-24" />
    </div>
  );
}