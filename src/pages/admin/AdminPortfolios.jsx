import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronLeft, TrendingUp, RefreshCw, Search, User, Activity, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function AdminPortfolios() {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('adminReports', { action: 'list_portfolios' });
    setPortfolios(res.data?.portfolios || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = portfolios.filter(p =>
    !search ||
    p.lender_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.lender_email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalInvested = portfolios.reduce((s, p) => s + (p.total_invested || 0), 0);
  const totalReturns = portfolios.reduce((s, p) => s + (p.total_returns || 0), 0);

  const statusColor = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    defaulted: 'bg-red-100 text-red-700',
    partially_recovered: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <h1 className="text-xl font-bold">Lender Portfolios</h1>
        <p className="text-blue-200 text-xs mt-0.5">{portfolios.length} lenders tracked</p>
      </div>

      {/* Platform Totals */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500">Total Deployed</span>
            </div>
            <p className="text-lg font-bold text-gray-900">UGX {(totalInvested / 1000000).toFixed(2)}M</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs text-gray-500">Total Returns</span>
            </div>
            <p className="text-lg font-bold text-emerald-600">UGX {(totalReturns / 1000000).toFixed(2)}M</p>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search lender..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="text-center py-12"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No lender portfolios found</p>
          </div>
        ) : (
          filtered.map(p => {
            const roi = p.total_invested > 0 ? ((p.total_returns / p.total_invested) * 100).toFixed(1) : '0.0';
            return (
              <Card key={p.lender_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(p)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1a3a6b] flex items-center justify-center text-white font-bold text-sm">
                        {p.lender_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{p.lender_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{p.lender_email}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${roi > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {roi}% ROI
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">Invested</p>
                      <p className="text-xs font-bold text-gray-800">UGX {(p.total_invested / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">Earned</p>
                      <p className="text-xs font-bold text-emerald-700">UGX {(p.total_returns / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">Loans</p>
                      <p className="text-xs font-bold text-blue-700">{p.active_investments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{selected.lender_name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{selected.lender_email}</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ['Total Invested', `UGX ${(selected.total_invested || 0).toLocaleString()}`],
                ['Returns Earned', `UGX ${(selected.total_returns || 0).toLocaleString()}`],
                ['Principal Recovered', `UGX ${(selected.principal_recovered || 0).toLocaleString()}`],
                ['Active Investments', selected.active_investments || 0],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            {selected.investments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Investments</p>
                <div className="space-y-2">
                  {selected.investments.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-xs font-medium text-gray-800">Loan #{inv.loan_id?.slice(-6)}</p>
                        <p className="text-xs text-gray-400">UGX {(inv.amount_invested || 0).toLocaleString()} · {inv.ownership_pct?.toFixed(1)}%</p>
                      </div>
                      <Badge className={statusColor[inv.status] || 'bg-gray-100 text-gray-500'}>
                        {inv.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}