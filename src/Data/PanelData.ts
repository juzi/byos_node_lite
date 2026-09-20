import {getNightscoutData} from './NightscoutData.js';
import {refreshRate} from '../BYOS/Display.js';
import {TIMEZONE} from '../Config.js';
import {
    ARROW_DOUBLE_DOWN,
    ARROW_DOUBLE_UP,
    ARROW_FLAT,
    ARROW_FORTYFIVE_DOWN,
    ARROW_FORTYFIVE_UP,
    ARROW_SINGLE_DOWN,
    ARROW_SINGLE_UP,
    HOURS_PER_DAY,
    POD_LIFETIME_HOURS,
    SENSOR_LIFETIME_HOURS,
    UNKNOWN_AGE
} from './NightscoutConstants.js';

// Glucose bands in mg/dL. The inner pair is the usual time-in-range target; the outer pair is where
// a glance should read as "act now" rather than "worth knowing".
export const LOW_MG_DL = 70;
export const HIGH_MG_DL = 180;
export const URGENT_LOW_MG_DL = 55;
export const URGENT_HIGH_MG_DL = 250;

// The panel is dark between these hours, local time. The schedule lives here rather than in the
// firmware because this is the only side that knows the wall clock and the timezone -- the panel
// has no RTC, and doing it here means DST is somebody else's problem.
export const SLEEP_FROM_HOUR = 11;
export const SLEEP_UNTIL_HOUR = 6;

// How often to check back while dark. Rare enough that a night costs a handful of fetches instead
// of several hundred, frequent enough that waking is punctual: the last poll before the boundary
// asks for exactly the seconds remaining, so the screen comes back within seconds of the hour.
export const SLEEP_POLL_SECONDS = 300;

// A CGM reports every five minutes. Past six, one has been missed -- not yet alarming, but enough
// that the number on screen should stop presenting itself as current.
export const AGE_WARNING_MINUTES = 6;

// Three missed readings is no longer a blip, and a panel showing a number that old without saying
// so is worse than a panel showing nothing.
export const STALE_MINUTES = 15;

/**
 * The trend as a name rather than a glyph, so the template can pick an arrow to draw instead of
 * depending on the render container having a font with arrows in it.
 */
export type PanelTrend =
    'DoubleUp' | 'SingleUp' | 'FortyFiveUp' | 'Flat' | 'FortyFiveDown' | 'SingleDown' | 'DoubleDown' | 'None';

/** Which band the reading falls in. Drives colour, and nothing else. */
export type PanelBand = 'urgentLow' | 'low' | 'inRange' | 'high' | 'urgentHigh' | 'unknown';

export type PanelData = {
    error: string;
    sugar: number;
    trend: PanelTrend;
    band: PanelBand;
    sign: string;
    delta: number;
    // Minutes since the reading was taken. Not shown, but it is what separates a fresh value from
    // one that stopped updating half an hour ago.
    ageMinutes: number;
    // Past one missed reading: the value is probably still worth looking at, but not without a
    // caveat attached to it.
    ageWarning: boolean;
    stale: boolean;
    // Hours left before each wearable is due, counted down from the lifetimes this account's own
    // change history established. Negative means overdue, so 'unknown' has to be null rather than a
    // negative sentinel -- otherwise a consumer could not tell 'no data' from 'an hour late'.
    sensorRemainingHours: number | null;
    podRemainingHours: number | null;
    // The same two, formatted. Done here rather than in the template because Liquid cannot divide
    // by 24 and round without turning into a puzzle.
    sensorRemaining: string;
    podRemaining: string;
    sensorExpiring: boolean;
    podExpiring: boolean;
    // When the consumer should come back. getNightscoutData has already re-synced this to the CGM's
    // own five-minute cadence, so the panel inherits that instead of polling blindly.
    refreshSeconds: number;
    // Whether the panel should be dark right now. It still polls while asleep, slowly, which is
    // how it learns when to wake.
    sleeping: boolean;
    serverTime: number;
}

const TREND_BY_ARROW: Record<string, PanelTrend> = {
    [ARROW_DOUBLE_UP]: 'DoubleUp',
    [ARROW_SINGLE_UP]: 'SingleUp',
    [ARROW_FORTYFIVE_UP]: 'FortyFiveUp',
    [ARROW_FLAT]: 'Flat',
    [ARROW_FORTYFIVE_DOWN]: 'FortyFiveDown',
    [ARROW_SINGLE_DOWN]: 'SingleDown',
    [ARROW_DOUBLE_DOWN]: 'DoubleDown'
};

