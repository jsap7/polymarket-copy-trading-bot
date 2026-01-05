import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/db';
import { getUserActivityModel } from '../../lib/models';

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

    const { trader, limit = '100', side } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Get all trades from all tracked traders
    const allTrades: any[] = [];
    
    for (const address of USER_ADDRESSES) {
      const UserActivity = getUserActivityModel(address);
      
      const query: any = { bot: true };
      if (side) {
        query.side = side;
      }
      
      const trades = await UserActivity.find(query)
        .sort({ timestamp: -1 })
        .limit(limitNum)
        .lean()
        .exec();

      trades.forEach((trade: any) => {
        allTrades.push({
          ...trade,
          traderAddress: address,
          _id: trade._id.toString(),
        });
      });
    }

    // Sort all trades by timestamp
    allTrades.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit after combining
    const limitedTrades = allTrades.slice(0, limitNum);

    // Filter by trader if specified
    const filteredTrades = trader
      ? limitedTrades.filter((t) => t.traderAddress.toLowerCase() === (trader as string).toLowerCase())
      : limitedTrades;

    res.status(200).json({
      trades: filteredTrades,
      total: filteredTrades.length,
    });
  } catch (error: any) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trades' });
  }
}
