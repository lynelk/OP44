import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Zap, RefreshCw, PieChart } from 'lucide-react';
import { PieChart as RPie, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

const ALLOC_COLORS = {
  bonds: '#1a3a6b',
  money_market: '#06b6d4',
  p2p_loans: '#f97316',
  sacco: '#22c55e',
};

const RISK_LABELS = { conservative: '🛡️ Conservative', moderate: '📈 Moderate', aggressive: '⚡ Aggressive' };

export default function PortfolioDashboard({ profile, totalInvested, totalReturns, snapshots, contributions, onRefresh }) {
  const [allocating, setAllocating] = useState(false);

  const handleAutoAllocate = async () => {
    setAllocating(true);
    const res = await base44.functions.invoke('portfolioAllocator', { action: 'auto_allocate' });
    setAllocating(false);
    if (res.data?.allocated > 0) onRefresh();
  };

  const allocationData = profile?.allocation
    ? Object.entries(profile.allocation).map(([key, val]) => ({
        name: key.replace('_', ' '), value: val, color: ALLOC_COLORS[key] || '#94a3b8',
      }))
    : [];

  const chartData = snapshots?.slice(-8).map(s => ({
    date: s.snapshot_date?.slice(5), // MM-DD
    value: s.total_value,
    returns: s.total_returns,
  })) || [];

  const returnRate = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#1a3a6b] text-white border-0">
          <CardContent className="p-4">
            <p className="text-blue-200 text-xs mb-1">Portfolio Value</p>
            <p className="text-xl font-bold">UGX {totalInvested.toLocaleString()}</p>
            <p className="text-xs text-blue-300 mt-1">{contributions?.length || 0} positions</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-600 text-white border-0">
          <CardContent className="p-4">
            <p className="text-emerald-100 text-xs mb-1">Total Returns</p>
            <p className="text-xl font-bold">UGX {totalReturns.toLocaleString()}</p>
            <p className="text-xs text-emerald-200 mt-1">+{returnRate}% ROI</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Profile Badge */}
      {profile && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Risk Profile</p>
              <p className="font-bold text-gray-800">{RISK_LABELS[profile.risk_level]}</p>
              {profile.auto_invest_enabled && (
                <p className="text-xs text-green-600 mt-0.5">
                  ✓ Auto-investing {profile.auto_invest_percentage}% of surplus
                </p>
              )}
            </div>
            {profile.auto_invest_enabled && (
              <Button size="sm" className="bg-[#f97316] text-white text-xs"
                onClick={handleAutoAllocate} disabled={allocating}>
                <Zap className="w-3 h-3 mr-1" />
                {allocating ? 'Allocating...' : 'Run Now'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Allocation Pie */}
      {allocationData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><PieChart className="w-4 h-4" /> Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <RPie>
                  <Pie data={allocationData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                    {allocationData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `${val}%`} />
                </RPie>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {allocationData.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs capitalize text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio growth chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Portfolio Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => `UGX ${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="value" stroke="#1a3a6b" fill="#1a3a6b20" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}