/**
 * monitoring — lightweight error-tracking wrapper.
 *
 * Lazily loads @sentry/react only when VITE_SENTRY_DSN is set.
 * Every call is a safe console fallback so the app builds without it.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sentry: any = null;
let _initialised = false;

export async function initMonitoring(): Promise<void> {
  if (_initialised) return;
  _initialised = true;

  const dsn = (import.meta as Record<string, unknown> & { env: Record<string, string> }).env?.VITE_SENTRY_DSN;
  if (!dsn) return;

  try {
    // Variable prevents Rollup from statically resolving the optional dep.
    const pkg = '@sentry/react';
    const Sentry = await import(/* @vite-ignore */ pkg).catch(() => null);
    if (!Sentry?.init) {
      console.info('[monitoring] VITE_SENTRY_DSN set but @sentry/react not installed — skipping.');
      return;
    }
    Sentry.init({
      dsn,
      environment: (import.meta as Record<string, unknown> & { env: Record<string, string> }).env?.VITE_APP_ENV || 'production',
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
    _sentry = Sentry;
  } catch (e) {
    console.warn('[monitoring] init failed:', e);
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (_sentry?.captureException) {
    _sentry.captureException(error, context ? { extra: context } : undefined);
  } else {
    console.error('[monitoring] captured error:', error, context ?? '');
  }
}

export function setUser(user: { id: string } | null): void {
  // Only a non-PII identifier — never email/phone.
  if (_sentry?.setUser) _sentry.setUser(user ? { id: user.id } : null);
}
