import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Building2, Smartphone, Trash2, ArrowDownToLine, Repeat, Check, Info, X } from 'lucide-react';
import {
  PROVIDERS, listConnections, linkProvider, removeConnection, syncTransactions,
  getTransactions, markImported, detectRecurring, BANK_STUB,
} from '@/lib/backend/bankFeed';

const ugx = (n) => `UGX ${(n || 0).toLocaleString()}`;
const CAT_ICON = { food: '🍔', transport: '🚌', utilities: '💡', entertainment: '🎬', health: '💊', other: '📋' };

export default function LinkedAccounts() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [txns, setTxns] = useState({}); // connId -> transactions
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState({}); // txnId -> bool
  const [toast, setToast] = useState('');

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    const me = await base44.auth.me().catch(() => null);
    setUser(me);
    const conns = await listConnections();
    setConnections(conns);
    const map = {};
    await Promise.all(conns.map(async c => { map[c.id] = await getTransactions(c.id); }));
    setTxns(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const link = async (providerId) => {
    setBusy('link');
    try {
      await linkProvider(providerId);
      setShowPicker(false);
      flash('Account linked');
      load();
    } finally { setBusy(null); }
  };

  const sync = async (connId) => {
    setBusy(connId);
    try {
      const t = await syncTransactions(connId);
      setTxns(prev => ({ ...prev, [connId]: t }));
      setConnections(await listConnections());
      flash('Transactions synced');
    } finally { setBusy(null); }
  };

  const unlink = async (connId) => {
    setBusy(connId);
    try { await removeConnection(connId); flash('Account removed'); load(); }
    finally { setBusy(null); }
  };

  const allTxns = Object.values(txns).flat();
  const importable = allTxns.filter(t => t.direction === 'debit' && !t.imported);
  const selectedIds = Object.keys(selected).filter(id => selected[id]);
  const recurring = detectRecurring(allTxns);

  const importSelected = async () => {
    if (selectedIds.length === 0 || !user) return;
    setBusy('import');
    try {
      // Create Expense rows from selected transactions (matches Budget module).
      const toImport = importable.filter(t => selected[t.id]);
      await Promise.all(toImport.map(t =>
        base44.entities.Expense.create({
          user_id: user.id,
          amount: t.amount,
          category: t.category,
          description: `${t.merchant} (imported)`,
          date: t.booked_at.split('T')[0],
        }).catch(() => null)
      ));
      // Mark imported per connection
      const byConn = {};
      toImport.forEach(t => {
        const conn = connections.find(c => (txns[c.id] || []).some(x => x.id === t.id));
        if (conn) (byConn[conn.id] = byConn[conn.id] || []).push(t.id);
      });
      await Promise.all(Object.entries(byConn).map(([cid, ids]) => markImported(cid, ids)));
      setSelected({});
      flash(`Imported ${toImport.length} transaction${toImport.length > 1 ? 's' : ''} to your budget`);
      load();
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-8">
        <button onClick={() => navigate('/budget')} className="flex items-center gap-1 text-blue-100 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Budget
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Linked Accounts</h1>
        <p className="text-blue-100 text-sm">Connect your bank or mobile money to auto-track spending.</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {BANK_STUB && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-px" />
            Preview: accounts and transactions are simulated. Live feeds connect via an aggregator (Mono/Stitch/Okra for banks, MoMo statements) once the backend is wired.
          </div>
        )}

        <button onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 h-10 bg-[#0D1BFF] hover:bg-[#0D1BFF]/90 text-white text-sm font-semibold px-4 rounded-full transition-colors">
          <Plus className="w-4 h-4" /> Link account
        </button>

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-20 animate-pulse" />)}</div>
        ) : (
          <>
            {connections.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm px-8">No accounts linked yet. Link one to import transactions automatically.</p>
              </div>
            ) : (
              connections.map(c => {
                const Icon = c.kind === 'momo' ? Smartphone : Building2;
                return (
                  <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-[#0D1BFF] dark:text-[#32B4FF]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.institution}</p>
                          <p className="text-xs text-gray-400">{c.last_synced_at ? `Synced ${new Date(c.last_synced_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}` : 'Never synced'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => sync(c.id)} disabled={busy === c.id}
                          className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center" aria-label="Sync">
                          <RefreshCw className={`w-4 h-4 text-[#0D1BFF] dark:text-[#32B4FF] ${busy === c.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => unlink(c.id)} disabled={busy === c.id}
                          className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center" aria-label="Remove">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Recurring detection */}
            {recurring.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-2">
                  <Repeat className="w-4 h-4 text-[#32B4FF]" /> Recurring payments detected
                </p>
                <div className="space-y-1.5">
                  {recurring.map(r => (
                    <div key={r.merchant} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-300">{CAT_ICON[r.category] || '📋'} {r.merchant} · {r.count}×</span>
                      <span className="font-semibold text-gray-900 dark:text-white">~{ugx(r.avg)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Importable transactions */}
            {importable.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Import to budget</p>
                  <button onClick={() => {
                    const all = {}; importable.forEach(t => { all[t.id] = true; }); setSelected(all);
                  }} className="text-xs text-[#0D1BFF] dark:text-[#32B4FF] font-medium">Select all</button>
                </div>
                {importable.map(t => (
                  <label key={t.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 dark:border-gray-800 cursor-pointer">
                    <input type="checkbox" checked={!!selected[t.id]}
                      onChange={e => setSelected(s => ({ ...s, [t.id]: e.target.checked }))}
                      className="w-4 h-4 accent-[#0D1BFF]" />
                    <span className="text-base">{CAT_ICON[t.category] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{t.merchant}</p>
                      <p className="text-xs text-gray-400">{new Date(t.booked_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })} · {t.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-500">-{(t.amount / 1000).toFixed(0)}K</span>
                  </label>
                ))}
                <div className="p-4">
                  <button onClick={importSelected} disabled={busy === 'import' || selectedIds.length === 0}
                    className="w-full h-11 bg-[#0D1BFF] disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5">
                    <ArrowDownToLine className="w-4 h-4" /> {busy === 'import' ? 'Importing…' : `Import ${selectedIds.length || ''} to budget`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Provider picker */}
      {showPicker && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-bold text-gray-900 dark:text-white">Choose a provider</p>
              <button onClick={() => setShowPicker(false)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {PROVIDERS.map(p => {
                const Icon = p.kind === 'momo' ? Smartphone : Building2;
                return (
                  <button key={p.id} onClick={() => link(p.id)} disabled={busy === 'link'}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#0D1BFF] transition-colors disabled:opacity-50">
                    <Icon className="w-5 h-5 text-[#0D1BFF] dark:text-[#32B4FF]" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg z-[110]">
          <Check className="w-3.5 h-3.5 text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}
