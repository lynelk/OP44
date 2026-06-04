import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * bankLinkInitiate — start an account-aggregation link.
 *
 * In production this kicks off the provider's consent widget (Mono/Stitch/Okra
 * for banks; MoMo statement consent for mobile money) and the provider's
 * webhook/callback creates the BankConnection with an encrypted token ref.
 *
 * Until a provider is contracted, this creates the BankConnection + a
 * UserConsent record directly so the flow is usable end-to-end.
 *
 * Secrets (when live): MONO_SECRET_KEY / STITCH_CLIENT_ID etc.
 */

const PROVIDER_META = {
  mtn_momo:     { name: 'MTN Mobile Money', kind: 'momo' },
  airtel_money: { name: 'Airtel Money',     kind: 'momo' },
  stanbic:      { name: 'Stanbic Bank',     kind: 'bank' },
  centenary:    { name: 'Centenary Bank',   kind: 'bank' },
  equity:       { name: 'Equity Bank',      kind: 'bank' },
  other:        { name: 'Other',            kind: 'bank' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider } = await req.json();
    const meta = PROVIDER_META[provider];
    if (!meta) return Response.json({ error: 'Unsupported provider' }, { status: 400 });

    // Record the data-sharing consent (mirrors existing UserConsent usage).
    const consent = await base44.entities.UserConsent.create({
      user_id: user.id,
      consent_type: 'account_aggregation',
      version: '1.0',
      granted: true,
      granted_at: new Date().toISOString(),
      channel: 'app',
      notes: `Linked ${meta.name} for transaction import`,
    }).catch(() => null);

    const connection = await base44.entities.BankConnection.create({
      user_id: user.id,
      provider,
      institution: meta.name,
      kind: meta.kind,
      status: 'active',
      consent_id: consent?.id,
      consent_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_synced_at: null,
    });

    return Response.json({ connection });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
