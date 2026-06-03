/**
 * Bank / mobile-money feed — STUBBED CLIENT
 * ------------------------------------------------------------------
 * This module is the single integration point for account aggregation
 * (bank + MoMo statement feeds). It currently returns simulated data
 * persisted to localStorage so the UI is fully demoable offline.
 *
 * TO GO LIVE: replace each function body with the corresponding Base44
 * function call — the request/response shapes below are the contract the
 * backend must honour. No UI changes will be required.
 *
 *   linkInitiate(provider)        -> base44.functions.invoke('bankLinkInitiate', { provider })
 *        returns { redirect_url } | { connection }
 *   listConnections()             -> base44.functions.invoke('bankListConnections', {})
 *        returns { connections: BankConnection[] }
 *   syncTransactions(connId)      -> base44.functions.invoke('bankSyncTransactions', { connection_id })
 *        returns { transactions: BankTransaction[], last_synced_at }
 *   importAsExpenses(ids)         -> base44.functions.invoke('bankImportExpenses', { transaction_ids })
 *        returns { imported: number }
 *
 * BankConnection  = { id, provider, institution, status, last_synced_at }
 * BankTransaction = { id, external_id, amount, direction:'debit'|'credit',
 *                     description, merchant, category, booked_at, imported }
 */

const KEY_CONN = 'pipiya_stub_bank_connections';
const KEY_TXN = 'pipiya_stub_bank_txns';
const delay = (ms = 600) => new Promise(r => setTimeout(r, ms));

export const BANK_STUB = true; // flip to false when wired to real backend

const read = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const PROVIDERS = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', kind: 'momo' },
  { id: 'airtel_money', name: 'Airtel Money', kind: 'momo' },
  { id: 'stanbic', name: 'Stanbic Bank', kind: 'bank' },
  { id: 'centenary', name: 'Centenary Bank', kind: 'bank' },
  { id: 'equity', name: 'Equity Bank', kind: 'bank' },
];

const MERCHANTS = [
  { m: 'SafeBoda', c: 'transport', dir: 'debit' },
  { m: 'Jumia Food', c: 'food', dir: 'debit' },
  { m: 'Umeme (Yaka)', c: 'utilities', dir: 'debit' },
  { m: 'DSTV', c: 'entertainment', dir: 'debit' },
  { m: 'Carrefour', c: 'food', dir: 'debit' },
  { m: 'MTN Airtime', c: 'utilities', dir: 'debit' },
  { m: 'Salary - Employer', c: 'other', dir: 'credit' },
  { m: 'Shell Fuel', c: 'transport', dir: 'debit' },
  { m: 'Pharmacy Plus', c: 'health', dir: 'debit' },
];

function genTxns(connId, n = 12) {
  const out = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const pick = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
    const base = pick.dir === 'credit' ? 800000 : 5000 + Math.floor(Math.random() * 120000);
    out.push({
      id: `${connId}_t${now}_${i}`,
      external_id: `ext_${now}_${i}`,
      amount: base,
      direction: pick.dir,
      description: pick.m,
      merchant: pick.m,
      category: pick.c,
      booked_at: new Date(now - i * 86400000 * 2).toISOString(),
      imported: false,
    });
  }
  return out;
}

export async function listConnections() {
  await delay(300);
  return read(KEY_CONN, []);
}

export async function linkProvider(providerId) {
  await delay(900); // simulate OAuth round-trip
  const provider = PROVIDERS.find(p => p.id === providerId);
  const conns = read(KEY_CONN, []);
  const conn = {
    id: `conn_${Date.now()}`,
    provider: providerId,
    institution: provider?.name || providerId,
    kind: provider?.kind || 'bank',
    status: 'active',
    last_synced_at: null,
  };
  write(KEY_CONN, [conn, ...conns]);
  return conn;
}

export async function removeConnection(connId) {
  await delay(300);
  write(KEY_CONN, read(KEY_CONN, []).filter(c => c.id !== connId));
  const txns = read(KEY_TXN, {});
  delete txns[connId];
  write(KEY_TXN, txns);
}

export async function syncTransactions(connId) {
  await delay(1100);
  const store = read(KEY_TXN, {});
  const fresh = genTxns(connId);
  store[connId] = [...fresh, ...(store[connId] || [])].slice(0, 40);
  write(KEY_TXN, store);
  const conns = read(KEY_CONN, []).map(c => c.id === connId ? { ...c, last_synced_at: new Date().toISOString() } : c);
  write(KEY_CONN, conns);
  return store[connId];
}

export async function getTransactions(connId) {
  await delay(200);
  return read(KEY_TXN, {})[connId] || [];
}

export async function markImported(connId, txnIds) {
  await delay(200);
  const store = read(KEY_TXN, {});
  store[connId] = (store[connId] || []).map(t => txnIds.includes(t.id) ? { ...t, imported: true } : t);
  write(KEY_TXN, store);
}

// Detects likely recurring expenses by repeated merchant on a regular cadence.
export function detectRecurring(txns) {
  const byMerchant = {};
  txns.filter(t => t.direction === 'debit').forEach(t => {
    (byMerchant[t.merchant] = byMerchant[t.merchant] || []).push(t);
  });
  return Object.entries(byMerchant)
    .filter(([, list]) => list.length >= 2)
    .map(([merchant, list]) => ({
      merchant,
      count: list.length,
      avg: Math.round(list.reduce((s, t) => s + t.amount, 0) / list.length),
      category: list[0].category,
    }));
}
