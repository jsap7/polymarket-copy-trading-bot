import axios from 'axios';
import * as readline from 'readline';
import { ENV } from '../config/env';

// Colors for console output
const colors = {
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
    magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
};

interface Trade {
    timestamp: number;
    asset: string;
    side: 'BUY' | 'SELL';
    price: number;
    usdcSize: number;
    size: number;
    conditionId: string;
    transactionHash: string;
}

interface Position {
    asset: string;
    conditionId: string;
    size: number;
    currentValue: number;
    initialValue: number;
    avgPrice: number;
}

interface TraderAnalysis {
    address: string;
    name?: string;
    profileUrl: string;

    // Performance metrics
    roi: number;
    totalPnl: number;
    startingCapital: number;
    currentCapital: number;

    // Risk metrics
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;

    // Trading stats
    totalTrades: number;
    copiedTrades: number;
    skippedTrades: number;
    avgTradeSize: number;
    tradingDays: number;

    // Activity
    lastActivityTime: number;
    lastActivityDate: string;

    // Copy-trading suitability metrics
    tradesPerDay: number;        // Average trades per day (lower = more copyable)
    avgHoldHours: number;        // Average position hold time in hours
    uniqueMarkets: number;       // Number of different markets traded
    tradingStyle: 'HOLDER' | 'SWING' | 'SCALPER' | 'UNKNOWN';

    // Composite score (0-100)
    compositeScore: number;
    error?: string;
}

// Configuration
const STARTING_CAPITAL = 1000;
const HISTORY_DAYS = parseInt(process.env.SIM_HISTORY_DAYS || '30', 10);
const MIN_TRADER_TRADES = parseInt(process.env.MIN_TRADER_TRADES || '20', 10);
const MIN_TRADING_DAYS = parseInt(process.env.MIN_TRADING_DAYS || '7', 10);
const MAX_TRADERS_TO_ANALYZE = parseInt(process.env.MAX_TRADERS_TO_ANALYZE || '200', 10);
const MAX_HOURS_SINCE_LAST_TRADE = parseInt(process.env.MAX_HOURS_SINCE_LAST_TRADE || '72', 10); // Only traders active in last 72h
const MIN_TRADES_LAST_24H = parseInt(process.env.MIN_TRADES_LAST_24H || '1', 10); // At least 1 trade in last 24h
const MIN_ROI = parseFloat(process.env.MIN_ROI || '5'); // Minimum 5% ROI
const MIN_WIN_RATE = parseFloat(process.env.MIN_WIN_RATE || '50'); // Minimum 50% win rate

// NEW: Filters for better copy-trading candidates
const MIN_AVG_TRADE_SIZE = parseFloat(process.env.MIN_AVG_TRADE_SIZE || '10'); // Min $10 avg trade size
const MAX_TRADES_PER_DAY = parseFloat(process.env.MAX_TRADES_PER_DAY || '25'); // Max 25 trades/day
const MIN_AVG_HOLD_HOURS = parseFloat(process.env.MIN_AVG_HOLD_HOURS || '1'); // Min 1h avg hold time

// Use current traders as seed
const SEED_TRADERS = [
    ...(ENV.USER_ADDRESSES || []),
    // The one known good trader
    '0x6bab41a0dc40d6dd4c1a915b8c01969479fd1292',
    '0xa4b366ad22fc0d06f1e934ff468e8922431a87b8',
];

/**
 * Fetch trader's trading activity (direct API call, no rate limiting wrapper)
 */
