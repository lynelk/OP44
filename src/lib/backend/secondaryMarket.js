/**
 * P2P secondary market — STUBBED CLIENT
 * ------------------------------------------------------------------
 * Lets lenders list active investments for resale and buy others'
 * positions, providing liquidity before loan maturity. Currently
 * simulated with localStorage; swap each body for the Base44 contract:
 *
 *   getMyPositions()     -> base44.entities.LenderInvestment.filter({ lender_id, status:'active' })
 *   getListings()        -> base44.functions.invoke('p2pEngine', { action:'get_secondary_listings' })
 *   listPosition(p)      -> base44.functions.invoke('p2pEngine', { action:'list_position', ... })
 *   cancelListing(id)    -> base44.functions.invoke('p2pEngine', { action:'cancel_listing', listing_id })
 *   buyPosition(id, key) -> base44.functions.invoke('p2pEngine', { action:'buy_position', listing_id, idempotency_key })
 *
 * SecondaryListing = { id, loan_ref, seller_id, outstanding_principal,
 *   asking_price, discount_pct, risk_band, months_remaining, status, listed_at }
 *
 * NOTE for backend: buy_position MUST be idempotent (idempotency_key) and
 * atomic — debit buyer, credit seller, re-point LenderInvestment.lender_id,
 * record a RevenueTransaction (transfer fee), then close the listing.
 */

const KEY = 'pipiya_stub_secondary_listings';
const delay = (ms = 500) => new Promise(r => setTimeout(r, ms));
export const SECONDARY_STUB = true;

const read = (fallback) => { try { return JSON.parse(localStorage.getItem(KEY)) ?? fallback; } catch { return fallback; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };

export const TRANSFER_FEE_PCT = 1.0; // platform fee on settlement

// Seed a few listings from other lenders so the "Buy" tab isn't empty.
function seed() {
  const existing = read(null);
  if (existing) return existing;
  const base = [
    { loan_ref: 'P2P-2041', outstanding_principal: 620000, discount_pct: 3, risk_band: 'B', months_remaining: 5 },
    { loan_ref: 'P2P-1987', outstanding_principal: 1450000, discount_pct: 1.5, risk_band: 'A', months_remaining: 8 },
    { loan_ref: 'P2P-2110', outstanding_principal: 340000, discount_pct: 6, risk_band: 'C', months_remaining: 3 },
  ].map((b, i) => ({
    id: `seed_${i}`,
    seller_id: `lender_${100 + i}`,
    asking_price: Math.round(b.outstanding_principal * (1 - b.discount_pct / 100)),
    status: 'open',
    listed_at: new Date(Date.now() - i * 86400000).toISOString(),
    ...b,
  }));
  write(base);
  return base;
}

export async function getListings() {
  await delay(400);
  return seed().filter(l => l.status === 'open');
}

export async function getMyListings(userId) {
  await delay(300);
  return seed().filter(l => l.seller_id === userId);
}

// Investments owned by the user that are eligible to list (active, not in arrears).
export async function getMyPositions(userId) {
  await delay(300);
  try {
    const { base44 } = await import('@/api/base44Client');
    const me = userId || (await base44.auth.me()).id;
    const invs = await base44.entities.LenderInvestment.filter({ lender_id: me }, '-invested_at', 50).catch(() => []);
    return invs.filter(i => i.status === 'active');
  } catch {
    return [];
  }
}

export async function listPosition({ investment, askingPrice, userId }) {
  await delay(700);
  const all = seed();
  const outstanding = (investment.amount_invested || 0) - (investment.principal_recovered || 0);
  const listing = {
    id: `lst_${Date.now()}`,
    investment_id: investment.id,
    loan_ref: investment.loan_id ? `P2P-${String(investment.loan_id).slice(-4)}` : 'P2P',
    seller_id: userId,
    outstanding_principal: outstanding,
    asking_price: askingPrice,
    discount_pct: outstanding > 0 ? Math.round((1 - askingPrice / outstanding) * 1000) / 10 : 0,
    risk_band: investment.risk_band || 'B',
    months_remaining: null,
    status: 'open',
    listed_at: new Date().toISOString(),
  };
  write([listing, ...all]);
  return listing;
}

export async function cancelListing(id) {
  await delay(400);
  write(seed().map(l => l.id === id ? { ...l, status: 'cancelled' } : l));
}

export async function buyPosition(id) {
  await delay(900); // simulate atomic settlement
  const all = seed();
  const listing = all.find(l => l.id === id);
  if (!listing || listing.status !== 'open') throw new Error('Listing no longer available');
  const fee = Math.round(listing.asking_price * (TRANSFER_FEE_PCT / 100));
  write(all.map(l => l.id === id ? { ...l, status: 'settled', settled_at: new Date().toISOString() } : l));
  return { settled: true, paid: listing.asking_price, fee, total: listing.asking_price + fee };
}
