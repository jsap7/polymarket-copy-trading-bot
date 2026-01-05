# 🔒 Cloudflare Blocking Troubleshooting

## Problem

The bot may encounter Cloudflare 403 Forbidden errors when placing orders:

```
[CLOB Client] request error {"status":403,"statusText":"Forbidden"}
```

This happens when Cloudflare's security system detects automated requests and temporarily blocks them.

---

## ✅ What We've Done

### 1. **Improved Error Detection**
The bot now specifically detects Cloudflare blocking errors and handles them gracefully.

### 2. **Exponential Backoff with Jitter**
When Cloudflare blocking is detected, the bot will:
- Wait 10-12 seconds before first retry (with random jitter)
- Wait 20-24 seconds before second retry  
- Wait 40-48 seconds before third retry
- Wait 120-150 seconds if max retries reached

The random jitter makes request patterns less predictable, helping avoid detection.

### 3. **Comprehensive Rate Limiting**
Multiple layers of delays to reduce request frequency:
- **1.5-2.5 second delay** between fetching order book and posting orders
- **1-1.5 second delay** after successful orders (before next order)
- **1-1.5 second delay** before retrying failed orders
- **2-3 second delay** between processing multiple trades

These delays help space out requests and reduce Cloudflare detection.

### 4. **Better Logging**
Clear warnings when Cloudflare blocking occurs, so you know what's happening.

---

## 🔧 What You Can Do

### Option 1: Wait It Out (Recommended)
Cloudflare blocks are usually temporary (5-15 minutes). The bot will automatically retry with delays.

**Just let it run** - the bot will handle retries automatically.

### Option 2: Reduce Request Frequency

If blocking happens frequently, increase `FETCH_INTERVAL` in your `.env`:

```bash
# Default: 1 second (very fast)
FETCH_INTERVAL=1

# Try: 2-3 seconds (still fast, less aggressive)
FETCH_INTERVAL=2
```

This reduces how often the bot checks for new trades, which reduces API requests.

### Option 3: Restart After a Few Minutes

If blocking persists:
1. Stop the bot (Ctrl+C)
2. Wait 5-10 minutes
3. Restart: `npm start`

### Option 4: Use a Different Network/VPN

Sometimes Cloudflare blocks are IP-based. If you're on a shared network or VPN:
- Try a different network
- Use a different VPN server
- Use your home network instead of public WiFi

---

## 📊 Monitoring Cloudflare Issues

### Check Logs for Cloudflare Errors

```bash
# See Cloudflare blocking events
grep -i "cloudflare\|403\|blocked" logs/*.log

# Count how many times it happened today
grep -i "cloudflare\|403" logs/bot-$(date +%Y-%m-%d).log | wc -l
```

### What Success Looks Like

After Cloudflare blocking, you should see:

```
⚠️  Cloudflare blocking detected (403 Forbidden)
This usually resolves after a few minutes. The bot will retry with delays.
Waiting 5s before retry...
```

Then the bot will retry automatically.

---

## 🚨 When to Worry

**Don't worry if:**
- Cloudflare errors happen occasionally (1-2 times per hour)
- Errors resolve after retries
- Bot continues working after blocking

**Do worry if:**
- Cloudflare errors happen constantly (every request)
- Bot never successfully places orders
- Errors persist for hours

If this happens:
1. Check your network connection
2. Try a different network/VPN
3. Increase `FETCH_INTERVAL` to 5+ seconds
4. Contact Polymarket support if issue persists

---

## 💡 Best Practices

1. **Don't run multiple bot instances** - This increases request rate and triggers Cloudflare
2. **Use reasonable `FETCH_INTERVAL`** - 1-3 seconds is fine, avoid < 0.5 seconds
3. **Monitor logs regularly** - Check for patterns in blocking
4. **Be patient** - Cloudflare blocks are temporary

---

## 🔍 Technical Details

### Why Cloudflare Blocks

Cloudflare uses various signals to detect bots:
- Request frequency
- User-Agent strings
- IP reputation
- Request patterns
- Browser fingerprinting

The `@polymarket/clob-client` library makes API requests that can trigger these protections.

### What the Bot Does

1. **Detects 403 errors** - Checks response status and error messages
2. **Applies backoff** - Waits progressively longer between retries
3. **Logs clearly** - Shows what's happening so you're informed
4. **Continues running** - Doesn't crash, just retries

---

## 📝 Summary

**The bot now handles Cloudflare blocking automatically.** 

- ✅ Detects blocking errors
- ✅ Retries with exponential backoff
- ✅ Logs clearly what's happening
- ✅ Continues running (doesn't crash)

**Your action:** Usually none needed - just let it run. If blocking is frequent, increase `FETCH_INTERVAL` in `.env`.
