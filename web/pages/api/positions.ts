import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/db';
import { getUserPositionModel } from '../../lib/models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Get your positions (from PROXY_WALLET)
    const proxyWallet = (process.env.PROXY_WALLET || '').toLowerCase();
    
    if (!proxyWallet) {
      return res.status(400).json({ error: 'PROXY_WALLET not configured' });
    }

    // Fetch positions from Polymarket API
    const response = await fetch(
      `https://data-api.polymarket.com/positions?user=${proxyWallet}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch positions from Polymarket');
    }

    const positions = await response.json();

    // Separate open and closed positions
    const openPositions = positions.filter((p: any) => p.size > 0);
    const closedPositions = positions.filter((p: any) => p.size === 0 || p.redeemable);

    // Calculate totals for open positions
    const totalValue = openPositions.reduce((sum: number, p: any) => sum + (p.currentValue || 0), 0);
    const totalInitialValue = openPositions.reduce((sum: number, p: any) => sum + (p.initialValue || 0), 0);
    const totalPnl = totalValue - totalInitialValue;
    const totalPnlPercent = totalInitialValue > 0 ? (totalPnl / totalInitialValue) * 100 : 0;

    // Calculate totals for closed positions
    const closedTotalValue = closedPositions.reduce((sum: number, p: any) => sum + (p.currentValue || 0), 0);
    const closedTotalInitialValue = closedPositions.reduce((sum: number, p: any) => sum + (p.initialValue || 0), 0);
    const closedTotalPnl = closedTotalValue - closedTotalInitialValue;
    const closedTotalPnlPercent = closedTotalInitialValue > 0 ? (closedTotalPnl / closedTotalInitialValue) * 100 : 0;

    res.status(200).json({
      positions: openPositions,
      closedPositions: closedPositions,
      summary: {
        totalPositions: openPositions.length,
        totalValue,
        totalInitialValue,
        totalPnl,
        totalPnlPercent,
        closedPositions: closedPositions.length,
        closedTotalValue,
        closedTotalInitialValue,
        closedTotalPnl,
        closedTotalPnlPercent,
      },
    });
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch positions' });
  }
}
