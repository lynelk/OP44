import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { ugx, parseUGX } from '../_shared/money.ts';
import { checkRateLimit, rateLimitedResponse } from '../_shared/rateLimit.ts';

// ─── MTN MoMo: Get access token ───────────────────────────────────────────────
async function getMtnAccessToken() {
  const apiUser = Deno.env.get('MTN_MOMO_API_USER');
  const apiKey = Deno.env.get('MTN_MOMO_API_KEY');
  const subscriptionKey = Deno.env.get('MTN_MOMO_SUBSCRIPTION_KEY');
  const baseUrl = Deno.env.get('MTN_MOMO_BASE_URL');

  const credentials = btoa(`${apiUser}:${apiKey}`);
  const res = await fetch(`${baseUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
  });
  if (!res.ok) { console.error('[MTN] token error:', await res.text()); throw new Error('Mobile money provider unavailable'); }
  const data = await res.json();
  return data.access_token;
}

// ─── MTN MoMo: Request to Pay ────────────────────────────────────────────────
async function mtnRequestToPay({ amount, phone_number, txnRef, note }) {
  const baseUrl = Deno.env.get('MTN_MOMO_BASE_URL');
  const subscriptionKey = Deno.env.get('MTN_MOMO_SUBSCRIPTION_KEY');
  const token = await getMtnAccessToken();

  // Initiate payment
  const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Reference-Id': txnRef,
      'X-Target-Environment': baseUrl.includes('sandbox') ? 'sandbox' : 'mtnuganda',
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: 'UGX',
      externalId: txnRef,
      payer: { partyIdType: 'MSISDN', partyId: phone_number },
      payerMessage: note,
      payeeNote: note,
    }),
  });

  if (res.status !== 202) { console.error('[MTN] request failed:', res.status, await res.text()); throw new Error('Mobile money payment could not be initiated'); }

  // Return immediately — the user's handset will receive the payment prompt.
  // The client must call action:'check_status' with check_txn_ref to settle the
  // repayment once confirmed. This avoids holding an HTTP thread for 30 seconds.
  return { success: false, pending: true, txn_ref: txnRef, error: 'Awaiting payment confirmation from MTN' };
}

// ─── Airtel Money: Get access token ──────────────────────────────────────────
async function getAirtelAccessToken() {
  const baseUrl = Deno.env.get('AIRTEL_BASE_URL');
  const clientId = Deno.env.get('AIRTEL_CLIENT_ID');
  const clientSecret = Deno.env.get('AIRTEL_CLIENT_SECRET');

  const res = await fetch(`${baseUrl}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  });
  if (!res.ok) { console.error('[Airtel] token error:', await res.text()); throw new Error('Mobile money provider unavailable'); }
  const data = await res.json();
  return data.access_token;
}

