import axios, { AxiosError } from 'axios';
import { ENV } from '../config/env';
import { proxyManager, ProxyConfig } from './proxyManager';
import { rateLimiter } from './rateLimiter';
import { delayBeforeFetch, jitterBeforePageLoad, smartDelay } from './humanDelays';
import Logger from './logger';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkError = (error: unknown): boolean => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const code = axiosError.code;
        // Network timeout/connection errors
        return (
            code === 'ETIMEDOUT' ||
            code === 'ENETUNREACH' ||
            code === 'ECONNRESET' ||
            code === 'ECONNREFUSED' ||
            !axiosError.response
        ); // No response = network issue
    }
    return false;
};

const fetchData = async (url: string, requestType: 'fetch' | 'auth' | 'page' | 'general' = 'fetch') => {
    const retries = ENV.NETWORK_RETRY_LIMIT;
    const timeout = ENV.REQUEST_TIMEOUT_MS;
    const retryDelay = 1000; // 1 second base delay
    const useAntiCloudflare = ENV.ENABLE_ANTI_CLOUDFLARE;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Anti-Cloudflare: Human-like delays
            if (useAntiCloudflare) {
                // Rate limiting: max 3 requests per 60 seconds
                await rateLimiter.waitIfNeeded();

                // Human delay before fetch (10-25 seconds)
                if (requestType === 'fetch') {
                    await delayBeforeFetch();
                } else if (requestType === 'page') {
                    await jitterBeforePageLoad();
                } else {
                    await smartDelay(requestType);
                }
            }

            // Get proxy configuration
            const proxyUrl = useAntiCloudflare ? proxyManager.getProxyUrl() : undefined;
            const headers = useAntiCloudflare ? proxyManager.getHeaders() : {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            };

            const axiosConfig: any = {
                timeout,
                headers,
                // Force IPv4 to avoid IPv6 connectivity issues
                family: 4,
            };

            // Add proxy if configured
            if (proxyUrl) {
                axiosConfig.proxy = {
                    host: proxyManager.getCurrentProxy()?.host || '',
                    port: proxyManager.getCurrentProxy()?.port || 0,
                    auth: proxyManager.getCurrentProxy()?.username && proxyManager.getCurrentProxy()?.password
                        ? {
                              username: proxyManager.getCurrentProxy()!.username!,
                              password: proxyManager.getCurrentProxy()!.password!,
                          }
                        : undefined,
                };
            }

            const response = await axios.get(url, axiosConfig);
            
            // Log proxy usage if enabled (only log occasionally to avoid spam)
            if (useAntiCloudflare && proxyUrl && Math.random() < 0.1) { // Log 10% of requests
                const proxyIp = proxyManager.getCurrentProxyIp();
                Logger.info(`✅ Request successful via proxy: ${proxyIp || 'direct'}`);
            }

            return response.data;
        } catch (error) {
            const isLastAttempt = attempt === retries;

            if (isNetworkError(error) && !isLastAttempt) {
                const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
                Logger.warning(
                    `⚠️  Network error (attempt ${attempt}/${retries}), retrying in ${delay / 1000}s...`
                );
                await sleep(delay);
                continue;
            }

            // If it's the last attempt or not a network error, throw
            if (isLastAttempt && isNetworkError(error)) {
                const errorCode = axios.isAxiosError(error) ? error.code : 'Unknown error';
                Logger.error(`❌ Network timeout after ${retries} attempts - ${errorCode}`);
            }
            throw error;
        }
    }
};

export default fetchData;
