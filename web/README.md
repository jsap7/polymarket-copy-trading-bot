# Polymarket Bot Dashboard

A Next.js dashboard to view your Polymarket copy trading bot's activity, trades, and positions.

## Setup

1. Install dependencies:
```bash
cd web
npm install
```

2. Copy environment variables:
```bash
cp .env.local.example .env.local
```

3. Fill in `.env.local` with your MongoDB URI and wallet addresses (same as your bot's `.env`)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- **Overview Dashboard**: See your total portfolio value, open positions, and trade statistics
- **Recent Trades**: View all trades executed by the bot
- **Open Positions**: Monitor your current positions with P&L
- **Real-time Updates**: Auto-refreshes every 10 seconds

## API Routes

- `/api/stats` - Overall statistics
- `/api/trades` - List of trades (supports `?limit=100&side=BUY&trader=0x...`)
- `/api/positions` - Your open positions

## Pages

- `/` - Main dashboard
- `/trades` - Detailed trades view (coming soon)
- `/positions` - Detailed positions view (coming soon)
