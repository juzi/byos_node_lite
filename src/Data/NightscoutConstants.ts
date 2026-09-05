export const NIGHTSCOUT_HOST = 'nightscout.zimmercarral.net';
export const REFRESH_SECONDS = 60;

// Request resilience: how often a transient failure (DNS, connection, 5xx) is retried, how long the
// backoff between attempts is, and how long a stale answer may still be used once everything failed.
export const REQUEST_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 500;
export const REQUEST_TIMEOUT_MS = 10000;
export const ADDRESS_FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const RESPONSE_FALLBACK_MAX_AGE_MS = 15 * 60 * 1000;

// Arrow symbols
export const PLUS_MINUS = '\u00b1'; // Plus-Minus sign
export const ARROW_FLAT = '\u2192';
export const ARROW_FORTYFIVE_UP = '\u2197';
export const ARROW_FORTYFIVE_DOWN = '\u2198';
export const ARROW_SINGLE_UP = '\u2191';
export const ARROW_SINGLE_DOWN = '\u2193';
export const ARROW_DOUBLE_UP = '\u21c8';
export const ARROW_DOUBLE_DOWN = '\u21ca';
export const ARROW_NONE = '??';
