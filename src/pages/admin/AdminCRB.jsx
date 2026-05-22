import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ShieldCheck, Search, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminCRB() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    base44.functions.invoke('adminManager', { action: 'list', entity: 'users' })
      .then(r => { setUsers(r.data?.users || []); setLoading(false); });
  }, []);

  const runCRBCheck = async (user) => {
    setChecking(user.id);
    setResult(null);
    const res = await base44.functions.invoke('adminManager', {
      action: 'check', entity: 'crb',
      data: { user_id: user.id, national_id: user.national_id, business_name: user.business_profile?.business_name }
    });
    setResult({ user, report: res.data?.report });
    setChecking(null);
  };

  const filtered = users.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.national_id?.includes(search));

  const riskColor = { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> Admin</Link>
        <h1 className="text-xl font-bold">CRB & Integrations</h1>
        <p className="text-blue-200 text-xs">Credit Reference Bureau checks & data sources</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* CRB Info Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-blue-800 font-semibold text-sm">CRB Integration Status</p>
            <p className="text-blue-600 text-xs mt-1">Currently using simulated CRB responses. To connect a live CRB (e.g., CRB Africa, TransUnion Uganda, Compuscan), configure the API key in Settings → Secrets (CRB_API_KEY, CRB_ENDPOINT).</p>
            <div className="flex gap-2 mt-2">
              <Badge className="bg-yellow-100 text-yellow-700 text-xs">Simulation Mode</Badge>
              <Badge className="bg-blue-100 text-blue-700 text-xs">CRB Africa Ready</Badge>
              <Badge className="bg-blue-100 text-blue-700 text-xs">TransUnion Ready</Badge>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-2 border-green-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                CRB Report — {result.user.full_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">CRB Score</p>
                  <p className="text-2xl font-bold text-gray-800">{result.report.score}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Risk Level</p>
                  <Badge className={`mt-1 ${riskColor[result.report.risk_level]}`}>{result.report.risk_level}</Badge>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Inquiries (12m)</p>
                  <p className="font-bold">{result.report.inquiries_last_12m}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Active Facilities</p>
                  <p className="font-bold">{result.report.active_credit_facilities}</p>
                </div>
              </div>
              {result.report.npa_history && (
                <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-red-700 text-xs font-medium">NPA history detected</p>
                </div>
              )}
              <p className="text-xs text-gray-400">Checked: {new Date(result.report.checked_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search by name or National ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map(u => (
              <Card key={u.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1a3a6b] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {u.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-500">{u.national_id ? `NID: ${u.national_id}` : 'No NID'} · Band {u.current_risk_band || 'N/A'}</p>
                    {u.business_profile && <p className="text-xs text-blue-600 truncate">{u.business_profile.business_name}</p>}
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs shrink-0"
                    onClick={() => runCRBCheck(u)}
                    disabled={checking === u.id}
                  >
                    {checking === u.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    <span className="ml-1">Check</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}