/**
 * The same reading the TRMNL screen is built from, shaped for the CrowPanel.
 *
 * Everything expensive and failure-prone -- the JWT, TLS to Nightscout, the retries, the DNS
 * fallback, the smoothing -- has already happened by the time this returns. An upstream failure
 * arrives here as a populated 'error' with zeroed values rather than as a rejection, so the panel
 * can say so instead of going blank.
 */
export async function getPanelData(): Promise<PanelData> {
    const data = await getNightscoutData();

    const now = new Date();
    const secondsOfDay = localSecondsOfDay(now);
    const sleeping = isSleeping(secondsOfDay);

    const sensorRemainingHours = getRemainingHours(data.sensorHours, SENSOR_LIFETIME_HOURS);
    const podRemainingHours = getRemainingHours(data.podHours, POD_LIFETIME_HOURS);

    return {
        error: data.error,
        sugar: data.sugar,
        trend: TREND_BY_ARROW[data.arrow] ?? 'None',
        band: getBand(data.error, data.sugar),
        sign: data.sign,
        delta: data.delta,
        ageMinutes: data.age,
        ageWarning: !data.error && data.age > AGE_WARNING_MINUTES,
        stale: !data.error && data.age >= STALE_MINUTES,
        sensorRemainingHours: sensorRemainingHours,
        podRemainingHours: podRemainingHours,
        sensorRemaining: formatRemaining(sensorRemainingHours),
        podRemaining: formatRemaining(podRemainingHours),
        sensorExpiring: data.sensorExpiring,
        podExpiring: data.podExpiring,
        // Read after getNightscoutData, which is what updates it.
        refreshSeconds: sleeping ? sleepPollSeconds(secondsOfDay) : refreshRate.seconds,
        sleeping: sleeping,
        serverTime: Math.floor(now.getTime() / 1000)
    };
}

const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * Seconds since local midnight, via Intl rather than arithmetic on a UTC offset, so that the two
 * days a year when the offset changes need no special handling.
 */
function localSecondsOfDay(now: Date): number {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(now);

    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return value('hour') * 3600 + value('minute') * 60 + value('second');
}

/** The window wraps midnight, so this is a union rather than a range. */
function isSleeping(secondsOfDay: number): boolean {
    const from = SLEEP_FROM_HOUR * 3600;
    const until = SLEEP_UNTIL_HOUR * 3600;
    return secondsOfDay >= from || secondsOfDay < until;
}

/**
 * While dark, come back either at the usual slow cadence or exactly when the window ends,
 * whichever is sooner. The 'whichever is sooner' half is what makes waking punctual.
 */
function sleepPollSeconds(secondsOfDay: number): number {
    let untilWake = SLEEP_UNTIL_HOUR * 3600 - secondsOfDay;
    if (untilWake <= 0) {
        untilWake += SECONDS_PER_DAY;
    }
    return Math.max(10, Math.min(untilWake, SLEEP_POLL_SECONDS));
}

function getBand(error: string, sugar: number): PanelBand {
    if (error || sugar <= 0) {
        return 'unknown';
    }
    if (sugar < URGENT_LOW_MG_DL) {
        return 'urgentLow';
    }
    if (sugar < LOW_MG_DL) {
        return 'low';
    }
    if (sugar > URGENT_HIGH_MG_DL) {
        return 'urgentHigh';
    }
    if (sugar > HIGH_MG_DL) {
        return 'high';
    }
    return 'inRange';
}

/**
 * An overdue wearable keeps counting into negative hours rather than clamping at zero: knowing it
 * is late is more useful than a stuck '0.0 d'.
 */
function getRemainingHours(ageHours: number, lifetimeHours: number): number | null {
    if (ageHours === UNKNOWN_AGE || ageHours < 0) {
        return null;
    }
    return Math.round((lifetimeHours - ageHours) * 10) / 10;
}

/**
 * Days and hours rather than a decimal day: '7d 9h' is a duration anyone can act on, where '7.4 d'
 * has to be converted in your head before it means anything. Same split formatAge uses for the
 * TRMNL screen, so the two displays talk about time the same way.
 *
 * Both parts are always present, including the zeroes -- '0d 7h' rather than '7h'. The redundant
 * zero buys a constant shape, so the two cards line up and the number does not change length as a
 * wearable counts down past a day.
 */
function formatRemaining(remainingHours: number | null): string {
    if (remainingHours === null) {
        return '--';
    }
    if (remainingHours < 0) {
        return 'overdue';
    }
    const days = Math.floor(remainingHours / HOURS_PER_DAY);
    const hours = Math.floor(remainingHours % HOURS_PER_DAY);
    return days + 'd ' + hours + 'h';
}
