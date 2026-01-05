# 👀 How to View Your Bot's Positions on Polymarket.com

## Your Wallet Address

**Bot Wallet**: `0x99a5bF8005DD3B34Ca060DF4FDc1ADE5cCbDc4D9`

This is the address the bot uses for all trades. You need to log into Polymarket.com with **this exact address** to see your positions.

## Why You Don't See Positions

If you're not seeing positions, it's likely because:

1. **Different MetaMask Account** - You're logged in with a different wallet address
2. **Wrong Network** - You're on Ethereum instead of Polygon
3. **UI Delay** - Polymarket UI sometimes takes time to update

## ✅ Solution: Import Bot Wallet into MetaMask

### Step 1: Get Your Private Key

Your private key is in `.env` file:
```bash
PRIVATE_KEY=your_private_key_here
```

**⚠️ SECURITY WARNING**: Never share your private key! This gives full access to your wallet.

### Step 2: Import into MetaMask

1. **Open MetaMask** browser extension
2. **Click account icon** (top right)
3. **Select "Import Account"**
4. **Choose "Private Key"**
5. **Paste your PRIVATE_KEY** from `.env`
6. **Click "Import"**

### Step 3: Switch to Polygon Network

1. In MetaMask, click **network dropdown** (top)
2. Select **"Polygon Mainnet"**
3. If not listed, add it:
   - Network Name: `Polygon Mainnet`
   - RPC URL: `https://polygon-rpc.com`
   - Chain ID: `137`
   - Currency: `MATIC`
   - Explorer: `https://polygonscan.com`

### Step 4: Connect to Polymarket

1. Go to **https://polymarket.com**
2. Click **"Connect Wallet"**
3. Select **MetaMask**
4. **Make sure** the imported account (`0x99a5...c4D9`) is selected
5. Approve connection

### Step 5: View Your Positions

After connecting, you should see:
- ✅ All positions the bot bought
- ✅ Your USDC balance ($89.99)
- ✅ Transaction history
- ✅ Ability to manually sell positions

## 🔍 Verify You're Using the Right Address

After importing, check:

1. **In MetaMask**: Click account name → Should show `0x99a5...c4D9`
2. **On Polymarket**: Click your profile → Should show same address
3. **Compare with bot**: Run `npm run check-proxy` → Should match

## 📊 Direct Profile Link

You can also view your profile directly:

```
https://polymarket.com/profile/0x99a5bF8005DD3B34Ca060DF4FDc1ADE5cCbDc4D9
```

**Note**: This only lets you **view**, not **manage** positions. To manage (buy/sell), you need to connect with MetaMask.

## 🐛 Troubleshooting

### "I imported but still don't see positions"

1. **Check network**: Must be Polygon Mainnet, not Ethereum
2. **Refresh page**: Sometimes UI needs refresh
3. **Check address**: Make sure it matches exactly `0x99a5bF8005DD3B34Ca060DF4FDc1ADE5cCbDc4D9`
4. **Wait a few minutes**: UI can take time to sync

### "I see balance but no positions"

Positions might be:
- **Very small** (scroll down in positions list)
- **In different markets** (check "All Markets" tab)
- **Already closed** (check "Closed Positions")

### "MetaMask shows different address"

You imported the wrong account. Make sure:
- You copied the **PRIVATE_KEY** from `.env` (not a different key)
- You imported it correctly (no extra spaces/characters)
- You're looking at the right account in MetaMask

## 💡 Quick Check

Run this to see your current activity:

```bash
npm run check-proxy
```

This shows:
- Your EOA address
- Proxy wallet address  
- Number of trades
- Direct profile links

## Summary

- ✅ **Bot Wallet**: `0x99a5bF8005DD3B34Ca060DF4FDc1ADE5cCbDc4D9`
- ✅ **Import PRIVATE_KEY** from `.env` into MetaMask
- ✅ **Switch to Polygon** network
- ✅ **Connect to Polymarket** with imported account
- ✅ **See all positions** the bot bought

Once you import the bot's private key into MetaMask and connect to Polymarket, you'll see all your positions! 🎉
