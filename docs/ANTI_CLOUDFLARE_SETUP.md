# 🛡️ Anti-Cloudflare Setup Guide

This guide explains how to configure the bot's anti-Cloudflare features to avoid getting blocked.

## Overview

The bot now includes multiple layers of protection against Cloudflare blocking:

1. **Residential Proxy Rotation** - Rotates IPs every 15 minutes, never reuses within 8 minutes
2. **Human-like Delays** - Random delays (10-25s) before fetches, 2s jitter before page loads, 20-40s after auth
3. **Rate Limiting** - Max 3 requests per 60 seconds (global semaphore)
4. **Smart Headers** - X-Forwarded-For headers to mimic real gateways

## Step 1: Get Residential Proxies

You need a pool of residential IPs. Popular providers:

- **Bright Data** (formerly Luminati): https://brightdata.com
- **Oxylabs**: https://oxylabs.io
- **Smartproxy**: https://smartproxy.com
- **Proxy-Cheap**: https://proxy-cheap.com

**Important**: Use **residential IPs**, not datacenter IPs. Datacenter IPs are more likely to be blocked.

## Step 2: Configure Proxies

Add your proxies to `.env`:

```bash
# Proxy Configuration
# Format: host:port:username:password:ip (comma-separated)
# Or: host:port (without auth)
# Example with auth:
PROXY_LIST='proxy1.example.com:8080:user1:pass1:1.2.3.4,proxy2.example.com:8080:user2:pass2:5.6.7.8'

# Example without auth:
PROXY_LIST='proxy1.example.com:8080,proxy2.example.com:8080'

# Enable/disable anti-Cloudflare features (default: true)
ENABLE_ANTI_CLOUDFLARE=true
```

### Proxy Format Explained

- **host**: Proxy server hostname or IP
- **port**: Proxy server port
- **username**: (Optional) Proxy authentication username
- **password**: (Optional) Proxy authentication password  
- **ip**: (Optional) The actual IP address for X-Forwarded-For header

### Example Configurations

**Bright Data:**
```bash
PROXY_LIST='brd.superproxy.com:22225:customer-USERNAME:BRIGHTDATA_PASSWORD:1.2.3.4'
```

**Oxylabs:**
```bash
PROXY_LIST='pr.oxylabs.io:7777:customer-USERNAME:OXYPASSWORD:5.6.7.8'
```

**Multiple Proxies:**
```bash
PROXY_LIST='proxy1.com:8080:user1:pass1:1.2.3.4,proxy2.com:8080:user2:pass2:5.6.7.8,proxy3.com:8080:user3:pass3:9.10.11.12'
```

## Step 3: Test Configuration

1. **Start the bot:**
   ```bash
   npm start
   ```

2. **Watch for proxy initialization:**
   ```
   ✅ Proxy manager initialized with 3 proxy(ies)
   ✅ Anti-Cloudflare mode enabled with 3 proxy(ies)
   ```

3. **Monitor proxy rotation:**
   ```
   🔄 Proxy rotated: 1.2.3.4 → 5.6.7.8
   ✅ Request successful via proxy: 5.6.7.8
   ```

## How It Works

### Proxy Rotation
- **Automatic rotation** every 15 minutes
- **No IP reuse** within 8 minutes of last use
- **X-Forwarded-For header** set to proxy IP to mimic real gateway

### Human-like Delays
- **10-25 seconds** random delay before every fetch (mimics human reading time)
- **2 seconds** jitter before page loads (mimics page load time)
- **20-40 seconds** delay after authentication (Cloudflare sniffs hardest during auth)

### Rate Limiting
- **Max 3 requests** per 60 seconds (global)
- **Automatic waiting** if limit exceeded
- **No burst-fire** ever

## Running Without Proxies

If you don't have proxies yet, the bot will still work with delays and rate limiting:

```bash
# Just don't set PROXY_LIST, or set:
ENABLE_ANTI_CLOUDFLARE=true
PROXY_LIST=''
```

The bot will log:
```
⚠️  Anti-Cloudflare mode enabled but no proxies configured. Running with delays only.
```

## Troubleshooting

### "Proxy connection failed"
- Check proxy credentials are correct
- Verify proxy server is accessible
- Test proxy manually: `curl --proxy http://user:pass@host:port https://api.ipify.org`

### "Rate limit reached"
- This is normal! The bot will automatically wait
- If you see this frequently, consider adding more proxies

### "Still getting blocked"
1. **Add more proxies** - More IPs = less detection
2. **Use residential IPs** - Not datacenter IPs
3. **Increase delays** - Edit `src/utils/humanDelays.ts` to increase delay ranges
4. **Check proxy quality** - Some proxy providers have better IPs than others

### Proxy Rotation Not Working
- Check logs for rotation messages: `🔄 Proxy rotated: ...`
- Verify proxies are in correct format
- Ensure at least 2 proxies are configured (rotation needs multiple IPs)

## Advanced Configuration

### Custom Delay Ranges

Edit `src/utils/humanDelays.ts`:

```typescript
// Increase fetch delay to 20-35 seconds
export const delayBeforeFetch = async (): Promise<void> => {
    const delayMs = randomDelay(20000, 35000); // Changed from 10000-25000
    // ...
};
```

### Custom Rate Limits

Edit `src/utils/rateLimiter.ts`:

```typescript
private readonly MAX_REQUESTS = 2; // Changed from 3
private readonly WINDOW_MS = 90 * 1000; // Changed from 60 seconds
```

### Custom Rotation Intervals

Edit `src/utils/proxyManager.ts`:

```typescript
private readonly ROTATION_INTERVAL_MS = 10 * 60 * 1000; // Changed from 15 minutes
private readonly REUSE_COOLDOWN_MS = 10 * 60 * 1000; // Changed from 8 minutes
```

## Next Steps

After configuring proxies:

1. **Test for 5 minutes** - Watch logs for Cloudflare errors
2. **If still blocked** - See "Still getting blocked" troubleshooting above
3. **If working** - Monitor for a few hours to ensure stability

## Cost Considerations

- **Residential proxies**: Typically $50-200/month for 1-10 IPs
- **Datacenter proxies**: Cheaper ($10-50/month) but more likely to be blocked
- **Free proxies**: Not recommended - usually already blocked

**Recommendation**: Start with 3-5 residential IPs. Add more if you still get blocked.

## Summary

✅ **Configured**: Add `PROXY_LIST` to `.env`  
✅ **Enabled**: Set `ENABLE_ANTI_CLOUDFLARE=true` (default)  
✅ **Test**: Run `npm start` and watch logs  
✅ **Monitor**: Check for proxy rotation and rate limiting messages  

The bot will automatically use proxies, delays, and rate limiting to avoid Cloudflare detection!
