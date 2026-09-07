import {beforeEach, expect, test, vi} from "vitest";

// Replies getNightscoutJson hands out, one per call, in order. Shared across the cases, which run
// sequentially -- vitest.config.ts switches concurrent mode on for the whole project.
const jsonReplies: any[] = [];

vi.mock('./NightscoutHttp.js', () => ({
    getNightscoutJson: () => {
        const reply = jsonReplies.shift();
        if (reply instanceof Error) {
            return Promise.reject(reply);
        }
        return Promise.resolve(reply);
    }
}));

vi.mock('./NightscoutAuth.js', () => ({
    getValidToken: () => Promise.resolve({token: 'TEST_TOKEN', expirationDateTime: Date.now() + 60000})
}));

const {getAges} = await import('./Ages.js');
const {formatAge} = await import('./NightscoutUtils.js');
const {UNKNOWN_AGE, MILLISECONDS_PER_HOUR} = await import('./NightscoutConstants.js');

beforeEach(() => {
    jsonReplies.length = 0;
});

function hoursAgo(hours: number): number {
    return Date.now() - hours * MILLISECONDS_PER_HOUR;
}

test('derives fractional ages from the treatment timestamps', async () => {
    jsonReplies.push({
        sage: {
            'Sensor Start': {found: false},
            'Sensor Change': {found: true, treatmentDate: hoursAgo(58.5), age: 58},
            min: 'Sensor Change'
        },
        cage: {found: true, treatmentDate: hoursAgo(9.25), age: 9},
        iage: {found: true, treatmentDate: hoursAgo(9.25), age: 9}
    });

    const ages = await getAges();

    expect(ages.error).toBe('');
    // The whole-hour fields Nightscout ships would have rounded these to 58 and 9.
    expect(ages.sensorHours).toBeCloseTo(58.5, 2);
    expect(ages.podHours).toBeCloseTo(9.25, 2);
})

test('reads the sensor event that min points at', async () => {
    jsonReplies.push({
        sage: {
            'Sensor Start': {found: true, treatmentDate: hoursAgo(3)},
            'Sensor Change': {found: true, treatmentDate: hoursAgo(200)},
            min: 'Sensor Start'
        },
        cage: {found: true, treatmentDate: hoursAgo(1)}
    });

    const ages = await getAges();

    expect(ages.sensorHours).toBeCloseTo(3, 2);
})

test('falls back to the insulin change when no site change was uploaded', async () => {
    jsonReplies.push({
        sage: {min: 'Sensor Change', 'Sensor Change': {found: true, treatmentDate: hoursAgo(12)}},
        cage: {found: false, treatmentDate: null},
        iage: {found: true, treatmentDate: hoursAgo(30)}
    });

    const ages = await getAges();

    expect(ages.podHours).toBeCloseTo(30, 2);
})

test('reports an unknown age when nothing was ever logged', async () => {
    jsonReplies.push({
        sage: {'Sensor Start': {found: false}, 'Sensor Change': {found: false}},
        cage: {found: false, treatmentDate: null},
        iage: {found: false, treatmentDate: null}
    });

    const ages = await getAges();

    expect(ages.error).toBe('');
    expect(ages.sensorHours).toBe(UNKNOWN_AGE);
    expect(ages.podHours).toBe(UNKNOWN_AGE);
})

test('reports an unknown age when the request fails', async () => {
    jsonReplies.push(new Error('Could not get ages. Code 502'));

    const ages = await getAges();

    expect(ages.error).toBe('Could not get ages. Code 502');
    expect(ages.sensorHours).toBe(UNKNOWN_AGE);
    expect(ages.podHours).toBe(UNKNOWN_AGE);
})

test('formatAge', () => {
    expect(formatAge(58.5)).toBe('2d10h');
    expect(formatAge(9.25)).toBe('0d9h');
    expect(formatAge(23.99)).toBe('0d23h');
    expect(formatAge(240)).toBe('10d0h');
    expect(formatAge(0)).toBe('0d0h');
    expect(formatAge(UNKNOWN_AGE)).toBe('?');
})
