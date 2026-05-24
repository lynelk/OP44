import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, RefreshCw, FileText, CheckCircle2, XCircle, AlertTriangle, Eye, Search, Shield, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const DOC_TYPES = [
  { key: 'payslip', label: 'Payslips', urlKey: 'payslip_urls', statusKey: 'payslip_status', notesKey: 'payslip_admin_notes' },
  { key: 'national_id', label: 'National ID', urlKey: 'national_id_urls', statusKey: 'national_id_status', notesKey: 'national_id_admin_notes' },
  { key: 'bank_statement', label: 'Bank Statements', urlKey: 'bank_statement_urls', statusKey: 'bank_statement_status', notesKey: 'bank_statement_admin_notes' },
];

const STATUS_COLOR = {
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  flagged: 'bg-orange-100 text-orange-700',
};

function DocSection({ loan, docType, onUpdate, aiRunning }) {
  const [notes, setNotes] = useState(loan[docType.notesKey] || '');
  const [saving, setSaving] = useState(false);
  const urls = loan[docType.urlKey] || [];
  const status = loan[docType.statusKey] || 'pending_review';

  if (!urls.length) return null;

  const update = async (newStatus) => {
    setSaving(true);
    await base44.functions.invoke('reviewLoanDocument', {
      action: 'update_doc_status',
      loan_id: loan.id,
      document_type: docType.key,
      status: newStatus,
      admin_notes: notes,
    });
    setSaving(false);
    onUpdate();
  };

  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold">{docType.label}</span>
          <span className="text-xs text-gray-400">({urls.length} file{urls.length > 1 ? 's' : ''})</span>
        </div>
        <Badge className={`text-xs ${STATUS_COLOR[status]}`}>{status.replace(/_/g, ' ')}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-100">
            <Eye className="w-3 h-3" /> View {docType.label} {i + 1}
          </a>
        ))}
      </div>

      <Input
        placeholder="Admin notes (optional)..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="text-xs h-8"
      />

      <div className="flex gap-2">
        <Button size="sm" disabled={saving || aiRunning}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex-1 h-8"
          onClick={() => update('approved')}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />} Approve
        </Button>
        <Button size="sm" variant="outline" disabled={saving || aiRunning}
          className="text-orange-600 border-orange-300 text-xs flex-1 h-8"
          onClick={() => update('flagged')}>
          <AlertTriangle className="w-3 h-3 mr-1" /> Flag
        </Button>
        <Button size="sm" variant="outline" disabled={saving || aiRunning}
          className="text-red-600 border-red-300 text-xs flex-1 h-8"
          onClick={() => update('rejected')}>
          <XCircle className="w-3 h-3 mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}

export default function AdminDocumentReview() {
  const [loans, setLoans] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const load = async () => {
    setLoading(true);
    const [docsRes, usersRes] = await Promise.all([
      base44.functions.invoke('reviewLoanDocument', { action: 'list_docs_pending', loan_id: 'all' }),
      base44.functions.invoke('adminManager', { action: 'list', entity: 'users' }),
    ]);
    const loanList = docsRes.data?.loans || [];
    const userMap = {};
    (usersRes.data?.users || []).forEach(u => { userMap[u.id] = u; });
    setLoans(loanList);
    setUsers(userMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAI = async (loan) => {
    setAiRunning(true);
    setAiResult(null);
    const res = await base44.functions.invoke('reviewLoanDocument', {
      action: 'detect_anomalies',
      loan_id: loan.id,
    });
    setAiResult(res.data);
    setAiRunning(false);
    load();
  };

  const filtered = loans.filter(l => {
    const u = users[l.user_id] || {};
    return !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || l.id?.includes(search);
  });

  const getLoanDocStatus = (loan) => {
    const statuses = DOC_TYPES.map(d => loan[d.statusKey]).filter(Boolean);
    if (statuses.includes('flagged') || (loan.fraud_flags?.length > 0)) return 'flagged';
    if (statuses.includes('rejected')) return 'needs_action';
    if (statuses.includes('pending_review')) return 'pending';
    return 'reviewed';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Document Review</h1>
            <p className="text-blue-200 text-xs">{loans.length} applications with uploads</p>
          </div>
          <button onClick={load} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-blue-200" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search borrower..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="text-center py-10"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No applications with uploaded documents</p>
          </div>
        ) : (
          filtered.map(loan => {
            const u = users[loan.user_id] || {};
            const docStatus = getLoanDocStatus(loan);
            const hasFraudFlags = loan.fraud_flags?.length > 0;
            return (
              <div key={loan.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${selected?.id === loan.id ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => { setSelected(selected?.id === loan.id ? null : loan); setAiResult(null); }}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{u.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      <p className="text-sm mt-1">UGX {loan.amount_requested?.toLocaleString()} · {loan.tenure_months}m · <span className="capitalize">{loan.status}</span></p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge className={`text-xs ${docStatus === 'flagged' ? 'bg-red-100 text-red-700' : docStatus === 'reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {docStatus === 'flagged' ? '🚨 Flagged' : docStatus === 'reviewed' ? '✅ Reviewed' : docStatus === 'needs_action' ? '⚠️ Action Needed' : '⏳ Pending'}
                      </Badge>
                      {hasFraudFlags && (
                        <p className="text-xs text-red-600 font-semibold">{loan.fraud_flags.length} fraud flag{loan.fraud_flags.length > 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2 flex-wrap">
                    {DOC_TYPES.map(d => (loan[d.urlKey]?.length > 0) && (
                      <span key={d.key} className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[loan[d.statusKey]] || 'bg-gray-100 text-gray-500'}`}>
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>

                {selected?.id === loan.id && (
                  <div className="border-t border-gray-100 p-4 space-y-3" onClick={e => e.stopPropagation()}>

                    {/* Fraud flags banner */}
                    {hasFraudFlags && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-red-700 mb-1">🚨 AI Anomaly Flags Detected</p>
                        <div className="flex flex-wrap gap-1">
                          {loan.fraud_flags.map(f => (
                            <span key={f} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{f.replace(/_/g, ' ')}</span>
                          ))}
                        </div>
                        {loan.fraud_penalty_applied && (
                          <p className="text-xs text-red-600 mt-1 font-semibold">⚡ Fraud penalty applied to borrower profile</p>
                        )}
                      </div>
                    )}

                    {/* AI Analysis Result */}
                    {aiResult && (
                      <div className={`border rounded-xl p-3 text-xs ${aiResult.risk_level === 'high' ? 'bg-red-50 border-red-200' : aiResult.risk_level === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                        <p className="font-bold mb-1">AI Analysis: {aiResult.risk_level?.toUpperCase()} Risk</p>
                        <p className="text-gray-700">{aiResult.summary}</p>
                        <p className="mt-1 font-semibold">Recommendation: {aiResult.recommended_action?.replace(/_/g, ' ')}</p>
                      </div>
                    )}

                    {/* Document sections */}
                    {DOC_TYPES.map(d => (
                      <DocSection key={d.key} loan={loan} docType={d} onUpdate={load} aiRunning={aiRunning} />
                    ))}

                    {/* AI Scan Button */}
                    <Button
                      onClick={() => runAI(loan)}
                      disabled={aiRunning}
                      variant="outline"
                      className="w-full gap-2 text-purple-700 border-purple-300 hover:bg-purple-50"
                    >
                      {aiRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      {aiRunning ? 'Running AI Anomaly Detection...' : 'Run AI Fraud Check'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}