// ─── Airtel Money: Request to Pay ────────────────────────────────────────────
async function airtelRequestToPay({ amount, phone_number, txnRef, note }) {
  const baseUrl = Deno.env.get('AIRTEL_BASE_URL');
  const token = await getAirtelAccessToken();

  const res = await fetch(`${baseUrl}/merchant/v2/payments/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Country': 'UG',
      'X-Currency': 'UGX',
    },
    body: JSON.stringify({
      reference: note,
      subscriber: { country: 'UG', currency: 'UGX', msisdn: phone_number },
      transaction: { amount, country: 'UG', currency: 'UGX', id: txnRef },
    }),
  });

  const data = await res.json();
  if (data?.status?.code === '200' || data?.status?.success) {
    return { success: true, txn_ref: txnRef };
  }
  return { success: false, error: data?.status?.message || 'Airtel payment failed' };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 10 payment requests per user per minute
    const rl = await checkRateLimit({ scope: 'payment', userId: user.id, limit: 10, windowSecs: 60 });
    if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

    const body = await req.json();
    const { loan_id, p2p_loan_id, amount, phone_number, provider, idempotency_key, action, check_txn_ref } = body;

    // ── Status reconciliation: poll the provider for a previously-pending txn and
    //    settle the matching pending Repayment if it has now succeeded. ──
    if (action === 'check_status' && check_txn_ref) {
      const [legacy, p2p] = await Promise.all([
        base44.entities.Repayment.filter({ transaction_ref: check_txn_ref }, '-created_date', 1).catch(() => []),
        base44.entities.P2PRepayment.filter({ transaction_ref: check_txn_ref }, '-created_date', 1).catch(() => []),
      ]);
      const rec = legacy[0] || p2p[0];
      if (!rec) return Response.json({ status: 'not_found' });
      if (rec.status === 'paid') return Response.json({ status: 'paid', txn_ref: check_txn_ref });

      // Re-query MTN (only MTN supports our poll endpoint here)
      let confirmed = false;
      try {
        const baseUrl = Deno.env.get('MTN_MOMO_BASE_URL');
        if (baseUrl) {
          const token = await getMtnAccessToken();
          const statusRes = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${check_txn_ref}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Target-Environment': baseUrl.includes('sandbox') ? 'sandbox' : 'mtnuganda',
              'Ocp-Apim-Subscription-Key': Deno.env.get('MTN_MOMO_SUBSCRIPTION_KEY'),
            },
          });
          const s = await statusRes.json();
          confirmed = s.status === 'SUCCESSFUL';
          if (s.status === 'FAILED') {
            const ent = legacy[0] ? 'Repayment' : 'P2PRepayment';
            await base44.entities[ent].update(rec.id, { status: 'failed' });
            return Response.json({ status: 'failed', txn_ref: check_txn_ref });
          }
        }
      } catch (_) { /* provider unreachable; stay pending */ }

      if (confirmed) {
        const today = new Date().toISOString().split('T')[0];
        const ent = legacy[0] ? 'Repayment' : 'P2PRepayment';
        await base44.entities[ent].update(rec.id, { status: 'paid', paid_date: today });
        return Response.json({ status: 'paid', txn_ref: check_txn_ref });
      }
      return Response.json({ status: 'pending', txn_ref: check_txn_ref });
    }

    if (!amount || !phone_number || !provider) {
      return Response.json({ error: 'Missing required fields: amount, phone_number, provider' }, { status: 400 });
    }
    if (!loan_id && !p2p_loan_id) {
      return Response.json({ error: 'Provide either loan_id or p2p_loan_id' }, { status: 400 });
    }

    // ── Input validation ──
    const payAmount = parseUGX(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return Response.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    if (!/^\+?\d{9,15}$/.test(String(phone_number))) {
      return Response.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // ── Idempotency: a repeated key that already settled returns the prior result
    //    instead of charging the customer twice. ──
    const txnRef = idempotency_key || `${provider.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    if (idempotency_key) {
      const [legacyDupe, p2pDupe] = await Promise.all([
        base44.entities.Repayment.filter({ transaction_ref: idempotency_key }, '-created_date', 1).catch(() => []),
        base44.entities.P2PRepayment.filter({ transaction_ref: idempotency_key }, '-created_date', 1).catch(() => []),
      ]);
      if (legacyDupe.length > 0 || p2pDupe.length > 0) {
        return Response.json({ success: true, duplicate: true, txn_ref: idempotency_key });
      }
    }
    const note = loan_id ? `Loan repayment ${loan_id}` : `P2P loan repayment ${p2p_loan_id}`;

    // ── Call real provider API ──
    let result;
    const prov = provider.toLowerCase();
    if (prov === 'mtn') {
      result = await mtnRequestToPay({ amount: payAmount, phone_number, txnRef, note });
    } else if (prov === 'airtel') {
      result = await airtelRequestToPay({ amount: payAmount, phone_number, txnRef, note });
    } else {
      return Response.json({ error: `Unsupported provider: ${provider}. Use 'mtn' or 'airtel'` }, { status: 400 });
    }

    // ── Pending: provider hasn't confirmed yet. Record a pending repayment so the
    //    transaction is traceable and reconcilable, and tell the client to poll. ──
    if (!result.success && result.pending) {
      try {
        if (loan_id) {
          await base44.entities.Repayment.create({
            loan_id, user_id: user.id, amount: payAmount,
            due_date: new Date().toISOString().split('T')[0],
            status: 'pending', payment_method: 'mobile_money', transaction_ref: txnRef,
          });
        } else if (p2p_loan_id) {
          await base44.entities.P2PRepayment.create({
            loan_id: p2p_loan_id, user_id: user.id, amount: payAmount,
            due_date: new Date().toISOString().split('T')[0],
            status: 'pending', payment_method: 'mobile_money', transaction_ref: txnRef,
          });
        }
      } catch (_) { /* non-critical: pending trace */ }
      return Response.json({ success: false, pending: true, txn_ref: txnRef, error: result.error });
    }

    if (!result.success) {
      return Response.json({ success: false, error: result.error, txn_ref: txnRef });
    }

    const today = new Date().toISOString().split('T')[0];

    // ── Handle traditional loan repayment ──
    if (loan_id) {
      const loans = await base44.entities.LoanApplication.filter({ user_id: user.id });
      const targetLoan = loans.find(l => l.id === loan_id);
      if (!targetLoan) return Response.json({ error: 'Loan not found' }, { status: 404 });
      if (!['active', 'disbursed'].includes(targetLoan.status)) {
        return Response.json({ error: 'Loan is not active' }, { status: 400 });
      }

      const repayments = await base44.entities.Repayment.filter({ loan_id });
      const nextDue = repayments
        .filter(r => r.status === 'scheduled' || r.status === 'overdue')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

      if (nextDue) {
        await base44.entities.Repayment.update(nextDue.id, {
          status: 'paid', paid_date: today,
          payment_method: 'mobile_money', transaction_ref: txnRef,
        });
      } else {
        await base44.entities.Repayment.create({
          loan_id, user_id: user.id, amount: payAmount,
          due_date: today, paid_date: today,
          status: 'paid', payment_method: 'mobile_money', transaction_ref: txnRef,
        });
      }

      const newBalance = ugx(Math.max(0, (targetLoan.outstanding_balance || targetLoan.total_repayable || 0) - payAmount));
      const newStatus = newBalance <= 0 ? 'closed' : targetLoan.status;
      await base44.entities.LoanApplication.update(loan_id, { outstanding_balance: newBalance, status: newStatus });

      await notify(base44, user.id, {
        title: 'Loan Repayment Confirmed',
        body: `UGX ${payAmount.toLocaleString()} via ${provider.toUpperCase()} confirmed. Ref: ${txnRef}. ${newBalance > 0 ? `Remaining: UGX ${newBalance.toLocaleString()}` : 'Loan fully repaid! 🎉'}`,
        type: 'system', priority: 'medium', action_url: '/loans/statement',
      });

      return Response.json({
        success: true, txn_ref: txnRef, provider, amount_paid: payAmount,
        new_balance: newBalance, loan_closed: newBalance <= 0, timestamp: new Date().toISOString(),
      });
    }

    // ── Handle P2P loan repayment ──
    if (p2p_loan_id) {
      const p2pLoans = await base44.entities.P2PLoan.filter({ borrower_id: user.id });
      const targetP2P = p2pLoans.find(l => l.id === p2p_loan_id);
      if (!targetP2P) return Response.json({ error: 'P2P Loan not found' }, { status: 404 });

      const repayments = await base44.entities.P2PRepayment.filter({ loan_id: p2p_loan_id });
      const nextDue = repayments
        .filter(r => r.status === 'scheduled' || r.status === 'overdue')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

      if (nextDue) {
        await base44.entities.P2PRepayment.update(nextDue.id, {
          status: 'paid', paid_date: today,
          payment_method: 'mobile_money', transaction_ref: txnRef,
        });
      }

      const newBalance = ugx(Math.max(0, (targetP2P.outstanding_balance || 0) - payAmount));
      await base44.entities.P2PLoan.update(p2p_loan_id, {
        outstanding_balance: newBalance,
        status: newBalance <= 0 ? 'closed' : targetP2P.status,
      });

      await notify(base44, user.id, {
        title: 'P2P Repayment Confirmed',
        body: `UGX ${payAmount.toLocaleString()} P2P repayment via ${provider.toUpperCase()} confirmed. Ref: ${txnRef}.`,
        type: 'system', priority: 'medium', action_url: '/p2p',
      });

      return Response.json({
        success: true, txn_ref: txnRef, provider, amount_paid: payAmount,
        new_balance: newBalance, loan_closed: newBalance <= 0, timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('[processMobileMoneyPayment] unhandled error:', error);
    return Response.json({ error: 'Payment processing failed. Please try again or contact support.' }, { status: 500 });
  }
});

// Route confirmations through the central dispatcher (channels + quiet hours + valid schema).
async function notify(base44, userId, { title, body, type, action_url, priority = 'medium' }) {
  try {
    await base44.functions.invoke('dispatchNotification', { user_id: userId, title, body, type, action_url, priority });
  } catch {
    await base44.asServiceRole.entities.Notification.create({ user_id: userId, title, body, type, action_url, priority, is_read: false }).catch(() => null);
  }
}