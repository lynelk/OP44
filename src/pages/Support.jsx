import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LifeBuoy, Plus, X, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'loan_dispute', label: 'Loan dispute' },
  { value: 'payment_issue', label: 'Payment issue' },
  { value: 'kyc_issue', label: 'KYC / verification' },
  { value: 'account_access', label: 'Account access' },
  { value: 'rosca_dispute', label: 'Savings group dispute' },
  { value: 'general_inquiry', label: 'General inquiry' },
  { value: 'complaint', label: 'Complaint' },
];

const STATUS_CONFIG = {
  open: { label: 'Open', icon: Clock, cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In progress', icon: MessageSquare, cls: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'Closed', icon: CheckCircle2, cls: 'bg-gray-100 text-gray-500' },
  escalated: { label: 'Escalated', icon: AlertCircle, cls: 'bg-red-100 text-red-700' },
};

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: '', subject: '', description: '', priority: 'medium' });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.SupportTicket.filter({ user_id: u.id }, '-created_date')
        .then(setTickets)
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!form.category || !form.subject) return;
    setSubmitting(true);
    const ticket = await base44.entities.SupportTicket.create({
      user_id: user?.id,
      category: form.category,
      subject: form.subject,
      description: form.description,
      priority: form.priority,
      status: 'open',
    });
    setTickets(prev => [ticket, ...prev]);
    setForm({ category: '', subject: '', description: '', priority: 'medium' });
    setShowForm(false);
    setSubmitting(false);
  };

  const timeAgo = (d) => {
    if (!d) return '';
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Help & Support</h1>
        <p className="text-blue-100 text-sm">We're here to help — raise an issue and track it here.</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 h-10 bg-[#0D1BFF] hover:bg-[#0D1BFF]/90 text-white text-sm font-semibold px-4 rounded-full transition-colors">
          <Plus className="w-4 h-4" /> New Request
        </button>

        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">New Support Request</p>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="What's this about?" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="h-11 rounded-xl" />
              <textarea placeholder="Describe your issue..." value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} maxLength={1000}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent p-3 text-sm dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0D1BFF]/40" />
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <button onClick={submit} disabled={submitting || !form.category || !form.subject}
                className="w-full h-11 bg-[#0D1BFF] disabled:opacity-50 text-white font-semibold rounded-xl">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-24 animate-pulse" />)}</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <LifeBuoy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No support requests yet</p>
            <p className="text-sm">Tap “New Request” if you need help.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => {
              const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
              const Icon = sc.icon;
              const cat = CATEGORIES.find(c => c.value === t.category);
              return (
                <div key={t.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.subject}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cat?.label || t.category} · {timeAgo(t.created_date)}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${sc.cls}`}>
                      <Icon className="w-3 h-3" /> {sc.label}
                    </span>
                  </div>
                  {t.description && <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3">{t.description}</p>}
                  {t.resolution_notes && (
                    <div className="mt-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2.5">
                      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Resolution</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-300/80 mt-0.5">{t.resolution_notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
