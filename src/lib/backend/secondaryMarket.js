/**
 * P2P secondary market
 * ------------------------------------------------------------------
 * Listing lifecycle (list / browse / cancel) is now LIVE against the
 * SecondaryListing entity. SETTLEMENT (buyPosition) still needs a backend
 * function because it must be atomic + idempotent:
 *
 *   buyPosition -> base44.functions.invoke('p2pEngine', {
 *     action: 'buy_position', listing_id, idempotency_key })
 *   ...which must: debit buyer, credit seller, re-point
 *   LenderInvestment.lender_id, record a RevenueTransaction (transfer fee),
 *   then mark the listing settled — all-or-nothing.
 *
 * Until that exists, buyPosition performs a two-phase RESERVE: it marks the
 * listing 'matched' with the buyer id. A settlement/reconciliation function
 * later moves 'matched' -> 'settled'. No funds move client-side.
 */

import { base44 } from '@/api/base44Client';

// Settlement is still simulated (reserve only); listing CRUD is live.
export const SECONDARY_STUB = true;
export const TRANSFER_FEE_PCT = 1.0; // platform fee on settlement

export async function getListings() {
  try {
    const me = await base44.auth.me().catch(() => null);
    const rows = await base44.entities.SecondaryListing.filter({ status: 'open' }, '-listed_at', 50);
    return rows.filter(l => !me || l.seller_id !== me.id);
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

// Investments owned by the user that are eligible to list (active, not in arrears).
export async function getMyPositions(userId) {
  try {
    const me = userId || (await base44.auth.me()).id;
    const invs = await base44.entities.LenderInvestment.filter({ lender_id: me }, '-invested_at', 50).catch(() => []);
    return invs.filter(i => i.status === 'active');
  } catch {
    return [];
  }
}

export async function listPosition({ investment, askingPrice, userId }) {
  const outstanding = (investment.amount_invested || 0) - (investment.principal_recovered || 0);
  const discount = outstanding > 0 ? Math.round((1 - askingPrice / outstanding) * 1000) / 10 : 0;
  return base44.entities.SecondaryListing.create({
    investment_id: investment.id,
    loan_id: investment.loan_id,
    loan_ref: investment.loan_id ? `P2P-${String(investment.loan_id).slice(-4)}` : 'P2P',
    seller_id: userId,
    outstanding_principal: outstanding,
    asking_price: askingPrice,
    discount_pct: discount,
    risk_band: investment.risk_band || 'B',
    transfer_fee: Math.round(askingPrice * (TRANSFER_FEE_PCT / 100)),
    status: 'open',
    listed_at: new Date().toISOString(),
  });
}

export async function cancelListing(id) {
  return base44.entities.SecondaryListing.update(id, { status: 'cancelled' });
}

export async function buyPosition(id) {
  // TODO(live): replace with the atomic p2pEngine 'buy_position' settlement.
  const listing = (await base44.entities.SecondaryListing.filter({ id }, '-listed_at', 1))?.[0];
  if (!listing || listing.status !== 'open') throw new Error('Listing no longer available');
  const me = await base44.auth.me().catch(() => null);
  const fee = Math.round(listing.asking_price * (TRANSFER_FEE_PCT / 100));
  const idempotency_key = `buy_${id}_${me?.id || 'anon'}`;
  await base44.entities.SecondaryListing.update(id, {
    status: 'matched',
    buyer_id: me?.id,
    transfer_fee: fee,
    idempotency_key,
  });
  return { reserved: true, paid: listing.asking_price, fee, total: listing.asking_price + fee };
}
