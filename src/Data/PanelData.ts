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
export const SLEEP_FROM_HOUR = 23;
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

// Below this many units, the pod is close enough to empty that missing a change matters. A round
// number with real margin: at a typical basal rate this is still hours of insulin, not minutes, so
// there is time to act on the alarm rather than a slim chance of catching it. Also what turns the
// POD card red, independently of the alarm -- see podInsulinLow below.
export const POD_INSULIN_ALARM_UNITS = 10;

// The alarm is allowed to sound only in this window, local time -- not for as long as the pod stays
// low. The firmware sounds it once, on the rising edge of the flag this window produces, so a pod
// that never gets changed alarms again every following morning rather than once a minute all day.
// The window is a few minutes wide rather than a single instant so a panel that is mid-poll, briefly
// offline, or just booting right at the hour still catches the transition on its next fetch or two
// instead of sleeping through the day's only chance.
export const POD_INSULIN_ALARM_HOUR = 7;
export const POD_INSULIN_ALARM_WINDOW_MINUTES = 15;

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
    // Insulin remaining in the pod, in units, straight from the pump's own status report. null when
    // Nightscout has no pump status to read it from. Kept alongside the formatted string for the
    // same reason podRemainingHours is kept alongside podRemaining: /panel (the JSON debug view)
    // shows the number a consumer would otherwise have to parse back out of '8 U'.
    podInsulinUnits: number | null;
    // Formatted for the card: '42 U', or '--' when unknown. Rounded to one decimal rather than a
    // whole unit, because near the alarm threshold a tenth of a unit is exactly the kind of thing
    // worth not rounding away.
    podInsulin: string;
    // True whenever the reading is below POD_INSULIN_ALARM_UNITS, regardless of time of day -- this
    // is what colours the card, and it is deliberately not the same flag as 'alarm' below. The card
    // should read as a warning for as long as the pod is actually low; the alarm should only sound
    // once a day. isPodInsulinAlarm gates this same low reading by the clock to get that second,
    // narrower flag.
    podInsulinLow: boolean;
    // When the consumer should come back. getNightscoutData has already re-synced this to the CGM's
    // own five-minute cadence, so the panel inherits that instead of polling blindly.
    refreshSeconds: number;
    // Whether the panel should be dark right now. It still polls while asleep, slowly, which is
    // how it learns when to wake. Forced false whenever podInsulinLow is true, regardless of the
    // clock -- a pod worth alarming about is worth being able to see, and a dark panel overnight
    // would hide both the reading and the reason the alarm went off.
    sleeping: boolean;
    // Whether the panel should sound the low-insulin alarm right now. True for a short window once a
    // day at most -- see POD_INSULIN_ALARM_HOUR -- so the firmware can treat this as an edge rather
    // than a level and still only beep once per occurrence.
    alarm: boolean;
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
    const podInsulinLow = isPodInsulinLow(data.podInsulinUnits);
    // The dark schedule loses to a genuinely low pod: someone woken by, or checking on, the alarm
    // needs to be able to read the screen, and the reading needs to stay on the normal (not the
    // slow overnight) refresh cadence too -- see the refreshSeconds line below.
    const sleeping = isSleeping(secondsOfDay) && !podInsulinLow;

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
        podInsulinUnits: data.podInsulinUnits,
        podInsulin: formatInsulinUnits(data.podInsulinUnits),
        podInsulinLow: podInsulinLow,
        // Read after getNightscoutData, which is what updates it.
        refreshSeconds: sleeping ? sleepPollSeconds(secondsOfDay) : refreshRate.seconds,
        sleeping: sleeping,
        alarm: podInsulinLow && isWithinAlarmWindow(secondsOfDay),
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

/** Unknown never counts as low: there is nothing to warn about until there is a reading. */
function isPodInsulinLow(podInsulinUnits: number | null): boolean {
    return podInsulinUnits !== null && podInsulinUnits < POD_INSULIN_ALARM_UNITS;
}

/**
 * The clock half of the alarm decision. Deliberately separate from isPodInsulinLow: the card is
 * allowed to stay red all day, but the firmware fires on the rising edge of 'alarm', once per
 * successful fetch that finds it newly true, so 'true' has to go false again in between for the
 * next day's true to be an edge at all. Scoping this to a short daily window is what makes the
 * alarm *recur* every morning until the pod is changed, rather than sound once and never again.
 */
function isWithinAlarmWindow(secondsOfDay: number): boolean {
    const from = POD_INSULIN_ALARM_HOUR * 3600;
    const until = from + POD_INSULIN_ALARM_WINDOW_MINUTES * 60;
    return secondsOfDay >= from && secondsOfDay < until;
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

/**
 * '8.4 U' rather than a bare number, and '--' when Nightscout has no pump status to read it from --
 * the same 'unknown is not zero' distinction formatRemaining makes. One decimal place rather than a
 * whole unit: near the alarm threshold a tenth of a unit is exactly the kind of thing worth keeping.
 */
function formatInsulinUnits(units: number | null): string {
    if (units === null) {
        return '--';
    }
    return (Math.round(units * 10) / 10) + ' U';
}
