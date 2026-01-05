/**
 * Human-like Delays
 * 
 * - Random 10-25 sec before every fetch
 * - 2-second jitter before page loads
 * - 20-40 sec after auth calls (when CF sniffs hardest)
 */

import Logger from './logger';

/**
 * Random delay between min and max milliseconds
 */
const randomDelay = (minMs: number, maxMs: number): number => {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Human-like delay before fetch (5-15 seconds - RELAXED)
 * This mimics human reading/thinking time
 */
export const delayBeforeFetch = async (): Promise<void> => {
    const delayMs = randomDelay(5000, 15000); // 5-15 seconds (relaxed from 30-60)
    // Only log occasionally to avoid spam (10% of delays)
    if (Math.random() < 0.1) {
        Logger.info(`⏳ Human delay: ${Math.ceil(delayMs / 1000)}s before fetch...`);
    }
    await sleep(delayMs);
};

/**
 * Jitter before page load (2 seconds)
 * Mimics page load time
 */
export const jitterBeforePageLoad = async (): Promise<void> => {
    const jitterMs = Math.random() * 2000; // 0-2 seconds
    await sleep(jitterMs);
};

/**
 * Longer delay after auth calls (10-20 seconds - RELAXED)
 * Cloudflare sniffs hardest during auth
 */
export const delayAfterAuth = async (): Promise<void> => {
    const delayMs = randomDelay(10000, 20000); // 10-20 seconds (relaxed from 60-120)
    Logger.info(`🔐 Auth delay: ${Math.ceil(delayMs / 1000)}s after authentication...`);
    await sleep(delayMs);
};

/**
 * Random delay with jitter (for general use)
 */
export const randomDelayWithJitter = async (baseMs: number, jitterPercent: number = 0.2): Promise<void> => {
    const jitter = baseMs * jitterPercent;
    const delayMs = baseMs + (Math.random() * 2 - 1) * jitter; // ±jitter
    await sleep(Math.max(0, delayMs));
};

/**
 * Smart delay that adapts based on request type
 */
export const smartDelay = async (requestType: 'fetch' | 'auth' | 'page' | 'general' = 'general'): Promise<void> => {
    switch (requestType) {
        case 'fetch':
            await delayBeforeFetch();
            break;
        case 'auth':
            await delayAfterAuth();
            break;
        case 'page':
            await jitterBeforePageLoad();
            break;
        case 'general':
        default:
            // Small random delay for general requests
            await randomDelayWithJitter(2000, 0.5); // 1-3 seconds
            break;
    }
};
