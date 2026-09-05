import {NightscoutToken, State} from './NightscoutTypes.js';
import {getSummaryErrorResponse} from './NightscoutUtils.js';
import {getValidToken} from './NightscoutAuth.js';
import {getNightscoutJson} from './NightscoutHttp.js';

export async function getState(): Promise<State> {
    try {
        const token = await getValidToken();
        return await getStateWithToken(token);
    } catch (error: any) {
        console.error(error.message);
        return getSummaryErrorResponse(error.message);
    }
}

async function getStateWithToken(nightscoutToken: NightscoutToken): Promise<State> {
    const summaryResponse = await getNightscoutJson('/api/v2/summary', 'summary', {
        headers: {'Authorization': 'Bearer ' + nightscoutToken.token},
        reuseLastGoodResponse: true
    });

    if (!summaryResponse || !summaryResponse.state) {
        return getSummaryErrorResponse('No summary data');
    }

    return {
        error: '',
        iob: summaryResponse.state.iob
    };
}
