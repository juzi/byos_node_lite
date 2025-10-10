import type {Entry} from "./NightscoutData.js";

/**
 * TSUNAMI DATA SMOOTHING CORE
 *
 * Calculates a weighted average of 1st and 2nd order exponential smoothing functions
 * to reduce the effect of sensor noise on APS performance. The weighted average
 * is a compromise between the fast response to changing BGs at the cost of smoothness
 * as offered by 1st order exponential smoothing, and the predictive, trend-sensitive but
 * slower-to-respond smoothing as offered by 2nd order functions.
 */
export default function smoothen(data: Entry[]): Entry[] {
    // Input data should be an array of objects with timestamp and value properties
    const sizeRecords = data.length;
    const o1_sBG = []; // Array for 1st order Smoothed Blood Glucose
    const o2_sBG = []; // Array for 2nd order Smoothed Blood Glucose
    const o2_sD = []; // Array for 2nd order Smoothed delta
    const ssBG = []; // Array for weighted averaged, doubly smoothed Blood Glucose

    let windowSize = data.length;
    const o1_weight = 0.4;
    const o1_a = 0.5;
    const o2_a = 0.4;
    const o2_b = 1.0;
    let insufficientSmoothingData = false;

    // ADJUST SMOOTHING WINDOW TO ONLY INCLUDE VALID READINGS
    // Adjust if database size is smaller than default window size + 1
    if (sizeRecords <= windowSize) {
        windowSize = Math.max(sizeRecords - 1, 0);
    }

    // Adjust window further if gap in BG database is detected
    for (let i = 0; i < windowSize; i++) {
        const timeDiffMinutes = Math.round((data[i].timestamp - data[i + 1].timestamp) / (1000 * 60));
        if (timeDiffMinutes >= 12) {
            windowSize = i + 1;
            break;
        } else if (data[i].value === 38.0) {
            windowSize = i;
            break;
        }
    }

    // CALCULATE SMOOTHING WINDOW - 1st order exponential smoothing
    o1_sBG.length = 0;

    if (windowSize >= 4) {
        o1_sBG.push(data[windowSize - 1].value);
        for (let i = 0; i < windowSize; i++) {
            o1_sBG.unshift(
                o1_sBG[0] + o1_a * (data[windowSize - 1 - i].value - o1_sBG[0])
            );
        }
    } else {
        insufficientSmoothingData = true;
    }

    // CALCULATE SMOOTHING WINDOW - 2nd order exponential smoothing
    if (windowSize >= 4) {
        o2_sBG.push(data[windowSize - 1].value);
        o2_sD.push(data[windowSize - 2].value - data[windowSize - 1].value);

        for (let i = 0; i < windowSize - 1; i++) {
            o2_sBG.unshift(
                o2_a * data[windowSize - 2 - i].value + (1 - o2_a) * (o2_sBG[0] + o2_sD[0])
            );
            o2_sD.unshift(
                o2_b * (o2_sBG[0] - o2_sBG[1]) + (1 - o2_b) * o2_sD[0]
            );
        }
    } else {
        insufficientSmoothingData = true;
    }

    // Process the data based on available smoothing data
    if (!insufficientSmoothingData) {
        // Calculate weighted averages
        for (let i = 0; i < o2_sBG.length; i++) {
            ssBG.push(o1_weight * o1_sBG[i] + (1 - o1_weight) * o2_sBG[i]);
        }

        // Update the input data with smoothed values
        for (let i = 0; i < Math.min(ssBG.length, data.length); i++) {
            data[i].smoothed = Math.max(Math.round(ssBG[i]), 39.0);
        }
    } else {
        // If insufficient data, copy original values
        for (let i = 0; i < data.length; i++) {
            data[i].smoothed = Math.max(data[i].value, 39.0);
        }
    }

    return data;
}
