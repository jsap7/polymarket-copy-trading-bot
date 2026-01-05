# 🚀 Anti-Cloudflare Quick Start

## What Was Implemented

✅ **Step 1 & 2 Complete**: Residential Proxy Rotation + Human-like Delays

### Features Added:

1. **Proxy Rotation System** (`src/utils/proxyManager.ts`)
   - Rotates proxies every 15 minutes max
   - Never reuses IP within 8 minutes
   - Sets X-Forwarded-For header to mimic real gateways

2. **Human-like Delays** (`src/utils/humanDelays.ts`)
   - 10-25 second random delay before every fetch
   - 2-second jitter before page loads
   - 20-40 second delay after auth calls (when CF sniffs hardest)

3. **Rate Limiting** (`src/utils/rateLimiter.ts`)
   - Max 3 requests per 60 seconds (global semaphore)
   - Automatic waiting if limit exceeded
   - No burst-fire ever

4. **Integrated into Core Functions**
   - `fetchData.ts` - All API calls now use proxies, delays, and rate limiting
   - `createClobClient.ts` - Auth calls have longer delays
   - `index.ts` - Proxy manager initialized on startup

## Configuration

Add to your `.env` file:

```bash
# Proxy Configuration (comma-separated)
# Format: host:port:username:password:ip
PROXY_LIST='proxy1.com:8080:user1:pass1:1.2.3.4,proxy2.com:8080:user2:pass2:5.6.7.8'

# Enable anti-Cloudflare (default: true)
ENABLE_ANTI_CLOUDFLARE=true
```

**Without proxies** (still works with delays and rate limiting):
```bash
ENABLE_ANTI_CLOUDFLARE=true
PROXY_LIST=''
```

## Testing

1. **Build the bot:**
   ```bash
   npm run build
   ```

2. **Start the bot:**
   ```bash
   npm start
   ```

3. **Watch for:**
   - `✅ Proxy manager initialized with X proxy(ies)` (if proxies configured)
   - `✅ Anti-Cloudflare mode enabled`
   - `🔄 Proxy rotated: ...` (every 15 minutes)
   - `⏳ Rate limit reached` (if hitting limits)
   - `⏳ Human delay: Xs before fetch...` (occasional logs)

## Next Steps (If Still Blocked)

If you're still getting Cloudflare blocks after 5 minutes:

1. **Add more proxies** - More IPs = less detection
2. **Use residential IPs** - Not datacenter IPs
3. **Check proxy quality** - Some providers have better IPs

## Future Enhancements (Steps 3-5)

The following are **not yet implemented** but can be added if needed:

- **Step 3**: Steal Session Cookies (export from browser, refresh every 6 hours)
- **Step 4**: Switch to GraphQL (use same endpoint as frontend)
- **Step 5**: Headless Playwright Layer (last resort with stealth scripts)

**Start with Steps 1 & 2** (already done). Test for 5 minutes. If still blocked, we can add Steps 3-5.

## Files Changed

- ✅ `src/utils/proxyManager.ts` - NEW: Proxy rotation system
- ✅ `src/utils/rateLimiter.ts` - NEW: Rate limiting
- ✅ `src/utils/humanDelays.ts` - NEW: Human-like delays
- ✅ `src/utils/fetchData.ts` - UPDATED: Uses proxies, delays, rate limiting
- ✅ `src/utils/createClobClient.ts` - UPDATED: Auth delays
- ✅ `src/config/env.ts` - UPDATED: Proxy configuration parsing
- ✅ `src/index.ts` - UPDATED: Proxy manager initialization

## Summary

✅ **Proxy rotation** - Every 15 min, no reuse within 8 min  
✅ **Human delays** - 10-25s before fetch, 20-40s after auth  
✅ **Rate limiting** - Max 3 requests per 60 seconds  
✅ **Ready to test** - Configure proxies and run!

See `docs/ANTI_CLOUDFLARE_SETUP.md` for detailed configuration guide.
