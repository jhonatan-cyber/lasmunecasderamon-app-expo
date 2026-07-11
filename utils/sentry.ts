/**
 * Lazy Sentry wrapper — uses a dynamic import so the Sentry SDK
 * (~1.8 MB) is NOT included in the entry bundle chunk.
 *
 * The SDK is loaded on demand: the first time any Sentry function
 * is called (e.g. the first error report, breadcrumb, or init).
 *
 * On web this produces a separate chunk; on mobile (Metro) the
 * dynamic import resolves synchronously but still defers SDK
 * evaluation out of the critical render path.
 */

type SentryModule = typeof import('@sentry/react-native');

let _sentryPromise: Promise<SentryModule> | null = null;
let _sentryModule: SentryModule | null = null;

function loadSentry(): Promise<SentryModule> {
  if (_sentryModule) return Promise.resolve(_sentryModule);
  if (!_sentryPromise) {
    _sentryPromise = import('@sentry/react-native').then((mod) => {
      _sentryModule = mod;
      return mod;
    });
  }
  return _sentryPromise;
}

// ── Public API ─────────────────────────────────────────────────────────

/** Lazy-init Sentry. Safe to call multiple times — subsequent calls are no-ops. */
export async function initSentry(options?: {
  dsn?: string;
  tracesSampleRate?: number;
}) {
  const Sentry = await loadSentry();
  Sentry.init({
    dsn:
      options?.dsn ??
      process.env.EXPO_PUBLIC_SENTRY_DSN ??
      'https://placeholder@example.ingest.sentry.io/placeholder',

    // ── Performance ────────────────────────────────────────────────
    // Disabled — we only use Sentry for error+crash reporting, not
    // transaction tracing or profiling.
    tracesSampleRate: options?.tracesSampleRate ?? 0,
    profilesSampleRate: 0,

    // ── Session Replay ─────────────────────────────────────────────
    // NOT setting replaysOnErrorSampleRate / replaysSessionSampleRate.
    // Setting them to 0 would trigger the SDK's default integration
    // logic to ADD the mobileReplayIntegration (with 0% sampling).
    // Leaving them undefined means the integration is never added.
    // Both @sentry-internal/replay (~299 KB) and @sentry-internal/
    // feedback (~76 KB) are only initialised when explicitly opted in.

    // ── Session & User ─────────────────────────────────────────────
    // Disable automatic session lifecycle — we don't use session
    // health or user metrics.
    enableAutoSessionTracking: false,

    // ── Native-only features (no effect on web) ────────────────────
    // Screenshots & view hierarchy adds overhead on native; we only
    // need breadcrumb-based error context.
    attachScreenshot: false,
    attachViewHierarchy: false,
  });
}

/** Add a breadcrumb to Sentry (recorded before init are buffered by the SDK). */
export async function addBreadcrumb(breadcrumb: {
  message?: string;
  category?: string;
  level?: import('@sentry/react-native').SeverityLevel;
  data?: Record<string, any>;
}) {
  try {
    const Sentry = await loadSentry();
    Sentry.addBreadcrumb(breadcrumb);
  } catch {
    // Silently ignore — Sentry availability should never crash the app.
  }
}

/** Capture an exception / error object. */
export async function captureException(error: any) {
  try {
    const Sentry = await loadSentry();
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(JSON.stringify(_formatPayload(error)));
    }
  } catch {
    // Silently ignore.
  }
}

/** Capture a text message. */
export async function captureMessage(message: string) {
  try {
    const Sentry = await loadSentry();
    Sentry.captureMessage(message);
  } catch {
    // Silently ignore.
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function _formatPayload(payload: any): any {
  if (!payload) return {};
  if (typeof payload === 'object') {
    try {
      return JSON.parse(JSON.stringify(payload, (_, v) => (v instanceof Error ? v.message : v)));
    } catch {
      return String(payload);
    }
  }
  return payload;
}
