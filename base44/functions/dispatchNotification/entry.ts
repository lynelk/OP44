import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * dispatchNotification — single fan-out point for ALL user notifications.
 *
 * Writes the in-app Notification (correct schema) AND delivers over every
 * channel the user has enabled (SMS via Africa's Talking, push via FCM,
 * email via Resend), while respecting:
 *   - per-user channel toggles      (NotificationPreference)
 *   - quiet hours                   (suppresses non-urgent off-app channels)
 *   - per-category mutes            (muted_types)
 *
 * Other functions should call this instead of writing Notification directly:
 *   await base44.functions.invoke('dispatchNotification', { user_id, title, body, type, priority, action_url })
 *
 * Required secrets (each channel degrades gracefully to a no-op if unset):
 *   AFRICASTALKING_API_KEY, AFRICASTALKING_USERNAME, AFRICASTALKING_SENDER
 *   FCM_SERVER_KEY
 *   RESEND_API_KEY, NOTIFY_FROM_EMAIL
 */

const VALID_TYPES = [
  'repayment_due', 'loan_approved', 'loan_rejected', 'kyc_update', 'savings_goal',
  'rosca_contribution', 'rosca_payout', 'gamification', 'nudge', 'dispute_update', 'system',
];

function inQuietHours(prefs, now = new Date()) {
  if (!prefs?.quiet_hours_enabled) return false;
  const [sh, sm] = (prefs.quiet_start || '22:00').split(':').map(Number);
  const [eh, em] = (prefs.quiet_end || '07:00').split(':').map(Number);
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  // Window may wrap past midnight.
  return start <= end ? (cur >= start && cur < end) : (cur >= start || cur < end);
}

async function sendSMS(phone, message) {
  const key = Deno.env.get('AFRICASTALKING_API_KEY');
  const username = Deno.env.get('AFRICASTALKING_USERNAME');
  if (!key || !username || !phone) return { ok: false, skipped: true, reason: 'sms_not_configured' };
  try {
    const body = new URLSearchParams({
      username,
      to: phone,
      message: message.slice(0, 459), // up to 3 SMS segments
    });
    const from = Deno.env.get('AFRICASTALKING_SENDER');
    if (from) body.set('from', from);
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: { apiKey: key, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function sendPush(tokens, title, body, url) {
  const serverKey = Deno.env.get('FCM_SERVER_KEY');
  if (!serverKey || !tokens?.length) return { ok: false, skipped: true, reason: 'push_not_configured' };
  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { Authorization: `key=${serverKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_ids: tokens.map(t => t.token).filter(Boolean),
        notification: { title, body, click_action: url },
        data: { url: url || '' },
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function sendEmail(to, subject, text) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('NOTIFY_FROM_EMAIL');
  if (!key || !from || !to) return { ok: false, skipped: true, reason: 'email_not_configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch(() => null);
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { user_id, title, message, type, action_url, priority = 'medium' } = body;
    const text = body.body || message; // accept either field name

    // ── Input validation ──────────────────────────────────────────────
    if (!user_id || !title || !text || !type) {
      return Response.json({ error: 'user_id, title, body and type are required' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return Response.json({ error: `Invalid type. Allowed: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }
    // Only admins or backend (service role) may target another user.
    if (user_id !== caller.id && caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Load preferences (defaults if none) ───────────────────────────
    const prefRows = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id }, '-updated_date', 1);
    const prefs = prefRows?.[0] || { in_app: true, sms: true, push: false, email: false, muted_types: [] };

    const muted = (prefs.muted_types || []).includes(type);
    const urgent = priority === 'urgent';
    const quiet = inQuietHours(prefs) && !urgent;

    const channels = {};

    // ── In-app (always, unless category muted) ────────────────────────
    if (prefs.in_app !== false && !muted) {
      await base44.asServiceRole.entities.Notification.create({
        user_id, title, body: text, type, action_url, priority, is_read: false,
      });
      channels.in_app = 'sent';
    } else {
      channels.in_app = muted ? 'muted' : 'disabled';
    }

    // Off-app channels: skipped when muted or during quiet hours (non-urgent).
    if (muted || quiet) {
      return Response.json({ success: true, channels, suppressed: muted ? 'muted' : 'quiet_hours' });
    }

    // Need the user's phone/email for SMS/email.
    const profileRows = await base44.asServiceRole.entities.UserProfile.filter({ user_id }, '-updated_date', 1);
    const profile = profileRows?.[0];
    const fullText = `${title}\n${text}`;

    const tasks = [];
    if (prefs.sms && profile?.phone_number) {
      tasks.push(sendSMS(profile.phone_number, fullText).then(r => { channels.sms = r.ok ? 'sent' : (r.skipped ? 'skipped' : 'failed'); }));
    }
    if (prefs.push && prefs.device_tokens?.length) {
      tasks.push(sendPush(prefs.device_tokens, title, text, action_url).then(r => { channels.push = r.ok ? 'sent' : (r.skipped ? 'skipped' : 'failed'); }));
    }
    // When admin/service calls on behalf of another user, fetch the target's email from their profile.
    const targetEmail = user_id === caller.id
      ? caller.email
      : (profile?.email || profileRows?.[0]?.email_address);
    if (prefs.email && targetEmail) {
      tasks.push(sendEmail(targetEmail, title, text).then(r => { channels.email = r.ok ? 'sent' : (r.skipped ? 'skipped' : 'failed'); }));
    }
    await Promise.all(tasks);

    return Response.json({ success: true, channels });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
