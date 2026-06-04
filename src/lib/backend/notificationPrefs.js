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

// Preferences persist live; SMS/push *delivery* depends on provider secrets
// configured in Base44 (AFRICASTALKING_*, FCM_SERVER_KEY / VAPID).
export const NOTIF_PREFS_STUB = false;

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

const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

/**
 * Requests permission, registers the service worker, and (when a VAPID public
 * key is configured) subscribes to Web Push and persists the subscription as a
 * device token on the user's NotificationPreference. Degrades gracefully:
 * returns true if at least permission was granted.
 */
export async function registerPush() {
  if (typeof Notification === 'undefined' || !Notification.requestPermission) return false;
  let granted = false;
  try {
    granted = (await Notification.requestPermission()) === 'granted';
  } catch { return false; }
  if (!granted) return false;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (vapid && reg.pushManager) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });
        // Persist the subscription so the backend dispatcher can target this device.
        const prefs = await getPrefs();
        const tokens = [...(prefs.device_tokens || []), { token: JSON.stringify(sub), platform: 'web', registered_at: new Date().toISOString() }];
        await savePrefs({ ...prefs, push: true, device_tokens: tokens });
      }
    }
  } catch { /* permission still granted; token registration is best-effort */ }
  return true;
}
