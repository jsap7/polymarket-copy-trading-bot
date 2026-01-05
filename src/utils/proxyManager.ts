/**
 * Residential Proxy Manager
 * 
 * Rotates proxies every 15 minutes max
 * Never reuses an IP within 8 minutes
 * Sets X-Forwarded-For header to mimic real gateways
 */

import Logger from './logger';

export interface ProxyConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    ip?: string; // The actual IP address (for X-Forwarded-For header)
}

interface ProxyUsage {
    proxy: ProxyConfig;
    lastUsed: number;
    rotationTime: number; // When this proxy was last rotated in
}

class ProxyManager {
    private proxies: ProxyConfig[] = [];
    private currentProxyIndex: number = 0;
    private proxyUsage: Map<number, ProxyUsage> = new Map();
    private lastRotationTime: number = 0;
    private readonly ROTATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    private readonly REUSE_COOLDOWN_MS = 8 * 60 * 1000; // 8 minutes

    /**
     * Initialize proxy manager with proxy list
     */
    initialize(proxyList: ProxyConfig[]): void {
        if (proxyList.length === 0) {
            Logger.warning('⚠️  No proxies configured. Running without proxy rotation.');
            return;
        }

        this.proxies = proxyList;
        this.currentProxyIndex = 0;
        this.lastRotationTime = Date.now();
        
        // Initialize usage tracking
        this.proxies.forEach((proxy, index) => {
            this.proxyUsage.set(index, {
                proxy,
                lastUsed: 0,
                rotationTime: Date.now(),
            });
        });

        Logger.info(`✅ Proxy manager initialized with ${this.proxies.length} proxy(ies)`);
    }

    /**
     * Get current proxy, rotating if needed
     */
    getCurrentProxy(): ProxyConfig | null {
        if (this.proxies.length === 0) {
            return null;
        }

        const now = Date.now();
        const timeSinceRotation = now - this.lastRotationTime;

        // Rotate if 15 minutes have passed
        if (timeSinceRotation >= this.ROTATION_INTERVAL_MS) {
            this.rotateProxy();
        }

        // Check if current proxy was used within 8 minutes
        const currentUsage = this.proxyUsage.get(this.currentProxyIndex);
        if (currentUsage && (now - currentUsage.lastUsed) < this.REUSE_COOLDOWN_MS) {
            // Find next available proxy
            const nextProxy = this.findNextAvailableProxy();
            if (nextProxy !== null) {
                this.currentProxyIndex = nextProxy;
            }
        }

        // Update last used time
        const usage = this.proxyUsage.get(this.currentProxyIndex);
        if (usage) {
            usage.lastUsed = now;
        }

        return this.proxies[this.currentProxyIndex];
    }

    /**
     * Rotate to next proxy
     */
    private rotateProxy(): void {
        if (this.proxies.length === 0) return;

        const oldIndex = this.currentProxyIndex;
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
        this.lastRotationTime = Date.now();

        // Update rotation time for new proxy
        const newUsage = this.proxyUsage.get(this.currentProxyIndex);
        if (newUsage) {
            newUsage.rotationTime = Date.now();
        }

        const oldProxy = this.proxies[oldIndex];
        const newProxy = this.proxies[this.currentProxyIndex];
        Logger.info(
            `🔄 Proxy rotated: ${oldProxy.ip || oldProxy.host} → ${newProxy.ip || newProxy.host}`
        );
    }

    /**
     * Find next available proxy (not used within 8 minutes)
     */
    private findNextAvailableProxy(): number | null {
        const now = Date.now();
        let attempts = 0;
        let index = this.currentProxyIndex;

        while (attempts < this.proxies.length) {
            index = (index + 1) % this.proxies.length;
            const usage = this.proxyUsage.get(index);
            
            if (!usage || (now - usage.lastUsed) >= this.REUSE_COOLDOWN_MS) {
                return index;
            }
            
            attempts++;
        }

        // All proxies were recently used, return current one
        return null;
    }

    /**
     * Get proxy URL for axios
     */
    getProxyUrl(): string | undefined {
        const proxy = this.getCurrentProxy();
        if (!proxy) return undefined;

        if (proxy.username && proxy.password) {
            return `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
        }
        return `http://${proxy.host}:${proxy.port}`;
    }

    /**
     * Get headers including X-Forwarded-For
     */
    getHeaders(): Record<string, string> {
        const proxy = this.getCurrentProxy();
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
        };

        // Set X-Forwarded-For to mimic real gateway
        if (proxy?.ip) {
            headers['X-Forwarded-For'] = proxy.ip;
        }

        return headers;
    }

    /**
     * Get current proxy IP (for logging)
     */
    getCurrentProxyIp(): string | null {
        const proxy = this.getCurrentProxy();
        return proxy?.ip || proxy?.host || null;
    }
}

// Singleton instance
export const proxyManager = new ProxyManager();
