/**
 * P2P secondary market — LIVE
 * ------------------------------------------------------------------
 * All operations call the p2pEngine backend. Settlement (buy_position) is
 * atomic + idempotent server-side (reserve → transfer ownership → record
 * fee → finalise, with compensation on failure).
 */

import { base44 } from '@/api/base44Client';

export const SECONDARY_STUB = false;
export const TRANSFER_FEE_PCT = 1.0;

export async function getListings() {
  try {
    const res = await base44.functions.invoke('p2pEngine', { action: 'get_secondary_listings' });
    return res?.data?.listings || [];
  } catch {
    return [];
  }
}

export async function getMyListings(userId) {
  if (!userId) return [];
  try {
    return await base44.entities.SecondaryListing.filter({ seller_id: userId }, '-listed_at', 50);
  } catch {
    return [];
  }
}

export async function getMyPositions(userId) {
  try {
    const me = userId || (await base44.auth.me()).id;
    const invs = await base44.entities.LenderInvestment.filter({ lender_id: me }, '-invested_at', 50).catch(() => []);
    return invs.filter(i => i.status === 'active');
  } catch {
    return [];
  }
}

export async function listPosition({ investment, askingPrice }) {
  const res = await base44.functions.invoke('p2pEngine', {
    action: 'list_position',
    investment_id: investment.id,
    asking_price: askingPrice,
  });
  if (res?.data?.error) throw new Error(res.data.error);
  return res?.data?.listing;
}

export async function cancelListing(id) {
  const res = await base44.functions.invoke('p2pEngine', { action: 'cancel_listing', listing_id: id });
  if (res?.data?.error) throw new Error(res.data.error);
  return res?.data;
}

export async function buyPosition(id) {
  // Omit idempotency_key so the server uses its stable per-(listing,buyer) key,
  // making accidental double-taps safe.
  const res = await base44.functions.invoke('p2pEngine', { action: 'buy_position', listing_id: id });
  if (res?.data?.error) throw new Error(res.data.error);
  return res?.data; // { settled, paid, fee, total } | { duplicate }
}
