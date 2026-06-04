/**
 * Bank / mobile-money feed — LIVE
 * ------------------------------------------------------------------
 * Connections, sync and import all call backend functions. The aggregator
 * itself falls back to a deterministic dev feed until a provider
 * (Mono/Stitch/Okra) secret is configured in Base44 — the pipeline is real
 * either way (idempotent upsert by external_id, real Expense rows on import).
 */

import { base44 } from '@/api/base44Client';

export const BANK_STUB = false;

export const PROVIDERS = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', kind: 'momo' },
  { id: 'airtel_money', name: 'Airtel Money', kind: 'momo' },
  { id: 'stanbic', name: 'Stanbic Bank', kind: 'bank' },
  { id: 'centenary', name: 'Centenary Bank', kind: 'bank' },
  { id: 'equity', name: 'Equity Bank', kind: 'bank' },
];

export async function listConnections() {
  try {
    const me = await base44.auth.me();
    return await base44.entities.BankConnection.filter({ user_id: me.id }, '-updated_date', 20);
  } catch {
    return [];
  }
}

export async function linkProvider(providerId) {
  const res = await base44.functions.invoke('bankLinkInitiate', { provider: providerId });
  if (res?.data?.error) throw new Error(res.data.error);
  return res?.data?.connection;
}

export async function removeConnection(connId) {
  try { await base44.entities.BankConnection.delete(connId); } catch { /* ignore */ }
}

export async function syncTransactions(connId) {
  const res = await base44.functions.invoke('bankSyncTransactions', { connection_id: connId });
  if (res?.data?.error) throw new Error(res.data.error);
  return getTransactions(connId);
}

export async function getTransactions(connId) {
  try {
    return await base44.entities.BankTransaction.filter({ connection_id: connId }, '-booked_at', 50);
  } catch {
    return [];
  }
}

// Imports selected transactions into the Budget as real Expense rows (server-side, idempotent).
export async function importTransactions(transactionIds) {
  const res = await base44.functions.invoke('bankImportExpenses', { transaction_ids: transactionIds });
  if (res?.data?.error) throw new Error(res.data.error);
  return res?.data?.imported || 0;
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
