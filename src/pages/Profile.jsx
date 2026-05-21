import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Bell, LogOut, ChevronRight, Star, Award } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-16">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {user?.full_name?.[0] || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user?.full_name || 'User'}</h1>
            <p className="text-blue-200 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={kycApproved ? 'bg-green-400 text-white' : kycPending ? 'bg-yellow-400 text-white' : 'bg-gray-400 text-white'}>
                {kycApproved ? '✓ KYC Verified' : kycPending ? '⏳ KYC Pending' : 'KYC Required'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Points card */}
        <Card className="bg-gradient-to-r from-[#f97316] to-orange-400 text-white shadow-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">OpFin Points</p>
              <p className="text-3xl font-bold">{totalPoints}</p>
              <p className="text-orange-100 text-xs">{badges.length} badges earned</p>
            </div>
            <Award className="w-12 h-12 opacity-40" />
          </CardContent>
        </Card>

        {/* KYC Status */}
        {!kycApproved && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-semibold text-sm text-orange-800">Complete Your KYC</p>
                    <p className="text-xs text-orange-600">Verify your identity to unlock credit access</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" /> My Achievements
              </p>
              <div className="grid grid-cols-3 gap-2">
                {badges.map(badge => (
                  <div key={badge.id} className="bg-gray-50 rounded-xl p-2 text-center">
                    <div className="text-2xl mb-1">🏆</div>
                    <p className="text-xs text-gray-600 leading-tight">{badge.badge_name}</p>
                    <p className="text-xs text-yellow-500 font-semibold">+{badge.points_awarded}pts</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Items */}
        <Card>
          <CardContent className="p-0">
            {[
              { icon: Shield, label: 'Identity & KYC', sub: kycApproved ? 'Verified' : 'Action needed' },
              { icon: Bell, label: 'Notifications', sub: 'Manage alerts' },
              { icon: User, label: 'Account Settings', sub: 'Profile & preferences' },
            ].map(({ icon: Icon, label, sub }, idx) => (
              <div key={label} className={`flex items-center justify-between p-4 ${idx < 2 ? 'border-b' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full text-red-500 border-red-200" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}