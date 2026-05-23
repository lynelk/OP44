import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ShieldCheck, Search, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, Phone, CreditCard, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminCRB() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'batch'
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  useEffect(() => {
    base44.functions.invoke('adminManager', { action: 'list', entity: 'users' })
      .then(r => { setUsers(r.data?.users || []); setLoading(false); });
  }, []);

  // Run full CRB + credit score check for a single user via gnugridValidation + creditScoreEngine
  const runCRBCheck = async (user) => {
    setChecking(user.id);
    setResult(null);

    // Step 1: NIN validation (if available)
    let ninResult = null;
    if (user.national_id) {
      const ninRes = await base44.functions.invoke('gnugridValidation', {
        action: 'validate_nin',
        nin: user.national_id,
      });
      ninResult = ninRes.data;
    }

    // Step 2: Phone validation (if available)
    let phoneResult = null;
    if (user.phone_number) {
      const phoneRes = await base44.functions.invoke('gnugridValidation', {
        action: 'validate_phone',
        phone_number: user.phone_number,
      });
      phoneResult = phoneRes.data;
    }

    // Step 3: Full credit score recalculation (includes CRB + MNO via creditScoreEngine)
    const scoreRes = await base44.functions.invoke('creditScoreEngine', { user_id: user.id });
    const scoreData = scoreRes.data;

    setResult({ user, ninResult, phoneResult, scoreData });
    setChecking(null);
  };

  // Batch recalculate all active users
  const runBatchRecalculate = async () => {
    setBatchRunning(true);
    setBatchResult(null);
    const res = await base44.functions.invoke('creditScoreEngine', { recalculate_all: true });
    setBatchResult(res.data);
    setBatchRunning(false);
  };

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.national_id?.includes(search) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const ninStatusColor = (status) => ({
    VALID: 'bg-green-100 text-green-700',
    INVALID: 'bg-red-100 text-red-700',
  }[status] || 'bg-gray-100 text-gray-600');

  const bandColor = { A: 'bg-emerald-100 text-emerald-700', B: 'bg-blue-100 text-blue-700', C: 'bg-amber-100 text-amber-700', D: 'bg-red-100 text-red-700' };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <h1 className="text-xl font-bold">CRB & GnuGrid</h1>
        <p className="text-blue-200 text-xs">Live credit bureau checks via GnuGrid API</p>
        <div className="flex gap-2 mt-3">
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">GnuGrid Live</Badge>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">CRB + MNO</Badge>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">NIN Validation</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4">
        {[{ id: 'users', label: 'Individual Check' }, { id: 'batch', label: 'Batch Recalculate' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#1a3a6b] text-[#1a3a6b]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-4">

        {activeTab === 'batch' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Recalculate All Credit Scores</p>
                <p className="text-xs text-gray-500 mb-3">Runs the full credit engine for all active users — fetches live CRB + MNO data from GnuGrid for each user who has a National ID or phone number on file.</p>
                <Button onClick={runBatchRecalculate} disabled={batchRunning}
                  className="bg-[#1a3a6b] hover:bg-[#152f5a] text-white w-full">
                  {batchRunning ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Running...</> : <><Users className="w-4 h-4 mr-2" /> Run Batch Recalculate</>}
                </Button>
              </CardContent>
            </Card>

            {batchResult && (
              <Card className="border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" /> Batch Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">{batchResult.count} users recalculated</p>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {(batchResult.results || []).map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
                        <span className="text-gray-600 truncate max-w-[60%]">{r.user_id}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{r.score}</span>
                          <Badge className={`text-xs ${bandColor[r.risk_band] || 'bg-gray-100 text-gray-600'}`}>{r.risk_band}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <>
            {/* Result Panel */}
            {result && (
              <Card className="border-2 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    GnuGrid Report — {result.user.full_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">

                  {/* Credit Score */}
                  {result.scoreData && !result.scoreData.error && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Internal Credit Score</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-800 dark:text-white">{result.scoreData.score}</p>
                          <p className="text-xs text-gray-400">/ 850</p>
                        </div>
                        <div className="text-center">
                          <Badge className={`${bandColor[result.scoreData.risk_band] || 'bg-gray-100'} mt-1`}>Band {result.scoreData.risk_band}</Badge>
                          <p className="text-xs text-gray-400 mt-1">{result.scoreData.risk_tier}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{(result.scoreData.max_loan_limit || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-400">Max Loan (UGX)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GnuGrid CRB Summary */}
                  {result.scoreData?.crb_available && result.scoreData?.crb_summary && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> GnuGrid CRB Data
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {result.scoreData.crb_summary.score && (
                          <div><p className="text-gray-400">CRB Score</p><p className="font-bold text-blue-800 dark:text-blue-200">{result.scoreData.crb_summary.score}</p></div>
                        )}
                        {result.scoreData.crb_summary.band && (
                          <div><p className="text-gray-400">Band</p><p className="font-bold text-blue-800 dark:text-blue-200">{result.scoreData.crb_summary.band}</p></div>
                        )}
                        {result.scoreData.crb_summary.rating && (
                          <div><p className="text-gray-400">Rating</p><p className="font-bold text-blue-800 dark:text-blue-200">{result.scoreData.crb_summary.rating}</p></div>
                        )}
                      </div>
                    </div>
                  )}

                  {result.scoreData?.crb_available === false && (
                    <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <p className="text-amber-700 text-xs">No CRB data — user may not have NID or phone on profile</p>
                    </div>
                  )}

                  {/* NIN Validation */}
                  {result.ninResult && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> NIN Validation
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${ninStatusColor(result.ninResult.nin_status)}`}>{result.ninResult.nin_status || 'N/A'}</Badge>
                        {result.ninResult.name && <span className="text-xs text-gray-600">{result.ninResult.name}</span>}
                      </div>
                      {result.ninResult.date_of_birth && (
                        <p className="text-xs text-gray-400 mt-1">DOB: {result.ninResult.date_of_birth}</p>
                      )}
                    </div>
                  )}

                  {/* Phone Validation */}
                  {result.phoneResult && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Phone Validation
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${ninStatusColor(result.phoneResult.phone_status)}`}>{result.phoneResult.phone_status || 'N/A'}</Badge>
                        {result.phoneResult.name && <span className="text-xs text-gray-600">{result.phoneResult.name}</span>}
                      </div>
                    </div>
                  )}

                  {/* Reason Codes */}
                  {result.scoreData?.reason_codes?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 font-semibold mb-1">Score Factors</p>
                      <div className="flex flex-wrap gap-1">
                        {result.scoreData.reason_codes.slice(0, 8).map((code, i) => (
                          <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{code}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search by name, email or NID..." value={search} onChange={e => setSearch(e.target.value)} />
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
                        <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{u.full_name}</p>
                        <p className="text-xs text-gray-500">
                          {u.national_id ? `NID: ${u.national_id}` : 'No NID'}
                          {u.phone_number ? ` · ${u.phone_number}` : ''}
                        </p>
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
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">No users found</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}