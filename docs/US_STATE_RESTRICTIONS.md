# 🇺🇸 US Restrictions - The Real Problem

## The Issue

You're in the US and getting **"view only" mode** - According to Polymarket's official documentation, **the entire United States is blocked** (listed in their blocked countries).

However, since you can see "view only" mode, there might be:
1. **State-level restrictions** (some states more restricted than others)
2. **Partial access** (view but can't trade)
3. **Outdated documentation** (US might have been recently unblocked)

## What "View Only" Means

- ✅ You can **view** markets and prices
- ❌ You **cannot trade** or place orders
- ❌ API access is **blocked** (403 Forbidden)

This is why your bot gets blocked - Polymarket detects your state and restricts API access.

## The Reality

According to Polymarket's official geoblocking documentation:
- ❌ **United States (US) is listed as a blocked country**
- ❌ **All 50 states** are technically blocked
- ✅ But you can see "view only" mode, which suggests **partial access**

This means:
- You can **view** markets (read-only)
- You **cannot trade** (API blocked)
- Your **bot cannot place orders** (403 Forbidden)

## Why "View Only" Exists

Some countries have **"close-only"** status where users can:
- ✅ Close existing positions
- ❌ Open new positions

The US might have a similar **"view-only"** status.

## Solutions

### Option 1: Use VPN to Non-US Country (Recommended)

Since the **entire US is blocked**, you need a VPN to a **non-blocked country**:

**Allowed Countries** (not in blocked list):
- 🇨🇦 **Canada** (except Ontario)
- 🇲🇽 **Mexico**
- 🇧🇷 **Brazil**
- 🇦🇷 **Argentina**
- 🇨🇱 **Chile**
- 🇨🇴 **Colombia**
- 🇳🇱 **Netherlands**
- 🇪🇸 **Spain**
- 🇵🇹 **Portugal**
- 🇨🇭 **Switzerland**
- 🇸🇪 **Sweden**
- 🇳🇴 **Norway**
- 🇩🇰 **Denmark**
- 🇫🇮 **Finland**
- And many others...

**Blocked Countries** (avoid these):
- ❌ US, UK, Australia, Germany, France, Italy, Poland, Singapore, Thailand, Taiwan, and 25+ others

1. **Connect VPN to allowed country** (Canada, Mexico, Brazil, etc.)
2. **Restart bot** - should work!

**Important**: Using VPN to bypass geoblocking may violate ToS, but it's the only way if you're in a blocked country.

### Option 2: Check If You Can Trade Manually

1. **Visit Polymarket** without VPN
2. **Try to place a trade** manually
3. **If you get "restricted" or "view only"** → US is blocked for trading
4. **If you CAN trade** → Documentation might be outdated, try VPN to different US state

### Option 3: Contact Polymarket Support

Since the documentation says US is blocked but you can see "view only":
- Contact Polymarket support: https://polymarket.com/support
- Ask about US access status
- They might have updated policies not reflected in docs

## Why Your Bot Was Blocked

1. ✅ **Your real IP** → Shows your restricted state → API blocked
2. ✅ **Your VPN IP** → Might be from restricted state → API blocked
3. ✅ **Solution** → VPN to **allowed US state**

## Quick Test

1. **Disconnect VPN**
2. **Visit**: https://polymarket.com
3. **Try to place a trade** manually
4. **If restricted** → Your state is blocked
5. **Connect VPN to allowed state** (CA, FL, NV)
6. **Restart bot**

## Common Allowed States

These states typically allow prediction markets:
- ✅ **California**
- ✅ **Florida** 
- ✅ **Nevada**
- ✅ **Washington**
- ✅ **Colorado**
- ✅ **Many others**

## Common Restricted States

These states often restrict prediction markets:
- ❌ **New York**
- ❌ **Texas**
- ❌ **Hawaii**
- ❌ **Others** (check current list)

## Bot Configuration

Once you're on VPN from an allowed state:

1. **Verify location:**
   ```bash
   curl -s https://ipapi.co/json/ | grep -E '"region"|"city"'
   ```

2. **Should show allowed state** (CA, FL, NV, etc.)

3. **Restart bot:**
   ```bash
   npm start
   ```

## Summary

- 🇺🇸 **You're in US** → **Entire US is blocked** according to docs
- 🔒 **"View only" mode** → Can view but can't trade
- ❌ **Bot cannot work** from US IP (API blocked)
- ✅ **Solution** → VPN to **non-blocked country** (Canada, Mexico, Brazil, etc.)
- 🤖 **Bot will work** once VPN shows allowed country

**The geoblocking is country-level, not state-level.** Use a VPN server in an **allowed country** (not US)!
