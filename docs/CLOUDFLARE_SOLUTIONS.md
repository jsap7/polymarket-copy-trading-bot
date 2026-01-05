# 🚨 Cloudflare Blocking - Complete Solutions Guide

## The Problem

Your IP address (`2601:14d:5284:8300:21b6:265f:7dc3:955e`) has been **completely blocked** by Cloudflare. This is different from temporary rate limiting - your IP is on Cloudflare's blacklist.

## Why This Happens

Cloudflare blocks IPs when they detect:
- Automated/bot-like behavior patterns
- High request frequency
- Suspicious request signatures
- IPv6 addresses (which you're using) are sometimes more likely to trigger blocks

## ✅ What the Bot Now Does

The bot has been updated with:

1. **Automatic Pause Mode**: After 3 consecutive Cloudflare errors, the bot pauses for 30 minutes
2. **Better Detection**: Detects Cloudflare HTML responses, not just status codes
3. **Longer Delays**: 30s → 60s → 120s between retries
4. **Circuit Breaker**: Stops trying to place orders when blocked

## 🔧 Solutions (Try in Order)

### Solution 1: Wait It Out (Recommended First Step)

**Cloudflare blocks are usually temporary (15-60 minutes).**

1. Stop the bot (Ctrl+C)
2. Wait **30-60 minutes**
3. Restart: `npm start`

The bot will automatically pause if it detects Cloudflare blocking again.

### Solution 2: Use a Different Network

**Your current IP is blacklisted. Use a different one:**

1. **Mobile Hotspot**: Connect your computer to your phone's hotspot
2. **Different WiFi**: Use a different network (coffee shop, friend's house)
3. **VPN**: Use a VPN service with a different IP
   - Popular options: NordVPN, ExpressVPN, ProtonVPN
   - **Important**: Use a residential IP, not a datacenter IP

### Solution 3: Disable IPv6 (If Possible)

Your IP is IPv6, which can trigger Cloudflare more easily:

**On macOS:**
```bash
# Disable IPv6 (requires admin)
networksetup -setv6off Wi-Fi
# Or disable for Ethernet
networksetup -setv6off Ethernet
```

**To re-enable later:**
```bash
networksetup -setv6automatic Wi-Fi
```

### Solution 4: Contact Polymarket Support

If blocking persists:

1. Email: support@polymarket.com
2. Subject: "IP Address Whitelist Request for Trading Bot"
3. Include:
   - Your IP address: `2601:14d:5284:8300:21b6:265f:7dc3:955e`
   - Your wallet address: `0x99a5bF8005DD3B34Ca060DF4FDc1ADE5cCbDc4D9`
   - Explain you're running a copy trading bot
   - Mention Cloudflare Ray IDs from error messages

### Solution 5: Use a Proxy/VPS

Run the bot from a different IP:

1. **VPS**: Rent a VPS (DigitalOcean, AWS, etc.) and run the bot there
2. **Residential Proxy**: Use a residential proxy service
3. **Cloud Instance**: Run on AWS/GCP with a different IP

## 📊 Understanding the Bot's Behavior

### When Cloudflare is Detected

```
⚠️  Cloudflare blocking detected (403 Forbidden)
This usually resolves after a few minutes. Retry 1/3...
Waiting 30s before retry...
```

### After 3 Consecutive Errors

```
🚨 PAUSE MODE ACTIVATED: Bot paused for 30 minutes due to Cloudflare blocking
⏸️  Will resume at 3:45 PM
💡 To resume earlier, restart the bot: npm start
```

### While Paused

The bot will show:
```
⏸️  PAUSED: Cloudflare blocking (25 min remaining)
```

**The bot will NOT try to place orders while paused** - it will just monitor for new trades and wait.

## 🎯 Best Practices Going Forward

1. **Start Slow**: When restarting after a block, increase `FETCH_INTERVAL` to 10-15 seconds
2. **Monitor Logs**: Watch for Cloudflare errors and pause early
3. **Use Different IP**: Consider using a VPN or different network
4. **Don't Restart Immediately**: Wait at least 30 minutes after a block before restarting

## ⚙️ Configuration Recommendations

After resolving Cloudflare blocking, update your `.env`:

```bash
# Increase fetch interval to reduce request rate
FETCH_INTERVAL=10  # Check for trades every 10 seconds (was 3)

# This gives Cloudflare less reason to block you
```

## 🆘 Emergency: If Nothing Works

If Cloudflare blocking persists after trying all solutions:

1. **Stop the bot completely**
2. **Wait 24 hours** - Cloudflare blocks often expire after a day
3. **Use a completely different network** (different ISP, VPN, mobile hotspot)
4. **Contact Polymarket support** - they may need to whitelist your IP

## 📝 Summary

**The bot now automatically pauses when Cloudflare blocking is detected.** 

- ✅ Detects Cloudflare errors properly
- ✅ Pauses after 3 consecutive errors
- ✅ Shows clear pause status
- ✅ Won't waste retries while blocked

**Your action:** Wait 30-60 minutes, then restart. If blocking continues, use a different network/IP address.
