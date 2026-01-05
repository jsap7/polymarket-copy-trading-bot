# 📋 Environment Variables Guide - For $90 Trading Budget

Complete explanation of all `.env` variables and recommended settings for trading with $90.

---

## 🔴 CRITICAL VARIABLES (Must Set Correctly)

### `USER_ADDRESSES`
**What it does:** List of trader wallet addresses to copy trades from  
**Format:** Comma-separated addresses or JSON array  
**Example:**
```bash
USER_ADDRESSES='0x6a72f61820b26b1fe4d956e17b6dc2a1ea3033ee, 0xdb27bf2ac5d428a9c63dbc914611036855a6c56e'
```
**For $90:** ✅ Keep your 3 traders (good diversification)

---

### `PROXY_WALLET`
**What it does:** Your Polygon wallet address that will execute trades  
**Format:** Ethereum address starting with `0x`  
**Example:** `PROXY_WALLET='0x99a5bF8005DD3B34Ca060DF4FDc1ADE5cCbDc4D9'`  
**For $90:** ✅ Already set correctly

---

### `PRIVATE_KEY`
**What it does:** Your wallet's private key (without `0x` prefix)  
**Format:** 64 hex characters  
**⚠️ SECURITY:** Never share or commit to git!  
**For $90:** ✅ Already set (keep it secret!)

---

### `MONGO_URI`
**What it does:** MongoDB connection string for storing trade history  
**Format:** `mongodb+srv://username:password@cluster.mongodb.net/database`  
**For $90:** ✅ Already configured

---

### `RPC_URL`
**What it does:** Polygon network RPC endpoint  
**Format:** `https://polygon-mainnet.infura.io/v3/YOUR_KEY`  
**For $90:** ✅ Already configured

---

## 🟡 TRADING STRATEGY (Most Important for $90!)

### `COPY_STRATEGY`
**What it does:** How the bot calculates your trade size  
**Options:**
- `PERCENTAGE` - Copy a % of trader's order (recommended for beginners)
- `FIXED` - Copy fixed $ amount per trade
- `ADAPTIVE` - Adjust % based on trade size (advanced)

**For $90:** 
```bash
COPY_STRATEGY='PERCENTAGE'
```
✅ **Recommended:** PERCENTAGE (simplest and safest)

---

### `COPY_SIZE`
**What it does:** Main trading parameter (meaning depends on strategy)
- **PERCENTAGE:** Percentage of trader's order (e.g., `10.0` = 10%)
- **FIXED:** Fixed dollar amount per trade (e.g., `50.0` = $50)
- **ADAPTIVE:** Base percentage for scaling

