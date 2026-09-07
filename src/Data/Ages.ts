import {Ages, NightscoutToken} from './NightscoutTypes.js';
import {getAgesErrorResponse} from './NightscoutUtils.js';
import {getValidToken} from './NightscoutAuth.js';
import {getNightscoutJson} from './NightscoutHttp.js';
import {MILLISECONDS_PER_HOUR, UNKNOWN_AGE} from './NightscoutConstants.js';

// The sage/cage/iage properties Nightscout computes for its own pill display. Asking for the three
// by name keeps the answer at a few hundred bytes; the unfiltered /api/v2/properties drags the
// whole loop prediction along with it.
const AGES_PATH = '/api/v2/properties/sage,cage,iage';

export async function getAges(): Promise<Ages> {
    try {
        const token = await getValidToken();
        return await getAgesWithToken(token);
    } catch (error: any) {
        console.error(error.message);
        return getAgesErrorResponse(error.message);
    }
}

async function getAgesWithToken(nightscoutToken: NightscoutToken): Promise<Ages> {
    const agesResponse = await getNightscoutJson(AGES_PATH, 'ages', {
        headers: {'Authorization': 'Bearer ' + nightscoutToken.token},
        reuseLastGoodResponse: true
    });

    if (!agesResponse) {
        return getAgesErrorResponse('No age data');
    }

    return {
        error: '',
        sensorHours: getHoursSince(getSensorTreatmentDate(agesResponse.sage)),
        podHours: getHoursSince(getPodTreatmentDate(agesResponse))
    };
}

/**
 * sage is keyed by the event that started the sensor -- 'Sensor Start' or 'Sensor Change' -- and
 * 'min' names the one Nightscout considers current, so it is the only entry worth reading.
 */
function getSensorTreatmentDate(sage: any): number | undefined {
    return getTreatmentDate(sage ? sage[sage.min] : undefined);
}

/**
 * A pod change makes AndroidAPS write a Site Change and an Insulin Change at the same instant, so
 * the cannula age is the pod's age. iage only stands in when the site change never made it over.
 */
function getPodTreatmentDate(ages: any): number | undefined {
    return getTreatmentDate(ages.cage) ?? getTreatmentDate(ages.iage);
}

function getTreatmentDate(age: any): number | undefined {
    if (!age || !age.found || !age.treatmentDate) {
        return undefined;
    }
    return age.treatmentDate;
}

function getHoursSince(treatmentDate: number | undefined): number {
    if (treatmentDate === undefined) {
        return UNKNOWN_AGE;
    }
    return (Date.now() - treatmentDate) / MILLISECONDS_PER_HOUR;
}
