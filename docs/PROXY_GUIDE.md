# 🔐 Proxy Guide - What Are Proxies and How to Get Them

## What is a Proxy?

A **proxy** is like a middleman between your computer and the internet. Instead of connecting directly to a website:

**Without Proxy:**
```
Your Computer → Polymarket API
```

**With Proxy:**
```
Your Computer → Proxy Server → Polymarket API
```

The website sees the **proxy's IP address**, not yours. This helps avoid Cloudflare blocking because:

1. **Different IPs** - Each proxy has a different IP address
2. **Residential IPs** - Look like real home internet connections (not datacenter servers)
3. **Rotation** - Switching IPs makes you look like different users

## Why Do You Need Proxies?

Cloudflare blocks your bot because it detects:
- **Same IP** making many requests
- **Automated patterns** (requests every few seconds)
- **Datacenter IPs** (obviously servers, not real users)

Proxies solve this by:
- ✅ **Rotating IPs** - Different IP every 15 minutes
- ✅ **Residential IPs** - Look like real home internet
- ✅ **Distributed requests** - Spread across multiple IPs

## Where to Get Proxies

### Option 1: Free Proxies (Quick Test, Not Recommended)

**Free proxy lists** (often unreliable, already blocked):
- https://free-proxy-list.net
- https://www.proxy-list.download
- https://www.proxyscrape.com

**⚠️ Warning**: Most free proxies are:
- Already blocked by Cloudflare
- Slow and unreliable
- May steal your data
- Not residential IPs

**Only use for quick testing** - don't rely on them!

### Option 2: Paid Proxy Services (Recommended)

These are **reliable, fast, and use residential IPs**:

#### 1. **Bright Data** (Best Quality)
- **Website**: https://brightdata.com
- **Price**: ~$500/month for residential IPs
- **Quality**: ⭐⭐⭐⭐⭐ (Best)
- **Best for**: Serious trading bots

#### 2. **Oxylabs** (Popular)
- **Website**: https://oxylabs.io
- **Price**: ~$300/month for residential IPs
- **Quality**: ⭐⭐⭐⭐
- **Best for**: Professional use

#### 3. **Smartproxy** (Affordable)
- **Website**: https://smartproxy.com
- **Price**: ~$75/month for residential IPs
- **Quality**: ⭐⭐⭐⭐
- **Best for**: Budget-conscious users

#### 4. **Proxy-Cheap** (Cheapest)
- **Website**: https://proxy-cheap.com
- **Price**: ~$50/month for residential IPs
- **Quality**: ⭐⭐⭐
- **Best for**: Testing and small budgets

### Option 3: VPN Services (Alternative)

Some VPNs offer **dedicated IPs**:

- **NordVPN**: https://nordvpn.com (dedicated IP option)
- **ExpressVPN**: https://expressvpn.com
- **Surfshark**: https://surfshark.com

**Note**: VPN IPs are usually datacenter IPs (not residential), so they may still get blocked.

## How to Get Started (Quick Test)

### Step 1: Try Without Proxies First

The bot works **without proxies** - it just uses delays and rate limiting:

```bash
# In your .env file:
ENABLE_ANTI_CLOUDFLARE=true
PROXY_LIST=''
```

**Test this first** - it might be enough! If you still get blocked, then get proxies.

### Step 2: Get a Free Proxy (Quick Test)

1. Go to https://free-proxy-list.net
2. Find a proxy (look for "HTTP" type, "High anonymity")
3. Copy the IP and port (e.g., `123.45.67.89:8080`)

**Add to `.env`:**
```bash
PROXY_LIST='123.45.67.89:8080'
```

**Test for 5 minutes** - if it works, great! If not, you need paid proxies.

### Step 3: Get Paid Proxies (If Needed)

1. **Sign up** for a proxy service (Smartproxy is cheapest)
2. **Get your credentials**:
   - Host: `gate.smartproxy.com`
   - Port: `10000`
   - Username: `your-username`
   - Password: `your-password`
   - IP: (they'll provide this, or leave blank)

3. **Add to `.env`:**
```bash
PROXY_LIST='gate.smartproxy.com:10000:your-username:your-password'
```

## Proxy Format Explained

The bot expects proxies in this format:

```
host:port:username:password:ip
```

**Examples:**

**Simple (no auth):**
```bash
PROXY_LIST='123.45.67.89:8080'
```

**With username/password:**
```bash
PROXY_LIST='proxy.example.com:8080:myuser:mypass'
```

**With IP (for X-Forwarded-For header):**
```bash
PROXY_LIST='proxy.example.com:8080:myuser:mypass:1.2.3.4'
```

**Multiple proxies (comma-separated):**
```bash
PROXY_LIST='proxy1.com:8080:user1:pass1:1.2.3.4,proxy2.com:8080:user2:pass2:5.6.7.8'
```

## Specific Provider Examples

### Bright Data
```bash
PROXY_LIST='brd.superproxy.com:22225:customer-USERNAME:BRIGHTDATA_PASSWORD:1.2.3.4'
```

### Oxylabs
```bash
PROXY_LIST='pr.oxylabs.io:7777:customer-USERNAME:OXYPASSWORD:5.6.7.8'
```

### Smartproxy
```bash
PROXY_LIST='gate.smartproxy.com:10000:username:password'
```

## Testing Your Proxy

Before adding to the bot, test your proxy manually:

```bash
# Test proxy connection
curl --proxy http://username:password@host:port https://api.ipify.org

# Should return the proxy's IP address
```

## Cost Comparison

| Service | Price/Month | Quality | Best For |
|---------|------------|---------|----------|
| Free Proxies | $0 | ⭐ | Testing only |
| Proxy-Cheap | $50 | ⭐⭐⭐ | Budget users |
| Smartproxy | $75 | ⭐⭐⭐⭐ | Most users |
| Oxylabs | $300 | ⭐⭐⭐⭐ | Professional |
| Bright Data | $500 | ⭐⭐⭐⭐⭐ | Enterprise |

## Recommendation

**Start here:**

1. ✅ **Test without proxies** first (delays + rate limiting)
2. ✅ **If blocked**: Try 1-2 free proxies (quick test)
3. ✅ **If still blocked**: Get Smartproxy ($75/month) - best value
4. ✅ **If serious**: Get Bright Data ($500/month) - best quality

## Quick Start (No Proxies)

You can start testing **right now** without proxies:

```bash
# In .env:
ENABLE_ANTI_CLOUDFLARE=true
PROXY_LIST=''
```

The bot will use:
- ✅ Human-like delays (10-25 seconds)
- ✅ Rate limiting (max 3 requests/minute)
- ✅ Smart headers

**This might be enough!** Test for 5 minutes and see if you still get blocked.

## Summary

- **What**: Proxies hide your IP address
- **Why**: Avoid Cloudflare blocking
- **Where**: Free (testing) or Paid (production)
- **Cost**: $0 (free) to $500/month (premium)
- **Start**: Test without proxies first!

**Next Step**: Try running the bot without proxies first. If you get blocked, then get paid residential proxies.
