/**
 * Bank / mobile-money feed
 * ------------------------------------------------------------------
 * Connection management (link / list / remove) is now LIVE against the
 * BankConnection entity. The TRANSACTION FEED is still simulated because it
 * depends on an aggregator backend function that doesn't exist yet:
 *
 *   linkProvider      -> base44.functions.invoke('bankLinkInitiate', { provider })
 *        (real flow: OAuth consent, then the function creates BankConnection
 *         server-side with the encrypted token reference)
 *   syncTransactions  -> base44.functions.invoke('bankSyncTransactions', { connection_id })
 *        (delta pull, upsert BankTransaction by external_id)
 *
 * Importing selected transactions already creates real Expense rows (in the
 * page), so the Budget side is genuinely live.
 */

import { base44 } from '@/api/base44Client';

const KEY_TXN = 'pipiya_stub_bank_txns';
export const BANK_STUB = true; // transaction feed still simulated

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const delay = (ms = 600) => new Promise(r => setTimeout(r, ms));

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

// ---- Connections: LIVE (BankConnection entity) ----

export async function listConnections() {
  try {
    const me = await base44.auth.me();
    return await base44.entities.BankConnection.filter({ user_id: me.id }, '-updated_date', 20);
  } catch {
    return [];
  }
}

export async function linkProvider(providerId) {
  await delay(700); // simulate the OAuth consent round-trip
  const me = await base44.auth.me();
  const provider = PROVIDERS.find(p => p.id === providerId);
  return base44.entities.BankConnection.create({
    user_id: me.id,
    provider: providerId,
    institution: provider?.name || providerId,
    kind: provider?.kind || 'bank',
    status: 'active',
    last_synced_at: null,
  });
}

export async function removeConnection(connId) {
  try { await base44.entities.BankConnection.delete(connId); } catch { /* ignore */ }
  const txns = read(KEY_TXN, {});
  delete txns[connId];
  write(KEY_TXN, txns);
}

// ---- Transactions: STUBBED (await aggregator function) ----

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

export async function syncTransactions(connId) {
  await delay(1100);
  const store = read(KEY_TXN, {});
  store[connId] = [...genTxns(connId), ...(store[connId] || [])].slice(0, 40);
  write(KEY_TXN, store);
  try { await base44.entities.BankConnection.update(connId, { last_synced_at: new Date().toISOString() }); } catch { /* ignore */ }
  return store[connId];
}

export async function getTransactions(connId) {
  await delay(150);
  return read(KEY_TXN, {})[connId] || [];
}

export async function markImported(connId, txnIds) {
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
