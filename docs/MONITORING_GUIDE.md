# 📊 Bot Monitoring Guide

This guide explains how to monitor your Polymarket copy trading bot's activity, performance, and health.

---

## 🚀 Quick Monitoring Commands

### 1. **Check Bot Status** (Real-time)
```bash
npm run health-check
```
Shows:
- ✅ USDC balance
- ✅ MongoDB connection status
- ✅ RPC endpoint connectivity
- ✅ Current positions count

### 2. **View Your Trading Stats**
```bash
npm run check-stats
```
Shows:
- 💰 USDC balance
- 📊 Open positions with P&L
- 📜 Trade history (last 20 trades)
- 📈 Top-5 positions by profit

### 3. **Check Recent Activity**
```bash
npm run check-activity
```
Shows recent trades and activity patterns.

### 4. **Debug Balance Issues**
```bash
npm run debug-balance
```
Directly queries your wallet's USDC balance on Polygon.

---

## 📝 Log Files

The bot automatically logs all activity to files in the `logs/` directory:

### Log File Location
```
logs/bot-YYYY-MM-DD.log
```

### View Logs
```bash
# View today's log
tail -f logs/bot-$(date +%Y-%m-%d).log

# View all logs
tail -f logs/*.log

# Search for errors
grep ERROR logs/*.log

# Search for successful orders
grep "ORDER SUCCESS" logs/*.log
```

### Log Format
Each log entry includes:
- **Timestamp**: ISO format timestamp
- **Level**: INFO, SUCCESS, WARNING, ERROR, TRADE, ORDER SUCCESS/FAILED
- **Message**: Detailed information about the event

---

## 🖥️ Console Output

When running the bot (`npm start` or `npm run dev`), you'll see:

### Startup Screen
- ASCII art logo
- List of traders being monitored
- Your wallet address (masked for security)
- Database connection status
- CLOB client initialization
- Health check results

### During Operation

**Waiting for Trades:**
```
[2:35:54 PM] ⏳ Waiting for trades from 3 trader(s)...
```

**When a Trade is Detected:**
```
──────────────────────────────────────────────────────────────
📊 NEW TRADE DETECTED
Trader: 0x7c3d...6b
Action: BUY
Side:   BUY
Amount: $50.00
Price:  0.65
Market: https://polymarket.com/event/example-market
TX:     https://polygonscan.com/tx/0x...
──────────────────────────────────────────────────────────────
```

**Order Execution:**
```
✓ Order executed: Bought $10.00 at $0.65 (15.38 tokens)
```

**Errors:**
```
✗ Order failed: [error message]
⚠ Warning: [warning message]
```

---

## 📊 Monitoring Dashboard (Manual)

### Check Your Positions
```bash
npm run check-stats
```

**Output includes:**
- 💰 Available cash
- 📊 Total portfolio value
- 📈 Open positions count
- 💵 Current value vs initial value
- 📈 Profit/Loss percentage
- 🏆 Top-5 positions by profit

### Monitor Balance Changes
```bash
# Run periodically to track balance
watch -n 30 "npm run debug-balance"
```

### Check Allowance Status
```bash
npm run check-allowance
```
Ensures Polymarket has permission to spend your USDC.

---

## 🔍 Understanding Bot Activity

### What the Bot Does

1. **Monitors Traders** (every `FETCH_INTERVAL` seconds)
   - Fetches new trades from Polymarket API
   - Stores trades in MongoDB
   - Updates position information

2. **Executes Trades** (when new trades detected)
   - Calculates order size based on your strategy
   - Checks balance and limits
   - Places orders on Polymarket
   - Retries on failure (up to `RETRY_LIMIT` times)

3. **Logs Everything**
   - All trades detected
   - All orders placed
   - All errors and warnings
   - Balance changes

### Key Metrics to Watch

1. **Balance**: Should decrease when buying, increase when selling
2. **Position Count**: Should match your traders' positions
3. **Order Success Rate**: Check logs for failed orders
4. **Error Frequency**: Monitor for repeated errors

---

## ⚠️ Common Issues & Monitoring

