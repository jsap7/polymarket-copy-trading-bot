# 🔐 VPN Setup Guide for Trading Bot

## ✅ Your VPN is Connected!

Your IP has changed from:
- **Old**: `2601:14d:5284:8300:21b6:265f:7dc3:955e` (IPv6 - blocked)
- **New**: `136.144.35.163` (IPv4 - active)

## 🚀 Next Steps

### 1. Update Configuration (Recommended)

Before restarting, increase `FETCH_INTERVAL` to reduce request frequency:

```bash
# Edit your .env file
nano .env

# Change FETCH_INTERVAL to:
FETCH_INTERVAL=10  # Check for trades every 10 seconds (safer)
```

This reduces how often the bot makes API requests, making it less likely to trigger Cloudflare.

### 2. Restart the Bot

```bash
npm start
```

The bot will now use your new VPN IP address.

### 3. Monitor for Cloudflare Errors

Watch the logs for any Cloudflare blocking. If you see:
```
⚠️  Cloudflare blocking detected (403 Forbidden)
```

The bot will automatically pause after 3 consecutive errors.

## 💡 VPN Best Practices

### Choose the Right Server

- ✅ **Residential IPs**: Use VPN servers that provide residential IPs (not datacenter IPs)
- ✅ **Stable Connection**: Choose a server close to you for lower latency
- ✅ **Dedicated IP**: Some VPNs offer dedicated IPs (less likely to be shared/blocked)

### Avoid These

- ❌ **Free VPNs**: Often have shared IPs that are already blocked
- ❌ **Datacenter IPs**: More likely to trigger Cloudflare
- ❌ **Frequently Changing Servers**: Stick with one server to build IP reputation

### If Cloudflare Blocks Again

1. **Switch VPN Server**: Try a different VPN server location
2. **Wait 15-30 minutes**: Cloudflare blocks are often temporary
3. **Use Residential Proxy**: Consider a dedicated residential proxy service
4. **Contact Polymarket**: They may need to whitelist your IP

## 📊 Monitoring

After restarting, watch for:

✅ **Good Signs**:
- Orders executing successfully
- No Cloudflare errors
- Normal trade execution

⚠️ **Warning Signs**:
- Cloudflare 403 errors
- "PAUSE MODE ACTIVATED" messages
- Repeated order failures

## 🔄 If You Need to Change VPN Servers

1. Disconnect from current VPN server
2. Connect to a different VPN server
3. Verify new IP: `curl https://api.ipify.org`
4. Restart bot: `npm start`

## 📝 Summary

- ✅ VPN connected: `136.144.35.163`
- ✅ IPv4 address (better than IPv6)
- ⏭️  Next: Restart bot with `npm start`
- 💡 Tip: Increase `FETCH_INTERVAL` to 10 seconds for safety

The bot's automatic pause mode will protect you if Cloudflare blocks again!