async function fetchTraderActivity(traderAddress: string): Promise<Trade[]> {
    try {
        const cutoffTime = Math.floor(Date.now() / 1000) - HISTORY_DAYS * 24 * 60 * 60;
        const url = `https://data-api.polymarket.com/activity?user=${traderAddress}&type=TRADE&limit=500`;
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
        
        if (!Array.isArray(response.data)) {
            return [];
        }

        const filtered = response.data
            .filter((activity: any) => activity.timestamp >= cutoffTime)
            .map((activity: any) => ({
                timestamp: activity.timestamp,
                asset: activity.asset,
                side: activity.side,
                price: activity.price,
                usdcSize: activity.usdcSize,
                size: activity.size,
                conditionId: activity.conditionId,
                transactionHash: activity.transactionHash,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
            
        return filtered;
    } catch (error) {
        return [];
    }
}

/**
 * Fetch trader's current positions
 */
async function fetchTraderPositions(traderAddress: string): Promise<Position[]> {
    try {
        const url = `https://data-api.polymarket.com/positions?user=${traderAddress}`;
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!Array.isArray(response.data)) {
            return [];
        }

        return response.data.map((pos: any) => ({
            asset: pos.asset,
            conditionId: pos.conditionId,
            size: pos.size || 0,
            currentValue: pos.currentValue || 0,
            initialValue: pos.initialValue || 0,
            avgPrice: pos.avgPrice || 0,
        }));
    } catch (error) {
        return [];
    }
}

/**
 * Discover traders by scraping the leaderboard page
 */
async function discoverTradersFromLeaderboard(): Promise<Set<string>> {
    const discovered = new Set<string>();
    
    console.log(colors.cyan('🏆 Scraping leaderboard for trader addresses...\n'));
    
    try {
        const response = await axios.get('https://polymarket.com/leaderboard', {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        
        // Extract all Ethereum addresses from the HTML
        const html = response.data as string;
        const addressRegex = /0x[a-fA-F0-9]{40}/gi;
        const matches = html.match(addressRegex) || [];
        
        // Deduplicate (lowercase)
        matches.forEach(addr => {
            discovered.add(addr.toLowerCase());
        });
        
        console.log(colors.green(`✓ Found ${discovered.size} traders from leaderboard\n`));
    } catch (error: any) {
        console.log(colors.yellow(`⚠️  Leaderboard error: ${error.message}\n`));
    }
    
    return discovered;
}

/**
 * Discover traders from multiple pages on Polymarket
 */
async function discoverTradersFromMarkets(): Promise<Set<string>> {
    const allDiscovered = new Set<string>();
    
    // Get traders from leaderboard
    const leaderboardTraders = await discoverTradersFromLeaderboard();
    leaderboardTraders.forEach(addr => allDiscovered.add(addr));
    
    // Also try a few profile pages that might have trader lists
    const additionalPages = [
        'https://polymarket.com/activity',
        'https://polymarket.com/markets',
    ];
    
    for (const pageUrl of additionalPages) {
        try {
            console.log(colors.cyan(`📊 Scanning ${pageUrl.split('/').pop()}...`));
            
            const response = await axios.get(pageUrl, {
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });
            
            const html = response.data as string;
            const addressRegex = /0x[a-fA-F0-9]{40}/gi;
            const matches = html.match(addressRegex) || [];
            
            const beforeCount = allDiscovered.size;
            matches.forEach(addr => {
                allDiscovered.add(addr.toLowerCase());
            });
            
            console.log(colors.green(`   Found ${allDiscovered.size - beforeCount} new traders`));
            await new Promise(r => setTimeout(r, 500));
        } catch (error) {
            // Skip
        }
    }
    
    console.log(colors.green(`\n✓ Total discovered: ${allDiscovered.size} traders\n`));
    
    return allDiscovered;
}

/**
 * Discover traders from seed traders' activity
 */
async function discoverTradersFromSeeds(): Promise<Set<string>> {
    const discovered = new Set<string>();
    
    console.log(colors.cyan(`🔎 Expanding from ${SEED_TRADERS.length} seed traders...`));
    
    for (const seedTrader of SEED_TRADERS) {
        try {
            const trades = await fetchTraderActivity(seedTrader);
            if (trades.length > 0) {
                discovered.add(seedTrader.toLowerCase());
            }
        } catch (error) {
            // Skip
        }
    }

    return discovered;
}

/**
 * Simulate copying a trader's trades
 */
async function simulateTrader(traderAddress: string): Promise<TraderAnalysis> {
    const profileUrl = `https://polymarket.com/profile/${traderAddress}`;
    const analysis: TraderAnalysis = {
        address: traderAddress,
        profileUrl,
        roi: 0,
        totalPnl: 0,
        startingCapital: STARTING_CAPITAL,
        currentCapital: STARTING_CAPITAL,
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0,
        totalTrades: 0,
        copiedTrades: 0,
        skippedTrades: 0,
        avgTradeSize: 0,
        tradingDays: 0,
        lastActivityTime: 0,
        lastActivityDate: '',
        tradesPerDay: 0,
        avgHoldHours: 0,
        uniqueMarkets: 0,
        tradingStyle: 'UNKNOWN',
        compositeScore: 0,
    };

    try {
        // Fetch trades
        const trades = await fetchTraderActivity(traderAddress);

        if (trades.length < MIN_TRADER_TRADES) {
            analysis.error = `Insufficient trades: ${trades.length} < ${MIN_TRADER_TRADES}`;
            return analysis;
        }

        // Calculate trading days
        const firstTrade = trades[0];
        const lastTrade = trades[trades.length - 1];
        analysis.tradingDays = Math.ceil((lastTrade.timestamp - firstTrade.timestamp) / (24 * 60 * 60));
        analysis.lastActivityTime = lastTrade.timestamp;
        analysis.lastActivityDate = new Date(lastTrade.timestamp * 1000).toISOString().split('T')[0];

        // Check recent activity
        const now = Math.floor(Date.now() / 1000);
        const hoursSinceLastTrade = (now - lastTrade.timestamp) / 3600;
        const tradesLast24h = trades.filter((t: any) => t.timestamp >= now - 24 * 60 * 60).length;

        if (analysis.tradingDays < MIN_TRADING_DAYS) {
            analysis.error = `Insufficient trading days: ${analysis.tradingDays} < ${MIN_TRADING_DAYS}`;
            return analysis;
        }

        // Filter out inactive traders
        if (hoursSinceLastTrade > MAX_HOURS_SINCE_LAST_TRADE) {
            analysis.error = `Trader inactive: last trade ${hoursSinceLastTrade.toFixed(1)} hours ago (max ${MAX_HOURS_SINCE_LAST_TRADE}h)`;
            return analysis;
        }

        if (tradesLast24h < MIN_TRADES_LAST_24H) {
            analysis.error = `Low recent activity: only ${tradesLast24h} trades in last 24h (min ${MIN_TRADES_LAST_24H})`;
            return analysis;
        }

        // Fetch current positions
        const positions = await fetchTraderPositions(traderAddress);
        const positionsMap = new Map<string, Position>();
        positions.forEach((pos) => {
            positionsMap.set(pos.conditionId, pos);
        });

        // Simulate copying trades (10% of trader's size)
        let capital = STARTING_CAPITAL;
        let peakCapital = STARTING_CAPITAL;
        let totalInvested = 0;
        let totalReturned = 0;
        let wins = 0;
        let losses = 0;
        const dailyReturns: number[] = [];
        const dailyEquity: number[] = [];

        // Group trades by day
        const tradesByDay = new Map<number, Trade[]>();
        for (const trade of trades) {
            const day = Math.floor(trade.timestamp / (24 * 60 * 60));
            if (!tradesByDay.has(day)) {
                tradesByDay.set(day, []);
            }
            tradesByDay.get(day)!.push(trade);
        }

        const sortedDays = Array.from(tradesByDay.keys()).sort();
        let previousEquity = STARTING_CAPITAL;

        for (const day of sortedDays) {
            const dayTrades = tradesByDay.get(day)!;
            let dayPnL = 0;

            for (const trade of dayTrades) {
                analysis.totalTrades++;

                if (trade.side === 'BUY') {
                    // Copy buy trade proportionally (10% of trader's size)
                    const traderPercent = 0.1;
                    const orderSize = trade.usdcSize * traderPercent;

                    if (orderSize <= capital && orderSize >= 1.0) {
                        capital -= orderSize;
                        totalInvested += orderSize;
                        analysis.copiedTrades++;
                        dayPnL -= orderSize;
                    } else {
                        analysis.skippedTrades++;
                    }
                } else if (trade.side === 'SELL') {
                    // Copy sell trade proportionally
                    const traderPercent = 0.1;
                    const orderSize = trade.usdcSize * traderPercent;

                    if (orderSize > 0) {
                        capital += orderSize;
                        totalReturned += orderSize;
                        analysis.copiedTrades++;
                        dayPnL += orderSize;

                        if (orderSize > trade.usdcSize * traderPercent * 0.9) {
                            wins++;
                        } else {
                            losses++;
                        }
                    } else {
                        analysis.skippedTrades++;
                    }
                }
            }

            // Calculate current equity (capital + open positions value)
            const currentEquity = capital + totalInvested * 0.95; // Simplified: assume positions retain 95% value
            dailyEquity.push(currentEquity);
            peakCapital = Math.max(peakCapital, currentEquity);

            // Calculate daily return
            if (previousEquity > 0) {
                const dailyReturn = ((currentEquity - previousEquity) / previousEquity) * 100;
                dailyReturns.push(dailyReturn);
            }
            previousEquity = currentEquity;
        }

        // Calculate final equity including open positions
        const finalEquity = capital + totalInvested * 0.95;
        analysis.currentCapital = finalEquity;
        analysis.totalPnl = finalEquity - STARTING_CAPITAL;
        analysis.roi = ((finalEquity - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;

        // Calculate win rate
        if (wins + losses > 0) {
            analysis.winRate = (wins / (wins + losses)) * 100;
        }

        // Calculate average trade size
        if (analysis.copiedTrades > 0) {
            analysis.avgTradeSize = totalInvested / analysis.copiedTrades;
        }

        // Calculate Maximum Drawdown
        let maxDrawdown = 0;
        let peak = STARTING_CAPITAL;
        for (const equity of dailyEquity) {
            if (equity > peak) {
                peak = equity;
            }
            const drawdown = ((peak - equity) / peak) * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        analysis.maxDrawdown = maxDrawdown;

        // Calculate Sharpe Ratio (simplified)
        if (dailyReturns.length > 1) {
            const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
            const variance =
                dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
                dailyReturns.length;
            const stdDev = Math.sqrt(variance);
            analysis.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
        }

        // Calculate copy-trading suitability metrics
        analysis.tradesPerDay = analysis.tradingDays > 0 
            ? analysis.totalTrades / analysis.tradingDays 
            : 0;
        
        // Count unique markets
        const uniqueMarkets = new Set<string>();
        for (const trade of trades) {
            if (trade.conditionId) {
                uniqueMarkets.add(trade.conditionId);
            }
        }
        analysis.uniqueMarkets = uniqueMarkets.size;

        // Calculate average hold time (estimate based on buy/sell patterns)
        let totalHoldTime = 0;
        let holdCount = 0;
        const openPositions = new Map<string, number>(); // conditionId -> buy timestamp
        
        for (const trade of trades) {
            if (trade.side === 'BUY') {
                openPositions.set(trade.conditionId, trade.timestamp);
            } else if (trade.side === 'SELL' && openPositions.has(trade.conditionId)) {
                const buyTime = openPositions.get(trade.conditionId)!;
                const holdTime = (trade.timestamp - buyTime) / 3600; // hours
                totalHoldTime += holdTime;
                holdCount++;
                openPositions.delete(trade.conditionId);
            }
        }
        
        analysis.avgHoldHours = holdCount > 0 ? totalHoldTime / holdCount : 24; // Default to 24h if no sells

        // Determine trading style
        if (analysis.tradesPerDay > 30 && analysis.avgHoldHours < 1) {
            analysis.tradingStyle = 'SCALPER';  // True scalper: many trades, very short holds
        } else if (analysis.avgHoldHours >= 12) {
            analysis.tradingStyle = 'HOLDER';   // Holds for 12h+
        } else if (analysis.avgHoldHours >= 1) {
            analysis.tradingStyle = 'SWING';    // 1-12h holds
        } else {
            analysis.tradingStyle = 'SCALPER';  // Very short holds = scalper
        }

        // Filter out unprofitable traders
        if (analysis.roi < MIN_ROI) {
            analysis.error = `ROI too low: ${analysis.roi.toFixed(2)}% < ${MIN_ROI}%`;
            return analysis;
        }

        if (analysis.winRate < MIN_WIN_RATE) {
            analysis.error = `Win rate too low: ${analysis.winRate.toFixed(1)}% < ${MIN_WIN_RATE}%`;
            return analysis;
        }

        // Filter out scalpers (hard to copy)
        if (analysis.tradingStyle === 'SCALPER') {
            analysis.error = `Scalper (${analysis.tradesPerDay.toFixed(1)} trades/day, ${analysis.avgHoldHours.toFixed(1)}h avg hold) - hard to copy`;
            return analysis;
        }

        // Filter by average trade size (too small = not worth copying)
        if (analysis.avgTradeSize < MIN_AVG_TRADE_SIZE) {
            analysis.error = `Avg trade too small: $${analysis.avgTradeSize.toFixed(2)} < $${MIN_AVG_TRADE_SIZE}`;
            return analysis;
        }

        // Calculate composite score (0-100)
        // Factors: ROI (30%), Win Rate (25%), Hold Time (20%), Sharpe (15%), Drawdown (10%)
        const roiScore = Math.min(100, Math.max(0, (analysis.roi + 50) / 2)); // Normalize -50% to +150% ROI
        const winRateScore = analysis.winRate; // Already 0-100
        const holdScore = Math.min(100, analysis.avgHoldHours * 2); // 50h+ = 100
        const sharpeScore = Math.min(100, Math.max(0, (analysis.sharpeRatio + 2) * 20)); // Normalize -2 to +3 Sharpe
        const drawdownScore = Math.max(0, 100 - analysis.maxDrawdown * 2); // Penalize high drawdown

        analysis.compositeScore =
            roiScore * 0.3 + winRateScore * 0.25 + holdScore * 0.2 + sharpeScore * 0.15 + drawdownScore * 0.1;
    } catch (error: any) {
        analysis.error = error.message || 'Unknown error';
    }

    return analysis;
}

/**
 * Discover traders from various sources
 */
async function discoverTraders(): Promise<string[]> {
    console.log(colors.cyan('\n🔍 DISCOVERING TRADERS FROM MULTIPLE SOURCES...\n'));

    const discovered = new Set<string>();

    // 1. Add seed traders (including current ones from .env)
    SEED_TRADERS.forEach((addr) => discovered.add(addr.toLowerCase()));
    console.log(colors.green(`✓ Added ${SEED_TRADERS.length} seed traders`));

    // 2. Discover from markets
    const marketTraders = await discoverTradersFromMarkets();
    marketTraders.forEach((addr) => discovered.add(addr));
    console.log(colors.green(`✓ Discovered ${marketTraders.size} traders from markets`));

    // 3. Validate seed traders are active
    const seedTraders = await discoverTradersFromSeeds();
    seedTraders.forEach((addr) => discovered.add(addr));

    const traderList = Array.from(discovered);
    console.log(colors.green(`✓ Total unique traders: ${traderList.length}\n`));

    return traderList.slice(0, MAX_TRADERS_TO_ANALYZE);
}

/**
 * Analyze all discovered traders
 */
async function analyzeTraders(traderAddresses: string[]): Promise<TraderAnalysis[]> {
    console.log(colors.cyan(`\n📈 ANALYZING ${traderAddresses.length} TRADERS...\n`));

    const analyses: TraderAnalysis[] = [];
    let completed = 0;

    for (const address of traderAddresses) {
        completed++;
        const progress = `[${completed}/${traderAddresses.length}]`;
        process.stdout.write(
            `\r${colors.gray(progress)} Analyzing ${address.slice(0, 10)}...${' '.repeat(20)}`
        );

        const analysis = await simulateTrader(address);
        analyses.push(analysis);

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log('\n');

    // Filter out traders with errors or insufficient data
    const validAnalyses = analyses.filter(
        (a) => !a.error && a.totalTrades >= MIN_TRADER_TRADES && a.tradingDays >= MIN_TRADING_DAYS
    );

    // Sort by activity first (most recent activity), then by composite score
    validAnalyses.sort((a, b) => {
        // First sort by last activity (most recent first)
        if (b.lastActivityTime !== a.lastActivityTime) {
            return b.lastActivityTime - a.lastActivityTime;
        }
        // Then by composite score
        return b.compositeScore - a.compositeScore;
    });

    // Sort by composite score (best first)
    validAnalyses.sort((a, b) => b.compositeScore - a.compositeScore);

    return validAnalyses;
}

/**
 * Display trader rankings
 */
function displayRankings(analyses: TraderAnalysis[], limit: number = 20): void {
    console.log(colors.bold('\n🏆 TOP TRADERS RANKINGS\n'));
    console.log('━'.repeat(120));

    const topTraders = analyses.slice(0, limit);

    topTraders.forEach((analysis, index) => {
        const rank = index + 1;
        const roiColor = analysis.roi >= 0 ? colors.green : colors.red;
        const scoreColor =
            analysis.compositeScore >= 70
                ? colors.green
                : analysis.compositeScore >= 50
                  ? colors.yellow
                  : colors.red;

        const styleEmoji = analysis.tradingStyle === 'HOLDER' ? '💎' : 
                           analysis.tradingStyle === 'SWING' ? '🔄' : '⚡';
        const styleColor = analysis.tradingStyle === 'HOLDER' ? colors.green :
                           analysis.tradingStyle === 'SWING' ? colors.yellow : colors.red;

        console.log(`\n${colors.bold(`#${rank}`)} ${analysis.address}`);
        console.log(`   ${colors.cyan('Score:')} ${scoreColor(analysis.compositeScore.toFixed(1))}/100`);
        console.log(`   ${colors.cyan('Style:')} ${styleEmoji} ${styleColor(analysis.tradingStyle)} (${analysis.tradesPerDay.toFixed(1)} trades/day, ${analysis.avgHoldHours.toFixed(0)}h avg hold)`);
        console.log(`   ${colors.cyan('ROI:')} ${roiColor(`${analysis.roi.toFixed(2)}%`)} | ${colors.cyan('P&L:')} ${roiColor(`$${analysis.totalPnl.toFixed(2)}`)}`);
        console.log(`   ${colors.cyan('Win Rate:')} ${analysis.winRate.toFixed(1)}% | ${colors.cyan('Sharpe:')} ${analysis.sharpeRatio.toFixed(2)} | ${colors.cyan('Max DD:')} ${colors.red(`${analysis.maxDrawdown.toFixed(2)}%`)}`);
        console.log(`   ${colors.cyan('Trades:')} ${analysis.totalTrades} in ${analysis.tradingDays} days | ${colors.cyan('Avg Size:')} $${analysis.avgTradeSize.toFixed(2)}`);
        console.log(`   ${colors.cyan('Markets:')} ${analysis.uniqueMarkets} | ${colors.cyan('Last Trade:')} ${analysis.lastActivityDate}`);
        
        // Show recent activity indicator
        const now = Math.floor(Date.now() / 1000);
        const hoursSinceLastTrade = (now - analysis.lastActivityTime) / 3600;
        if (hoursSinceLastTrade < 6) {
            console.log(`   ${colors.green('🟢 Active now')}`);
        } else if (hoursSinceLastTrade < 24) {
            console.log(`   ${colors.yellow('🟡 Active today')}`);
        }
        
        console.log(`   ${colors.gray(analysis.profileUrl)}`);
    });

    console.log('\n' + '━'.repeat(120) + '\n');
}

/**
 * Output comma-separated addresses
 */
function outputAddresses(traderAddresses: string[]): void {
    const addressesString = traderAddresses.join(',');
    console.log(colors.bold('\n📋 COPY THESE ADDRESSES TO YOUR .env FILE:\n'));
    console.log(colors.cyan(`USER_ADDRESSES=${addressesString}\n`));
    console.log(colors.gray('Or copy just the addresses:'));
    console.log(colors.green(addressesString + '\n'));
}

/**
 * Prompt user for number of traders to select
 */
function promptUser(maxTraders: number): Promise<number> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(
            colors.cyan(`\nHow many traders do you want to track? (1-${maxTraders}): `),
            (answer) => {
                rl.close();
                const num = parseInt(answer, 10);
                if (isNaN(num) || num < 1 || num > maxTraders) {
                    console.log(colors.yellow(`Invalid input. Using default: 3`));
                    resolve(3);
                } else {
                    resolve(num);
                }
            }
        );
    });
}

/**
 * Main function
 */
async function main() {
    console.log(colors.bold('\n╔══════════════════════════════════════════════════════════════╗'));
    console.log(colors.bold('║     POLYMARKET COPY TRADING - TRADER SELECTION TOOL        ║'));
    console.log(colors.bold('╚══════════════════════════════════════════════════════════════╝\n'));

    try {
        // Step 1: Discover traders
        const discoveredTraders = await discoverTraders();

        if (discoveredTraders.length === 0) {
            console.log(colors.red('❌ No traders discovered. Exiting.'));
            process.exit(1);
        }

        // Step 2: Analyze traders
        const analyses = await analyzeTraders(discoveredTraders);

        if (analyses.length === 0) {
            console.log(colors.red('❌ No valid traders found after analysis. Exiting.'));
            process.exit(1);
        }

        // Step 3: Display rankings
        displayRankings(analyses, 20);

        // Step 4: Prompt user for selection
        const numToSelect = await promptUser(analyses.length);
        const selectedTraders = analyses.slice(0, numToSelect);

        console.log(colors.cyan(`\n📝 Selected ${selectedTraders.length} profitable, active traders:\n`));
        selectedTraders.forEach((trader, index) => {
            const roiColor = trader.roi >= 0 ? colors.green : colors.red;
            console.log(
                `   ${index + 1}. ${trader.address}`
            );
            console.log(`      Score: ${trader.compositeScore.toFixed(1)}/100 | ROI: ${roiColor(trader.roi.toFixed(2) + '%')} | Win Rate: ${trader.winRate.toFixed(1)}%`);
        });

        // Step 5: Output addresses
        const addresses = selectedTraders.map((t) => t.address);
        outputAddresses(addresses);

        console.log(colors.green('✅ Copy the addresses above to your .env file'));
        console.log(colors.cyan('💡 Then run `npm start` to begin copy trading.\n'));
    } catch (error: any) {
        console.error(colors.red(`\n❌ Error: ${error.message}\n`));
        process.exit(1);
    }
}

main();
