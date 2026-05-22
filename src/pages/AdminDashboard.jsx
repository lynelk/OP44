import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Users, ShieldCheck, Settings, Database, FileText, BarChart2, ChevronRight, TrendingUp, Landmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const MODULES = [
  { path: '/admin/users', icon: Users, label: 'User Management', desc: 'Individuals & Businesses', color: 'bg-blue-500' },
  { path: '/admin/products', icon: Landmark, label: 'Products & Services', desc: 'Loans, Insurance, Investments', color: 'bg-purple-500' },
  { path: '/admin/rules', icon: Settings, label: 'Business Rules', desc: 'Configure lending & KYC rules', color: 'bg-orange-500' },
  { path: '/admin/crb', icon: ShieldCheck, label: 'CRB & Integrations', desc: 'Credit bureau checks', color: 'bg-green-500' },
  { path: '/admin/submissions', icon: FileText, label: 'Data Submissions', desc: 'Regulatory & CRB reports', color: 'bg-red-500' },
  { path: '/admin/loans', icon: BarChart2, label: 'Loan Management', desc: 'Review & approve loans', color: 'bg-indigo-500' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.role !== 'admin') return;
      base44.functions.invoke('adminManager', { action: 'get_stats', entity: 'users' })
        .then(r => setStats(r.data));
    });
  }, []);

  if (!user) return null;
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <ShieldCheck className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700">Access Denied</h2>
          <p className="text-gray-500 mt-2">Admin privileges required.</p>
          <Link to="/" className="text-blue-600 underline mt-4 block">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-blue-200 text-sm">OpFin Administration</p>
          </div>
          <Link to="/" className="text-blue-200 text-xs underline">← App</Link>
        </div>
        {stats && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-200 text-xs">Total Users</p>
              <p className="text-2xl font-bold">{stats.total_users}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-200 text-xs">Active Loans</p>
              <p className="text-2xl font-bold">{stats.active_loans}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-200 text-xs">Loan Book (UGX)</p>
              <p className="text-xl font-bold">{((stats.total_loan_value || 0)/1000000).toFixed(1)}M</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-200 text-xs">Total Savings (UGX)</p>
              <p className="text-xl font-bold">{((stats.total_savings || 0)/1000000).toFixed(1)}M</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-3">
        <h2 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">Admin Modules</h2>
        {MODULES.map(({ path, icon: Icon, label, desc, color }) => (
          <Link key={path} to={path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}