**For $90:**
```bash
COPY_SIZE=10.0
```
✅ **Recommended:** `10.0` (copy 10% of trader's position)

**Why 10%?**
- If trader has $10,000 and buys $1,000 → You buy $100 (10% of their trade)
- If trader has $1,000 and buys $100 → You buy $10 (10% of their trade)
- Keeps your trades proportional to your $90 budget

---

### `MAX_ORDER_SIZE_USD`
**What it does:** Maximum size for a single trade (safety limit)  
**Purpose:** Prevents oversized trades even if trader makes huge orders

**For $90:**
```bash
MAX_ORDER_SIZE_USD=20.0
```
✅ **Recommended:** `20.0` (max $20 per trade)

**Why $20?**
- Protects your $90 budget
- Allows 4-5 trades before running out
- Prevents one bad trade from wiping you out

---

### `MIN_ORDER_SIZE_USD`
**What it does:** Minimum trade size (Polymarket requirement)  
**For $90:**
```bash
MIN_ORDER_SIZE_USD=1.0
```
✅ **Keep at:** `1.0` (Polymarket minimum, don't change)

---

### `MAX_POSITION_SIZE_USD` (Optional but Recommended)
**What it does:** Maximum total position size per market  
**Purpose:** Prevents accumulating too much in one market

**For $90:**
```bash
MAX_POSITION_SIZE_USD=30.0
```
✅ **Recommended:** `30.0` (max $30 per market)

**Why $30?**
- Limits exposure to any single market
- Leaves $60 for other opportunities
- Diversifies risk across multiple markets

---

### `MAX_DAILY_VOLUME_USD` (Optional)
**What it does:** Maximum total trading volume per day  
**Purpose:** Prevents overtrading

**For $90:**
```bash
MAX_DAILY_VOLUME_USD=50.0
```
✅ **Recommended:** `50.0` (max $50 per day)

**Why $50?**
- Limits daily risk
- Leaves room for multiple days of trading
- Prevents exhausting your budget too quickly

---

## 🟢 ADVANCED FEATURES (Optional)

### `TRADE_MULTIPLIER`
**What it does:** Single multiplier applied to all trades  
**Example:** `2.0` = 2x more aggressive, `0.5` = more conservative

**For $90:**
```bash
TRADE_MULTIPLIER=1.0
```
✅ **Recommended:** `1.0` (no multiplier, keep it simple)

**Why 1.0?**
- With $90, you want to be conservative
- Multipliers increase risk
- Start simple, adjust later if needed

---

### `TIERED_MULTIPLIERS` (Advanced)
**What it does:** Different multipliers based on trader's order size  
**Format:** `"min-max:multiplier,min-max:multiplier"`

**For $90:** Leave unset (too complex for small budget)
```bash
# TIERED_MULTIPLIERS = ''
```

**If you want to use it:**
```bash
TIERED_MULTIPLIERS='1-10:2.0,10-50:1.0,50-200:0.5,200+:0.2'
```
This means:
- Small trades ($1-$10): 2x multiplier (capture opportunities)
- Medium ($10-$50): 1x (normal)
- Large ($50-$200): 0.5x (reduce risk)
- Very large ($200+): 0.2x (minimal exposure)

---

### `TRADE_AGGREGATION_ENABLED`
**What it does:** Combine multiple small trades into one larger trade  
**For $90:**
```bash
TRADE_AGGREGATION_ENABLED=false
```
✅ **Recommended:** `false` (keep it simple)

**Why false?**
- Adds complexity
- Delays execution
- With $90, you want immediate execution

---

## 🔵 BOT BEHAVIOR SETTINGS

### `FETCH_INTERVAL`
**What it does:** How often to check for new trades (in seconds)  
**For $90:**
```bash
FETCH_INTERVAL=1
```
✅ **Keep at:** `1` (check every second, fastest execution)

---

### `TOO_OLD_TIMESTAMP`
**What it does:** Ignore trades older than X hours  
**For $90:**
```bash
TOO_OLD_TIMESTAMP=1
```
✅ **Recommended:** `1` (only copy trades from last hour)

**Why 1 hour?**
- Markets move fast
- Old trades may have bad prices
- Keeps you copying fresh opportunities

---

### `RETRY_LIMIT`
**What it does:** Maximum retry attempts for failed orders  
**For $90:**
```bash
RETRY_LIMIT=3
```
✅ **Keep at:** `3` (good default)

---

### `REQUEST_TIMEOUT_MS`
**What it does:** Network request timeout in milliseconds  
**For $90:**
```bash
REQUEST_TIMEOUT_MS=10000
```
✅ **Keep at:** `10000` (10 seconds, good default)

---

### `NETWORK_RETRY_LIMIT`
**What it does:** Retry attempts for network errors  
**For $90:**
```bash
NETWORK_RETRY_LIMIT=3
```
✅ **Keep at:** `3` (good default)

---

## 🟣 POLYMARKET ENDPOINTS (Don't Change!)

### `CLOB_HTTP_URL`
**What it does:** Polymarket API endpoint  
**For $90:**
```bash
CLOB_HTTP_URL='https://clob.polymarket.com/'
```
✅ **Don't change** (official endpoint)

---

### `CLOB_WS_URL`
**What it does:** Polymarket WebSocket endpoint  
**For $90:**
```bash
CLOB_WS_URL='wss://ws-subscriptions-clob.polymarket.com/ws'
```
✅ **Don't change** (official endpoint)

---

### `USDC_CONTRACT_ADDRESS`
**What it does:** USDC contract address on Polygon  
**For $90:**
```bash
USDC_CONTRACT_ADDRESS='0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
```
✅ **Don't change** (official USDC.e contract)

---

## 📊 RECOMMENDED CONFIGURATION FOR $90

Here's your complete recommended `.env` setup:

```bash
# ==============================================================================
# TRADERS TO COPY
# ==============================================================================
USER_ADDRESSES='0x6a72f61820b26b1fe4d956e17b6dc2a1ea3033ee, 0xdb27bf2ac5d428a9c63dbc914611036855a6c56e, 0x204f72f35326db932158cba6adff0b9a1da95e14'

# ==============================================================================
# YOUR WALLET
# ==============================================================================
PROXY_WALLET='0x99a5bF8005DD3B34Ca060DF4FDc1ADE5cCbDc4D9'
PRIVATE_KEY='your_private_key_here'

# ==============================================================================
# TRADING STRATEGY (Optimized for $90)
# ==============================================================================
COPY_STRATEGY='PERCENTAGE'
COPY_SIZE=10.0
TRADE_MULTIPLIER=1.0

# ==============================================================================
# SAFETY LIMITS (Protect your $90!)
# ==============================================================================
MAX_ORDER_SIZE_USD=20.0      # Max $20 per trade
MIN_ORDER_SIZE_USD=1.0       # Polymarket minimum
MAX_POSITION_SIZE_USD=30.0   # Max $30 per market
MAX_DAILY_VOLUME_USD=50.0    # Max $50 per day

# ==============================================================================
# BOT BEHAVIOR
# ==============================================================================
FETCH_INTERVAL=1
TOO_OLD_TIMESTAMP=1
RETRY_LIMIT=3
REQUEST_TIMEOUT_MS=10000
NETWORK_RETRY_LIMIT=3

# ==============================================================================
# ADVANCED (Leave disabled for simplicity)
# ==============================================================================
TRADE_AGGREGATION_ENABLED=false
# TIERED_MULTIPLIERS=''  # Leave unset

# ==============================================================================
# DATABASE & NETWORK (Already configured)
# ==============================================================================
MONGO_URI='your_mongo_uri'
RPC_URL='your_rpc_url'
CLOB_HTTP_URL='https://clob.polymarket.com/'
CLOB_WS_URL='wss://ws-subscriptions-clob.polymarket.com/ws'
USDC_CONTRACT_ADDRESS='0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
```

---

## 🎯 QUICK SUMMARY FOR $90

**Key Changes:**
1. ✅ `COPY_SIZE=10.0` (copy 10% of trader's trades)
2. ✅ `MAX_ORDER_SIZE_USD=20.0` (max $20 per trade)
3. ✅ `MAX_POSITION_SIZE_USD=30.0` (max $30 per market)
4. ✅ `MAX_DAILY_VOLUME_USD=50.0` (max $50 per day)
5. ✅ `TRADE_MULTIPLIER=1.0` (no multiplier, conservative)

**What This Means:**
- If trader buys $100 → You buy $10 (10%)
- If trader buys $500 → You buy $20 (capped at max)
- Max $30 per market (diversification)
- Max $50 per day (risk control)
- Your $90 will last longer and be safer!

---

## ⚠️ IMPORTANT NOTES

1. **Start Conservative:** With $90, it's better to be safe than sorry
2. **Monitor Daily:** Check your positions and P&L regularly
3. **Adjust Gradually:** If things go well, you can increase limits later
4. **Never Risk More:** Only trade what you can afford to lose

---

## 📈 SCALING UP LATER

If you add more funds later, here are scaling recommendations:

**$200 budget:**
- `MAX_ORDER_SIZE_USD=40.0`
- `MAX_POSITION_SIZE_USD=60.0`
- `MAX_DAILY_VOLUME_USD=100.0`

**$500 budget:**
- `MAX_ORDER_SIZE_USD=100.0`
- `MAX_POSITION_SIZE_USD=150.0`
- `MAX_DAILY_VOLUME_USD=250.0`

**$1000+ budget:**
- Consider `ADAPTIVE` strategy
- Use `TIERED_MULTIPLIERS` for better control
- Increase all limits proportionally
