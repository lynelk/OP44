/**
 * monitoring — lightweight error-tracking wrapper.
 *
 * Production crash visibility without a hard dependency: if `VITE_SENTRY_DSN` is
 * set AND `@sentry/react` is installed, we initialise it lazily. Otherwise every
 * call is a safe console fallback, so the app builds and runs with or without it.
 *
 * To enable real tracking:
 *   1. npm i @sentry/react
 *   2. set VITE_SENTRY_DSN in your environment
 */

let _sentry = null;
let _initialised = false;

export async function initMonitoring() {
  if (_initialised) return;
  _initialised = true;

  const dsn = import.meta.env?.VITE_SENTRY_DSN;
  if (!dsn) return; // disabled — no DSN configured

  try {
    // Use a variable to prevent Rollup from statically resolving the optional dep.
    const pkg = '@sentry/react';
    const Sentry = await import(/* @vite-ignore */ pkg).catch(() => null);
    if (!Sentry?.init) {
      console.info('[monitoring] VITE_SENTRY_DSN set but @sentry/react not installed — skipping.');
      return;
    }
    Sentry.init({
      dsn,
      environment: import.meta.env?.VITE_APP_ENV || import.meta.env?.MODE || 'production',
      tracesSampleRate: 0.1,
      // Don't send PII by default — this is a financial app.
      sendDefaultPii: false,
    });
    _sentry = Sentry;
  } catch (e) {
    console.warn('[monitoring] init failed:', e);
  }
}

export function captureError(error, context) {
  if (_sentry?.captureException) {
    _sentry.captureException(error, context ? { extra: context } : undefined);
  } else {
    console.error('[monitoring] captured error:', error, context || '');
  }
}

export function setUser(user) {
  // Only a non-PII identifier — never email/phone.
  if (_sentry?.setUser) _sentry.setUser(user ? { id: user.id } : null);
}
