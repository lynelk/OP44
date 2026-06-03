/**
 * Notification channel preferences + delivery — STUBBED CLIENT
 * ------------------------------------------------------------------
 * Today notifications are in-app only. This module backs a preferences
 * UI (channels, quiet hours, per-category) and a push-registration flow.
 * Persisted to localStorage for now.
 *
 * TO GO LIVE:
 *   getPrefs()        -> base44.entities.NotificationPreference.filter({ user_id }) [0]
 *   savePrefs(prefs)  -> base44.entities.NotificationPreference.create/update(...)
 *   registerPush()    -> base44.functions.invoke('registerDeviceToken', { token, platform })
 *
 * Backend dispatcher contract (the key new function):
 *   dispatchNotification(notification) should: write the in-app Notification,
 *   then for each enabled channel (sms via Africa's Talking, push via Web Push/FCM,
 *   email) respect quiet_hours + per-category mutes + UserConsent before sending.
 *
 * NotificationPreference = {
 *   user_id, in_app, sms, push, email,
 *   quiet_hours_enabled, quiet_start, quiet_end,   // "HH:MM" 24h
 *   muted_types: string[],                          // Notification.type values
 *   device_tokens: { token, platform }[]
 * }
 */

const KEY = 'pipiya_stub_notification_prefs';
const delay = (ms = 250) => new Promise(r => setTimeout(r, ms));
export const NOTIF_PREFS_STUB = true;

export const DEFAULT_PREFS = {
  in_app: true,
  sms: true,
  push: false,
  email: false,
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
  muted_types: [],
  device_tokens: [],
};

// User-facing notification categories (mirror Notification.type enum).
export const NOTIF_CATEGORIES = [
  { type: 'repayment_due', label: 'Repayment reminders' },
  { type: 'loan_approved', label: 'Loan decisions' },
  { type: 'savings_goal', label: 'Savings goals' },
  { type: 'rosca_contribution', label: 'Savings circles' },
  { type: 'gamification', label: 'Rewards & badges' },
  { type: 'nudge', label: 'Tips & nudges' },
  { type: 'dispute_update', label: 'Dispute updates' },
  { type: 'system', label: 'System & security' },
];

export async function getPrefs() {
  await delay();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { ...DEFAULT_PREFS, ...(saved || {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(prefs) {
  await delay();
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  return prefs;
}

// Stub for push permission + token registration (real: navigator.serviceWorker + VAPID).
export async function registerPush() {
  await delay(500);
  if (typeof Notification !== 'undefined' && Notification.requestPermission) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch { return false; }
  }
  return false;
}
