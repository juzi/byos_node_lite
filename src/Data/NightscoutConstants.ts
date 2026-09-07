export const NIGHTSCOUT_HOST = 'nightscout.zimmercarral.net';
export const REFRESH_SECONDS = 60;

// Request resilience: how often a transient failure (DNS, connection, 5xx) is retried, how long the
// backoff between attempts is, and how long a stale answer may still be used once everything failed.
export const REQUEST_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 500;
export const REQUEST_TIMEOUT_MS = 10000;
export const ADDRESS_FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const RESPONSE_FALLBACK_MAX_AGE_MS = 15 * 60 * 1000;

// Sensor and pod age. Nightscout pre-rounds its own age fields to whole hours, so the fractional
// age is derived from the treatment timestamp it reports alongside them.
export const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
export const HOURS_PER_DAY = 24;
export const UNKNOWN_AGE = -1;

// How long each wearable is expected to last, and how close to that the display starts warning.
// Measured from this account's own change history: sensor changes land at 240-255h (a ten-day
// sensor plus its grace period), pod changes at 59-81h (Omnipod's 72h plus its 8h grace).
export const SENSOR_LIFETIME_HOURS = 10 * HOURS_PER_DAY;
export const POD_LIFETIME_HOURS = 3 * HOURS_PER_DAY;

// How much notice each one gets. The windows differ on purpose: a day's notice is a small slice of
// a ten-day sensor, but on a three-day pod it would keep the warning lit for a third of every pod.
export const SENSOR_WARNING_HOURS = 24;
export const POD_WARNING_HOURS = 12;

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
