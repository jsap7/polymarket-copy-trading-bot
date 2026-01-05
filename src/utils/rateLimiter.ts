/**
 * Rate Limiter
 * 
 * Global semaphore: max 3 requests per 60 seconds
 * If limit crossed, wait until window slides
 * No burst-fire ever
 */

import Logger from './logger';

class RateLimiter {
    private requests: number[] = [];
    private readonly MAX_REQUESTS = 5; // Relaxed from 1 to 5 - FASTER
    private readonly WINDOW_MS = 60 * 1000; // 60 seconds (relaxed from 90) - FASTER

    /**
     * Wait if rate limit would be exceeded
     */
    async waitIfNeeded(): Promise<void> {
        const now = Date.now();

        // Remove requests outside the window
        this.requests = this.requests.filter((timestamp) => now - timestamp < this.WINDOW_MS);

        // If at limit, wait until oldest request expires
        if (this.requests.length >= this.MAX_REQUESTS) {
            const oldestRequest = this.requests[0];
            const waitTime = this.WINDOW_MS - (now - oldestRequest) + 100; // Add 100ms buffer

            if (waitTime > 0) {
                Logger.info(`⏳ Rate limit reached (${this.requests.length}/${this.MAX_REQUESTS} requests). Waiting ${Math.ceil(waitTime / 1000)}s...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                
                // Clean up again after waiting
                const newNow = Date.now();
                this.requests = this.requests.filter((timestamp) => newNow - timestamp < this.WINDOW_MS);
            }
        }

        // Record this request
        this.requests.push(Date.now());
    }

    /**
     * Get current request count in window
     */
    getCurrentCount(): number {
        const now = Date.now();
        this.requests = this.requests.filter((timestamp) => now - timestamp < this.WINDOW_MS);
        return this.requests.length;
    }

    /**
     * Reset rate limiter (for testing)
     */
    reset(): void {
        this.requests = [];
    }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
