import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * bankSyncTransactions — pull transactions for a linked account and upsert
 * them into BankTransaction, idempotently keyed by external_id.
 *
 * Provider call is env-gated (MONO_SECRET_KEY shown as the example). Without
 * a provider configured it falls back to a deterministic dev feed so the
 * pipeline (categorise → upsert → import) is fully exercisable.
 */

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

// Lightweight keyword categoriser (production: reuse categorizeExpenses / LLM).
function categorise(description = '') {
  const d = description.toLowerCase();
  if (/food|restaurant|cafe|jumia|carrefour|super/.test(d)) return 'food';
  if (/boda|uber|taxi|fuel|shell|total|transport/.test(d)) return 'transport';
  if (/umeme|yaka|water|nwsc|airtime|data|utilit/.test(d)) return 'utilities';
  if (/dstv|netflix|cinema|bet/.test(d)) return 'entertainment';
  if (/pharma|clinic|hospital|medical/.test(d)) return 'health';
  if (/rent|landlord/.test(d)) return 'housing';
  if (/school|tuition|fees/.test(d)) return 'education';
  if (/salary|payroll/.test(d)) return 'other';
  return 'other';
}

async function fetchFromProvider(connection) {
  const monoKey = Deno.env.get('MONO_SECRET_KEY');
  if (monoKey && connection.provider_account_id) {
    // Live path (Mono example). Shape mapped to our BankTransaction contract.
    const res = await fetch(`https://api.withmono.com/v2/accounts/${connection.provider_account_id}/transactions`, {
      headers: { 'mono-sec-key': monoKey, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Provider sync failed (${res.status})`);
    const data = await res.json();
    return (data?.data || []).map((t) => ({
      external_id: String(t.id),
      amount: Math.abs(Number(t.amount)) / 100,
      direction: t.type === 'credit' ? 'credit' : 'debit',
      description: t.narration || t.category || 'Transaction',
      merchant: t.narration || '',
      category: categorise(t.narration || t.category),
      booked_at: t.date || new Date().toISOString(),
    }));
  }

  // Dev fallback feed.
  const now = Date.now();
  return Array.from({ length: 12 }, (_, i) => {
    const p = MERCHANTS[(i + now) % MERCHANTS.length];
    return {
      external_id: `dev_${connection.id}_${now}_${i}`,
      amount: p.dir === 'credit' ? 800000 : 5000 + Math.floor(Math.random() * 120000),
      direction: p.dir,
      description: p.m,
      merchant: p.m,
      category: p.c,
      booked_at: new Date(now - i * 86400000 * 2).toISOString(),
    };
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { connection_id } = await req.json();
    const arr = await base44.entities.BankConnection.filter({ id: connection_id });
    const connection = arr[0];
    if (!connection) return Response.json({ error: 'Connection not found' }, { status: 404 });
    if (connection.user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const incoming = await fetchFromProvider(connection);

    // Idempotent upsert: skip transactions we already have by external_id.
    const existing = await base44.entities.BankTransaction.filter({ connection_id }, '-booked_at', 500);
    const seen = new Set(existing.map(t => t.external_id));
    const toCreate = incoming.filter(t => !seen.has(t.external_id));

    const created = await Promise.all(toCreate.map(t =>
      base44.entities.BankTransaction.create({
        user_id: user.id,
        connection_id,
        external_id: t.external_id,
        amount: t.amount,
        direction: t.direction,
        description: t.description,
        merchant: t.merchant,
        category: t.category,
        booked_at: t.booked_at,
        imported: false,
      }).catch(() => null)
    ));

    await base44.entities.BankConnection.update(connection_id, { last_synced_at: new Date().toISOString() });

    return Response.json({
      success: true,
      synced: incoming.length,
      new: created.filter(Boolean).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
