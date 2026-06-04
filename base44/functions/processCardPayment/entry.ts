import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { ugx, parseUGX } from '../_shared/money.ts';
import { checkRateLimit, rateLimitedResponse } from '../_shared/rateLimit.ts';

// ─── Flutterwave card charge ──────────────────────────────────────────────────
async function flutterwaveCharge(payload: {
  card_number: string;
  cvv: string;
  expiry_month: string;
  expiry_year: string;
  amount: number;
  currency: string;
  tx_ref: string;
  email: string;
  fullname: string;
  phone_number: string;
  redirect_url: string;
}) {
  const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
  if (!secretKey) throw new Error('Card payments are not configured');

  const res = await fetch('https://api.flutterwave.com/v3/charges?type=card', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      card_number: payload.card_number,
      cvv: payload.cvv,
      expiry_month: payload.expiry_month,
      expiry_year: payload.expiry_year,
      currency: payload.currency,
      amount: payload.amount,
      fullname: payload.fullname,
      email: payload.email,
      phone_number: payload.phone_number,
      tx_ref: payload.tx_ref,
      redirect_url: payload.redirect_url,
      authorization: { mode: 'pin' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[Flutterwave] charge error:', res.status, err);
    throw new Error('Card payment could not be initiated');
  }

  return res.json();
}

// ─── Validate a pending Flutterwave PIN challenge ──────────────────────────
async function flutterwaveValidatePin(flw_ref: string, otp: string) {
  const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
  const res = await fetch('https://api.flutterwave.com/v3/validate-charge', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ flw_ref, otp }),
  });
  return res.json();
}

// ─── Verify a Flutterwave transaction ────────────────────────────────────────
async function flutterwaveVerify(transaction_id: string) {
  const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
    headers: { 'Authorization': `Bearer ${secretKey}` },
  });
  return res.json();
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await checkRateLimit({ scope: 'card_payment', userId: user.id, limit: 5, windowSecs: 60 });
    if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

    const body = await req.json();
    const {
      action,
      // Card details
      card_number, cvv, expiry_month, expiry_year,
      // PIN / OTP validation
      flw_ref, otp,
      // Transaction verify
      transaction_id,
      // Payment target (one of these required)
      loan_id, p2p_loan_id, savings_pocket_id, savings_goal_id, savings_group_id,
      // Amount
      amount,
      // Idempotency
      idempotency_key,
    } = body;

    // ── PIN/OTP validation step ──────────────────────────────────────────────
    if (action === 'validate_pin' && flw_ref && otp) {
      const result = await flutterwaveValidatePin(flw_ref, otp);
      if (result.status === 'success' && result.data?.status === 'successful') {
        return Response.json({ success: true, transaction_id: result.data.id, txn_ref: result.data.tx_ref });
      }
      if (result.data?.status === 'pending') {
        return Response.json({ pending: true, flw_ref, message: result.message });
      }
      return Response.json({ success: false, error: result.message || 'PIN validation failed' });
    }

    // ── Verify and settle a completed Flutterwave transaction ─────────────────
    if (action === 'verify_and_settle' && transaction_id) {
      const result = await flutterwaveVerify(transaction_id);
      if (result.status !== 'success' || result.data?.status !== 'successful') {
        return Response.json({ success: false, error: 'Transaction not confirmed by Flutterwave' });
      }

      const txnRef = result.data.tx_ref;
      const payAmount = ugx(result.data.amount);
      const today = new Date().toISOString().split('T')[0];

      // Determine target from tx_ref prefix: LOAN-xxx, P2P-xxx, PKT-xxx, GOAL-xxx, GRP-xxx
      const targetId = body.loan_id || body.p2p_loan_id || body.savings_pocket_id
        || body.savings_goal_id || body.savings_group_id;

      return await settlePayment({ base44, user, payAmount, txnRef, today, loan_id: body.loan_id,
        p2p_loan_id: body.p2p_loan_id, savings_pocket_id: body.savings_pocket_id,
        savings_goal_id: body.savings_goal_id, savings_group_id: body.savings_group_id });
    }

    // ── Initial card charge ──────────────────────────────────────────────────
    if (!card_number || !cvv || !expiry_month || !expiry_year || !amount) {
      return Response.json({ error: 'Missing required card fields' }, { status: 400 });
    }
    if (!loan_id && !p2p_loan_id && !savings_pocket_id && !savings_goal_id && !savings_group_id) {
      return Response.json({ error: 'Provide a payment target (loan_id, savings_pocket_id, etc.)' }, { status: 400 });
    }

    const payAmount = parseUGX(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return Response.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Card number basic check (strip spaces, 13–19 digits)
    const cardDigits = String(card_number).replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cardDigits)) {
      return Response.json({ error: 'Invalid card number' }, { status: 400 });
    }

    const txnRef = idempotency_key || `CARD-${loan_id || savings_pocket_id || savings_goal_id || savings_group_id || p2p_loan_id}-${Date.now()}`;

    const chargeResult = await flutterwaveCharge({
      card_number: cardDigits,
      cvv: String(cvv),
      expiry_month: String(expiry_month).padStart(2, '0'),
      expiry_year: String(expiry_year).slice(-2),
      amount: payAmount,
      currency: 'UGX',
      tx_ref: txnRef,
      email: user.email || `${user.id}@opfin.ug`,
      fullname: user.full_name || 'OpFin User',
      phone_number: user.phone_number || '',
      redirect_url: Deno.env.get('APP_BASE_URL') || 'https://app.opfin.ug/payment-callback',
    });

    // PIN challenge required
    if (chargeResult.meta?.authorization?.mode === 'pin') {
      return Response.json({
        action_required: 'pin',
        flw_ref: chargeResult.data?.flw_ref,
        message: chargeResult.message || 'Enter your card PIN to continue',
      });
    }

    // OTP / 3DS redirect
    if (chargeResult.meta?.authorization?.mode === 'redirect') {
      return Response.json({
        action_required: 'redirect',
        redirect_url: chargeResult.meta.authorization.redirect,
        txn_ref: txnRef,
      });
    }

    // OTP required
    if (chargeResult.meta?.authorization?.mode === 'otp') {
      return Response.json({
        action_required: 'otp',
        flw_ref: chargeResult.data?.flw_ref,
        message: chargeResult.message || 'Enter the OTP sent to your phone/email',
      });
    }

    // Immediate success (some cards approve without challenge)
    if (chargeResult.status === 'success' && chargeResult.data?.status === 'successful') {
      const today = new Date().toISOString().split('T')[0];
      return await settlePayment({ base44, user, payAmount, txnRef, today,
        loan_id, p2p_loan_id, savings_pocket_id, savings_goal_id, savings_group_id });
    }

    return Response.json({ success: false, error: chargeResult.message || 'Card charge failed' });

  } catch (error) {
    console.error('[processCardPayment] error:', error);
    return Response.json({ error: error.message || 'Card payment failed. Please try again.' }, { status: 500 });
  }
});

