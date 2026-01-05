import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Stats {
  balance: {
    totalValue: number;
    positions: number;
  };
  trades: {
    total: number;
    buys: number;
    sells: number;
    buyVolume: number;
    sellVolume: number;
    netVolume: number;
  };
  traders: Record<string, any>;
  trackedTraders: string[];
}

interface Trade {
  _id: string;
  traderAddress: string;
  side: string;
  usdcSize: number;
  price: number;
  title: string;
  outcome: string;
  timestamp: number;
  transactionHash: string;
  slug: string;
}

interface Position {
  asset: string;
  title: string;
  outcome: string;
  size: number;
  currentValue: number;
  initialValue: number;
  cashPnl: number;
  percentPnl: number;
  curPrice: number;
  slug: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, tradesRes, positionsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/trades?limit=20'),
        fetch('/api/positions'),
      ]);

      const statsData = await statsRes.json();
      const tradesData = await tradesRes.json();
      const positionsData = await positionsRes.json();

      setStats(statsData);
      setTrades(tradesData.trades || []);
      setPositions(positionsData.positions || []);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Polymarket Bot Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-700 hover:text-gray-900">
                Overview
              </Link>
              <Link href="/trades" className="text-gray-700 hover:text-gray-900">
                Trades
              </Link>
              <Link href="/positions" className="text-gray-700 hover:text-gray-900">
                Positions
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Auto-refresh indicator */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshing every 10s
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Refresh Now
          </button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total Portfolio Value</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                ${stats.balance.totalValue.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Open Positions</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {stats.balance.positions}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total Trades</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{stats.trades.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Net Volume</div>
              <div className={`mt-2 text-3xl font-bold ${stats.trades.netVolume >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${stats.trades.netVolume.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Recent Trades */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Recent Trades</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trader
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outcome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.slice(0, 10).map((trade) => (
                  <tr key={trade._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(trade.timestamp * 1000), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.traderAddress.slice(0, 6)}...{trade.traderAddress.slice(-4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trade.side === 'BUY'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <a
                        href={`https://polymarket.com/event/${trade.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {trade.title || 'Unknown'}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{trade.outcome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${trade.usdcSize.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${trade.price.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open Positions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Open Positions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outcome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {positions.map((position) => (
                  <tr key={position.asset}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <a
                        href={`https://polymarket.com/event/${position.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {position.title || 'Unknown'}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{position.outcome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {position.size.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${position.currentValue.toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        position.cashPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      ${position.cashPnl.toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        position.percentPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {position.percentPnl.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
