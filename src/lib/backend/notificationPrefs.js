/**
 * Notification channel preferences + delivery
 * ------------------------------------------------------------------
 * Preferences are now persisted LIVE to the NotificationPreference entity.
 * The DELIVERY side (SMS/push fan-out) still needs a backend function:
 *
 *   dispatchNotification(notification) should write the in-app Notification,
 *   then for each enabled channel (sms via Africa's Talking, push via Web
 *   Push/FCM, email) respect quiet_hours + muted_types + UserConsent.
 *
 * registerPush() requests browser permission; obtaining/storing the actual
 * FCM/Web-Push token still needs a service worker + `registerDeviceToken`.
 */

import { base44 } from '@/api/base44Client';

// Delivery (SMS/push) is still simulated; preference storage is live.
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

const PREF_FIELDS = Object.keys(DEFAULT_PREFS);

// Cache the record id (+ user) between get and save so we update in place.
let _record = { id: null, user_id: null };

const pick = (obj) => PREF_FIELDS.reduce((o, k) => (o[k] = obj[k], o), {});

export async function getPrefs() {
  try {
    const me = await base44.auth.me();
    _record.user_id = me.id;
    const rows = await base44.entities.NotificationPreference.filter({ user_id: me.id }, '-updated_date', 1);
    if (rows?.[0]) {
      _record.id = rows[0].id;
      return { ...DEFAULT_PREFS, ...pick(rows[0]) };
    }
    return { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(prefs) {
  const data = { ...pick(prefs), user_id: _record.user_id };
  try {
    if (_record.id) {
      await base44.entities.NotificationPreference.update(_record.id, data);
    } else {
      const created = await base44.entities.NotificationPreference.create(data);
      _record.id = created.id;
    }
  } catch { /* keep optimistic UI even if the write fails */ }
  return prefs;
}

// Requests browser permission. Real token capture needs a service worker + VAPID.
export async function registerPush() {
  if (typeof Notification !== 'undefined' && Notification.requestPermission) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch { return false; }
  }
  return false;
}