// ─── Settle payment across all target types ──────────────────────────────────
async function settlePayment({ base44, user, payAmount, txnRef, today,
  loan_id, p2p_loan_id, savings_pocket_id, savings_goal_id, savings_group_id }) {

  if (loan_id) {
    const loans = await base44.entities.LoanApplication.filter({ user_id: user.id });
    const loan = loans.find(l => l.id === loan_id);
    if (!loan) return Response.json({ error: 'Loan not found' }, { status: 404 });

    const repayments = await base44.entities.Repayment.filter({ loan_id });
    const nextDue = repayments
      .filter(r => r.status === 'scheduled' || r.status === 'overdue')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

    if (nextDue) {
      await base44.entities.Repayment.update(nextDue.id, {
        status: 'paid', paid_date: today, payment_method: 'card', transaction_ref: txnRef,
      });
    } else {
      await base44.entities.Repayment.create({
        loan_id, user_id: user.id, amount: payAmount,
        due_date: today, paid_date: today,
        status: 'paid', payment_method: 'card', transaction_ref: txnRef,
      });
    }

    const newBalance = ugx(Math.max(0, (loan.outstanding_balance || loan.total_repayable || 0) - payAmount));
    await base44.entities.LoanApplication.update(loan_id, {
      outstanding_balance: newBalance,
      status: newBalance <= 0 ? 'closed' : loan.status,
    });

    return Response.json({ success: true, txn_ref: txnRef, payment_method: 'card',
      amount_paid: payAmount, new_balance: newBalance, loan_closed: newBalance <= 0,
      timestamp: new Date().toISOString() });
  }

  if (p2p_loan_id) {
    const p2pLoans = await base44.entities.P2PLoan.filter({ borrower_id: user.id });
    const loan = p2pLoans.find(l => l.id === p2p_loan_id);
    if (!loan) return Response.json({ error: 'P2P Loan not found' }, { status: 404 });

    const repayments = await base44.entities.P2PRepayment.filter({ loan_id: p2p_loan_id });
    const nextDue = repayments
      .filter(r => r.status === 'scheduled' || r.status === 'overdue')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
    if (nextDue) {
      await base44.entities.P2PRepayment.update(nextDue.id, {
        status: 'paid', paid_date: today, payment_method: 'card', transaction_ref: txnRef,
      });
    }

    const newBalance = ugx(Math.max(0, (loan.outstanding_balance || 0) - payAmount));
    await base44.entities.P2PLoan.update(p2p_loan_id, {
      outstanding_balance: newBalance, status: newBalance <= 0 ? 'closed' : loan.status,
    });

    return Response.json({ success: true, txn_ref: txnRef, payment_method: 'card',
      amount_paid: payAmount, new_balance: newBalance, loan_closed: newBalance <= 0,
      timestamp: new Date().toISOString() });
  }

  if (savings_pocket_id) {
    const pockets = await base44.entities.SavingsPocket.filter({ user_id: user.id });
    const pocket = pockets.find(p => p.id === savings_pocket_id);
    if (!pocket) return Response.json({ error: 'Savings pocket not found' }, { status: 404 });

    const newBalance = ugx((pocket.current_balance || 0) + payAmount);
    await base44.entities.SavingsPocket.update(savings_pocket_id, { current_balance: newBalance });

    return Response.json({ success: true, txn_ref: txnRef, payment_method: 'card',
      amount_paid: payAmount, new_balance: newBalance, pocket_name: pocket.name,
      timestamp: new Date().toISOString() });
  }

  if (savings_goal_id) {
    const res = await base44.functions.invoke('savingsGoalManager', {
      action: 'contribute', goal_id: savings_goal_id, amount: payAmount,
      payment_method: 'card', transaction_ref: txnRef,
    });
    return Response.json({ success: true, txn_ref: txnRef, payment_method: 'card',
      amount_paid: payAmount, goal: res?.data?.goal, timestamp: new Date().toISOString() });
  }

  if (savings_group_id) {
    const res = await base44.functions.invoke('savingsGroupManager', {
      action: 'contribute', group_id: savings_group_id, amount: payAmount,
      notes: `Card payment. Ref: ${txnRef}`,
    });
    return Response.json({ success: true, txn_ref: txnRef, payment_method: 'card',
      amount_paid: payAmount, new_total: res?.data?.new_total, timestamp: new Date().toISOString() });
  }

  return Response.json({ error: 'No valid payment target provided' }, { status: 400 });
}
