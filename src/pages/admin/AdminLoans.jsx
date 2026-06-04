import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, Search, RefreshCw, CheckCircle2, XCircle, CalendarClock, CheckSquare, Square, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 25;

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600', submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700', disbursed: 'bg-indigo-100 text-indigo-700',
  active: 'bg-purple-100 text-purple-700', closed: 'bg-gray-100 text-gray-500',
  defaulted: 'bg-red-200 text-red-800', flagged: 'bg-orange-200 text-orange-800'
};

export default function AdminLoans() {
  const { toast } = useToast();
  const [loans, setLoans] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(null); // { status } pending confirmation

  const toggleCheck = (id) => setCheckedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    const submittedIds = filtered.filter(l => l.status === 'submitted').map(l => l.id);
    if (submittedIds.every(id => checkedIds.has(id))) {
      setCheckedIds(prev => { const n = new Set(prev); submittedIds.forEach(id => n.delete(id)); return n; });
    } else {
      setCheckedIds(prev => { const n = new Set(prev); submittedIds.forEach(id => n.add(id)); return n; });
    }
  };

  const handleBulkAction = async (newStatus) => {
    if (checkedIds.size === 0) return;
    setBulkSaving(true);
    const results = await Promise.allSettled([...checkedIds].map(id =>
      base44.functions.invoke('adminManager', { action: 'update', entity: 'loans', id, data: { status: newStatus } })
    ));
    const failed = results.filter(r => r.status === 'rejected').length;
    setBulkSaving(false);
    setBulkConfirm(null);
    setCheckedIds(new Set());
    if (failed > 0) toast({ title: 'Bulk action partially failed', description: `${failed} of ${results.length} updates failed. Please retry.`, variant: 'destructive' });
    load();
  };

  const load = async () => {
    setLoading(true);
    const [loansRes, usersRes] = await Promise.all([
      base44.functions.invoke('adminManager', { action: 'list', entity: 'loans' }),
      base44.functions.invoke('adminManager', { action: 'list', entity: 'users' }),
    ]);
    const loanList = loansRes.data?.loans || [];
    const userList = usersRes.data?.users || [];
    const userMap = {};
    userList.forEach(u => { userMap[u.id] = u; });
    setLoans(loanList);
    setUsers(userMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async () => {
    setSaving(true);
    await base44.functions.invoke('adminManager', {
      action: 'update', entity: 'loans', id: selected.id,
      data: { status: selected.status, amount_approved: selected.amount_approved, interest_rate: selected.interest_rate, admin_notes: selected.admin_notes }
    });
    setSaving(false);
    setSelected(null);
    load();
  };

  const filtered = loans.filter(l => {
    const u = users[l.user_id] || {};
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || l.id?.includes(search);
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    const matchStage = filterStage === 'all' || l.collections_stage === filterStage;
    return matchSearch && matchStatus && matchStage;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> Admin</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Loan Management</h1>
            <p className="text-blue-200 text-xs">{loans.length} total applications</p>
          </div>
          <Link to="/admin/loans/reschedule">
            <div className="flex items-center gap-1.5 bg-white/15 hover:bg-white dark:bg-gray-800/25 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors">
              <CalendarClock className="w-3.5 h-3.5" /> Reschedules
            </div>
          </Link>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search borrower or loan ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Collections stage filter */}
        <Select value={filterStage} onValueChange={v => { setFilterStage(v); setPage(1); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Collections stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections Stages</SelectItem>
            <SelectItem value="tier1_reminder">Tier 1 — Reminder</SelectItem>
            <SelectItem value="tier2_plan_offer">Tier 2 — Plan Offer</SelectItem>
            <SelectItem value="tier3_collections">Tier 3 — Collections</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filtered.length} loan{filtered.length !== 1 ? 's' : ''} · page {page} of {totalPages}
        </p>

        {/* Bulk action bar */}
        {filtered.some(l => l.status === 'submitted') && (
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 shadow-sm">
            <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
              {filtered.filter(l => l.status === 'submitted').every(l => checkedIds.has(l.id))
                ? <CheckSquare className="w-4 h-4 text-[#1a3a6b]" />
                : <Square className="w-4 h-4 text-gray-400" />}
              Select submitted
            </button>
            {checkedIds.size > 0 && (
              <>
                <span className="text-xs text-gray-400 ml-auto">{checkedIds.size} selected</span>
                <Button size="sm" className="bg-green-600 text-white text-xs h-7 px-3" disabled={bulkSaving} onClick={() => setBulkConfirm({ status: 'approved' })}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Approve All
                </Button>
                <Button size="sm" className="bg-red-500 text-white text-xs h-7 px-3" disabled={bulkSaving} onClick={() => setBulkConfirm({ status: 'rejected' })}>
                  <XCircle className="w-3 h-3 mr-1" /> Reject All
                </Button>
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : paginated.map(loan => {
          const u = users[loan.user_id] || {};
          return (
            <Card key={loan.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelected({...loan})}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  {loan.status === 'submitted' && (
                    <button
                      className="mr-2 mt-0.5 flex-shrink-0"
                      onClick={e => { e.stopPropagation(); toggleCheck(loan.id); }}
                    >
                      {checkedIds.has(loan.id)
                        ? <CheckSquare className="w-4 h-4 text-[#1a3a6b]" />
                        : <Square className="w-4 h-4 text-gray-300" />}
                    </button>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{u.full_name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                    <p className="text-sm mt-1">UGX {loan.amount_requested?.toLocaleString()} · {loan.tenure_months}m</p>
                    {loan.purpose && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{loan.purpose}</p>}
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className={`text-xs ${STATUS_COLORS[loan.status] || 'bg-gray-100'}`}>{loan.status?.replace(/_/g,' ')}</Badge>
                    <p className="text-xs text-gray-400">{new Date(loan.created_date).toLocaleDateString()}</p>
                  </div>
                </div>
                {loan.status === 'submitted' && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="bg-green-600 text-white text-xs flex-1" onClick={(e) => { e.stopPropagation(); setSelected({...loan, status: 'approved'}); }}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" className="bg-red-500 text-white text-xs flex-1" onClick={(e) => { e.stopPropagation(); setSelected({...loan, status: 'rejected'}); }}>
                      <XCircle className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk action confirmation */}
      {bulkConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              {bulkConfirm.status === 'approved'
                ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                : <XCircle className="w-6 h-6 text-red-500" />}
              <h3 className="font-bold text-gray-900 dark:text-white">
                {bulkConfirm.status === 'approved' ? 'Approve' : 'Reject'} {checkedIds.size} loan{checkedIds.size > 1 ? 's' : ''}?
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will set <strong>{checkedIds.size}</strong> submitted application{checkedIds.size > 1 ? 's' : ''} to
              <strong> {bulkConfirm.status}</strong>. {bulkConfirm.status === 'approved' && 'Approved loans proceed to disbursement.'} This action is logged to the audit trail and cannot be undone in bulk.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={bulkSaving} onClick={() => setBulkConfirm(null)}>Cancel</Button>
              <Button
                className={`flex-1 text-white ${bulkConfirm.status === 'approved' ? 'bg-green-600' : 'bg-red-500'}`}
                disabled={bulkSaving}
                onClick={() => handleBulkAction(bulkConfirm.status)}
              >
                {bulkSaving ? 'Processing…' : `Yes, ${bulkConfirm.status === 'approved' ? 'Approve' : 'Reject'} All`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Update Loan</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400" aria-label="Close">✕</button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Borrower: {users[selected.user_id]?.full_name} · UGX {selected.amount_requested?.toLocaleString()}</p>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Status</label>
              <Select value={selected.status} onValueChange={v => setSelected(s => ({...s, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input type="number" placeholder="Approved Amount (UGX)" value={selected.amount_approved || ''} onChange={e => setSelected(s => ({...s, amount_approved: parseFloat(e.target.value)}))} />
            <Input type="number" placeholder="Interest Rate (%)" value={selected.interest_rate || ''} onChange={e => setSelected(s => ({...s, interest_rate: parseFloat(e.target.value)}))} />
            <Input placeholder="Admin Notes" value={selected.admin_notes || ''} onChange={e => setSelected(s => ({...s, admin_notes: e.target.value}))} />
            <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleUpdate} disabled={saving}>
              {saving ? 'Saving...' : 'Update Loan'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}