import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  avgPrice: number;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'pnl' | 'value' | 'name'>('pnl');
  const [showClosed, setShowClosed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/positions');
      const data = await res.json();
      setPositions(data.positions || []);
      setClosedPositions(data.closedPositions || []);
      setSummary(data.summary);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching positions:', error);
      setLoading(false);
    }
  };

  const sortedPositions = [...positions].sort((a, b) => {
    switch (sortBy) {
      case 'pnl':
        return b.cashPnl - a.cashPnl;
      case 'value':
        return b.currentValue - a.currentValue;
      case 'name':
        return (a.title || '').localeCompare(b.title || '');
      default:
        return 0;
    }
  });

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
              <h1 className="text-2xl font-bold text-gray-900">Positions</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-700 hover:text-gray-900">
                Overview
              </Link>
              <Link href="/trades" className="text-gray-700 hover:text-gray-900">
                Trades
              </Link>
              <Link href="/positions" className="text-blue-600 font-medium">
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
            onClick={fetchPositions}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Refresh Now
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total Positions</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summary.totalPositions}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total Value</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                ${summary.totalValue.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total P&L</div>
              <div
                className={`mt-2 text-3xl font-bold ${
                  summary.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ${summary.totalPnl.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">P&L %</div>
              <div
                className={`mt-2 text-3xl font-bold ${
                  summary.totalPnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {summary.totalPnlPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <button
              onClick={() => setSortBy('pnl')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                sortBy === 'pnl'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              P&L
            </button>
            <button
              onClick={() => setSortBy('value')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                sortBy === 'value'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Value
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                sortBy === 'name'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Name
            </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showClosed"
                checked={showClosed}
                onChange={(e) => setShowClosed(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showClosed" className="text-sm font-medium text-gray-700">
                Show Closed Positions ({closedPositions.length})
              </label>
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              {positions.length} Open Positions
            </h2>
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
                    Avg Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Initial Value
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
                {sortedPositions.map((position) => (
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
                      ${position.avgPrice.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${position.curPrice.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${position.initialValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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

        {/* Closed Positions */}
        {showClosed && closedPositions.length > 0 && (
          <div className="bg-white rounded-lg shadow mt-8">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {closedPositions.length} Closed Positions
              </h2>
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
                      Initial Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Final Value
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
                  {closedPositions
                    .sort((a, b) => b.cashPnl - a.cashPnl)
                    .map((position) => (
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
                          ${position.initialValue.toFixed(2)}
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
        )}

        {/* Closed Positions Summary */}
        {showClosed && summary && summary.closedPositions > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Closed Positions</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summary.closedPositions}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total Closed P&L</div>
              <div
                className={`mt-2 text-3xl font-bold ${
                  summary.closedTotalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ${summary.closedTotalPnl.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Closed P&L %</div>
              <div
                className={`mt-2 text-3xl font-bold ${
                  summary.closedTotalPnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {summary.closedTotalPnlPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