### Cloudflare Blocking (403 Forbidden)

**Symptoms:**
```
[CLOB Client] request error {"status":403,"statusText":"Forbidden"}
```

**What to do:**
- The bot will retry automatically
- If persistent, wait 5-10 minutes and restart
- Check if you're making too many requests too quickly
- Consider reducing `FETCH_INTERVAL` if set very low (< 1 second)

### Insufficient Balance

**Symptoms:**
```
⚠ Order rejected: Insufficient balance or allowance
```

**What to do:**
1. Check balance: `npm run debug-balance`
2. Check allowance: `npm run check-allowance`
3. Top up USDC if needed
4. Set allowance if missing: `npm run set-token-allowance`

### No Trades Being Copied

**Possible reasons:**
- Traders haven't made new trades
- Trades are below minimum order size
- Balance too low
- Strategy limits preventing execution

**Check:**
```bash
# See if trades are being detected
grep "NEW TRADE DETECTED" logs/*.log

# See why trades aren't executing
grep "Cannot execute" logs/*.log
```

---

## 📈 Performance Monitoring

### Track Profitability

1. **Initial Investment**: Note your starting balance
2. **Current Portfolio**: Run `npm run check-stats` regularly
3. **Calculate ROI**: (Current Value - Initial Investment) / Initial Investment

### Monitor Trade Execution

```bash
# Count successful orders today
grep "ORDER SUCCESS" logs/bot-$(date +%Y-%m-%d).log | wc -l

# Count failed orders today
grep "ORDER FAILED" logs/bot-$(date +%Y-%m-%d).log | wc -l

# See all trades copied today
grep "TRADE:" logs/bot-$(date +%Y-%m-%d).log
```

---

## 🔔 Setting Up Alerts (Optional)

### Email Alerts (Manual Setup)

You can set up a cron job to check for errors:

```bash
# Add to crontab (crontab -e)
# Check for errors every hour
0 * * * * cd /path/to/bot && grep -q "ERROR" logs/bot-$(date +\%Y-\%m-\%d).log && echo "Bot errors detected" | mail -s "Bot Alert" your@email.com
```

### Balance Alerts

```bash
# Alert if balance drops below threshold
0 * * * * cd /path/to/bot && npm run debug-balance | awk '{if ($1 < 10) print "Low balance!"}' | mail -s "Low Balance Alert" your@email.com
```

---

## 🛠️ Advanced Monitoring

### Database Queries

Connect to MongoDB to query trade data:

```javascript
// Connect to MongoDB
mongosh "your-mongodb-uri"

// Count trades copied today
db.user_activity_0x...countDocuments({
  bot: true,
  botExcutedTime: { $exists: true },
  timestamp: { $gte: Math.floor(Date.now() / 1000) - 86400 }
})

// Find failed orders
db.user_activity_0x...find({
  bot: true,
  botExcutedTime: { $gte: 3 }
})
```

### API Monitoring

Check Polymarket API directly:

```bash
# Your positions
curl "https://data-api.polymarket.com/positions?user=YOUR_WALLET"

# Your trade history
curl "https://data-api.polymarket.com/activity?user=YOUR_WALLET&type=TRADE"
```

---

## 📱 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Start the bot |
| `npm run health-check` | Check bot health |
| `npm run check-stats` | View your stats |
| `npm run debug-balance` | Check USDC balance |
| `npm run check-allowance` | Check USDC allowance |
| `tail -f logs/bot-*.log` | Watch live logs |

---

## 💡 Tips

1. **Run health-check regularly** to catch issues early
2. **Monitor logs daily** to understand bot behavior
3. **Check balance weekly** to track performance
4. **Review failed orders** to optimize strategy
5. **Keep MongoDB running** - bot needs it to track trades

---

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `logs/bot-*.log`
2. Run health check: `npm run health-check`
3. Check balance: `npm run debug-balance`
4. Review error messages in console/logs
5. Check MongoDB connection
6. Verify `.env` configuration

For persistent issues, check:
- Network connectivity
- RPC endpoint status
- Polymarket API status
- MongoDB connection
