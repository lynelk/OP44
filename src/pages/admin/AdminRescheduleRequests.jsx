import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, RefreshCw, CheckCircle2, XCircle, Calendar, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminRescheduleRequests() {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState({});
  const [loans, setLoans] = useState({});
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');

  const load = async () => {
    setLoading(true);
    const [reqs, usersRes] = await Promise.all([
      base44.entities.LoanRescheduleRequest.list('-requested_date', 100),
      base44.functions.invoke('adminManager', { action: 'list', entity: 'users' }),
    ]);
    const userMap = {};
    (usersRes.data?.users || []).forEach(u => { userMap[u.id] = u; });

    // Fetch unique loans
    const loanIds = [...new Set(reqs.map(r => r.loan_id))];
    const loanMap = {};
    await Promise.all(loanIds.map(async (lid) => {
      const l = await base44.entities.LoanApplication.filter({ id: lid });
      if (l[0]) loanMap[lid] = l[0];
    }));

    setRequests(reqs);
    setUsers(userMap);
    setLoans(loanMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDecide = async (decision) => {
    setSaving(true);
    await base44.functions.invoke('decideLoanReschedule', {
      reschedule_request_id: deciding.id,
      decision,
      admin_notes: adminNotes,
    });
    setSaving(false);
    setDeciding(null);
    setAdminNotes('');
    load();
  };

  const filtered = requests.filter(r => filterStatus === 'all' || r.status === filterStatus);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin/loans" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Loan Management
        </Link>
        <h1 className="text-xl font-bold">Reschedule Requests</h1>
        <p className="text-blue-200 text-xs">{requests.filter(r => r.status === 'pending').length} pending review</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b bg-white sticky top-0 z-10">
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`flex-1 py-3 text-xs font-semibold capitalize ${filterStatus === s ? 'border-b-2 border-[#1a3a6b] text-[#1a3a6b]' : 'text-gray-500'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No {filterStatus === 'all' ? '' : filterStatus} requests</p>
          </div>
        ) : filtered.map(req => {
          const u = users[req.user_id] || {};
          const loan = loans[req.loan_id] || {};
          const saving = (req.original_monthly_installment || 0) - (req.proposed_monthly_installment || 0);

          return (
            <Card key={req.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{u.full_name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <Badge className={STATUS_COLORS[req.status]}>{req.status}</Badge>
                </div>

                {/* Loan Terms Comparison */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Current</p>
                    <p className="font-bold text-gray-800 text-sm">UGX {req.original_monthly_installment?.toLocaleString()}/mo</p>
                    <p className="text-xs text-gray-500">{req.original_tenure_months}m remaining</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-blue-500 mb-1">Requested</p>
                    <p className="font-bold text-[#1a3a6b] text-sm">UGX {req.proposed_monthly_installment?.toLocaleString()}/mo</p>
                    <p className="text-xs text-blue-500">{req.requested_tenure_months}m new tenure</p>
                  </div>
                </div>

                {saving > 0 && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-1.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Monthly saving: UGX {saving.toLocaleString()} · Balance: UGX {req.outstanding_balance?.toLocaleString()}
                  </div>
                )}

                {/* Reason */}
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Borrower's Reason</p>
                  <p className="text-xs text-gray-700">{req.reason}</p>
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      onClick={() => { setDeciding(req); setAdminNotes(''); }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Review & Decide
                    </Button>
                  </div>
                )}

                {req.status !== 'pending' && req.admin_notes && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
                    <span className="font-semibold">Admin note: </span>{req.admin_notes}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Decision Modal */}
      {deciding && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Review Request</h3>
              <button onClick={() => setDeciding(null)} className="text-gray-400 text-xl">✕</button>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 text-sm">
              <p className="text-blue-800 font-medium">{users[deciding.user_id]?.full_name}</p>
              <p className="text-blue-600 text-xs mt-0.5">
                {deciding.original_monthly_installment?.toLocaleString()} → {deciding.proposed_monthly_installment?.toLocaleString()} UGX/mo · {deciding.requested_tenure_months} months
              </p>
              <p className="text-blue-500 text-xs mt-1 italic">"{deciding.reason}"</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Admin Notes (optional)</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1a3a6b]"
                rows={2}
                placeholder="Reason for approval or rejection..."
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() => handleDecide('approve')}
                disabled={saving}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                onClick={() => handleDecide('reject')}
                disabled={saving}
              >
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}