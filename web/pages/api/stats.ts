import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/db';
import { getUserActivityModel } from '../../lib/models';
import axios from 'axios';

const USER_ADDRESSES = (process.env.USER_ADDRESSES || '')
  .split(',')
  .map((addr) => addr.trim().toLowerCase())
  .filter((addr) => addr.length > 0);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const proxyWallet = (process.env.PROXY_WALLET || '').toLowerCase();
    
    if (!proxyWallet) {
      return res.status(400).json({ error: 'PROXY_WALLET not configured' });
    }

    // Get balance
    const balanceResponse = await axios.get(
      `https://data-api.polymarket.com/positions?user=${proxyWallet}`
    );
    const positions = balanceResponse.data || [];
    const totalValue = positions.reduce((sum: number, p: any) => sum + (p.currentValue || 0), 0);

    // Get all trades from all traders
    const allTrades: any[] = [];
    const traderStats: Record<string, any> = {};

    for (const address of USER_ADDRESSES) {
      const UserActivity = getUserActivityModel(address);
      const trades = await UserActivity.find({ bot: true })
        .sort({ timestamp: -1 })
        .lean()
        .exec();

      const buys = trades.filter((t: any) => t.side === 'BUY');
      const sells = trades.filter((t: any) => t.side === 'SELL');
      
      const buyVolume = buys.reduce((sum: number, t: any) => sum + (t.usdcSize || 0), 0);
      const sellVolume = sells.reduce((sum: number, t: any) => sum + (t.usdcSize || 0), 0);

      traderStats[address] = {
        address,
        totalTrades: trades.length,
        buyTrades: buys.length,
        sellTrades: sells.length,
        buyVolume,
        sellVolume,
        netVolume: buyVolume - sellVolume,
        lastTrade: trades[0]?.timestamp || null,
      };

      allTrades.push(...trades.map((t: any) => ({ ...t, traderAddress: address })));
    }

    // Calculate overall stats
    const totalTrades = allTrades.length;
    const buyTrades = allTrades.filter((t: any) => t.side === 'BUY').length;
    const sellTrades = allTrades.filter((t: any) => t.side === 'SELL').length;
    const totalBuyVolume = allTrades
      .filter((t: any) => t.side === 'BUY')
      .reduce((sum: number, t: any) => sum + (t.usdcSize || 0), 0);
    const totalSellVolume = allTrades
      .filter((t: any) => t.side === 'SELL')
      .reduce((sum: number, t: any) => sum + (t.usdcSize || 0), 0);

    res.status(200).json({
      balance: {
        totalValue,
        positions: positions.length,
      },
      trades: {
        total: totalTrades,
        buys: buyTrades,
        sells: sellTrades,
        buyVolume: totalBuyVolume,
        sellVolume: totalSellVolume,
        netVolume: totalBuyVolume - totalSellVolume,
      },
      traders: traderStats,
      trackedTraders: USER_ADDRESSES,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
}
