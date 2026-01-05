import axios from 'axios';
import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

// Colors for console output
const colors = {
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

interface TraderActivity {
    address: string;
    lastTradeTime: number;
    lastTradeDate: string;
    hoursSinceLastTrade: number;
    tradesLast24h: number;
    tradesLast7d: number;
    totalTrades: number;
    status: 'very_active' | 'active' | 'inactive' | 'dead';
}

const HOURS_24 = 24 * 60 * 60;
const HOURS_7D = 7 * 24 * 60 * 60;

async function checkTraderActivity(address: string): Promise<TraderActivity> {
    try {
        const url = `https://data-api.polymarket.com/activity?user=${address}&type=TRADE&limit=100`;
        const trades = await fetchData(url);

        if (!Array.isArray(trades) || trades.length === 0) {
            return {
                address,
                lastTradeTime: 0,
                lastTradeDate: 'Never',
                hoursSinceLastTrade: Infinity,
                tradesLast24h: 0,
                tradesLast7d: 0,
                totalTrades: 0,
                status: 'dead',
            };
        }

        const now = Math.floor(Date.now() / 1000);
        const lastTrade = trades[0];
        const lastTradeTime = lastTrade.timestamp;
        const hoursSinceLastTrade = (now - lastTradeTime) / 3600;

        const tradesLast24h = trades.filter(
            (t: any) => t.timestamp >= now - HOURS_24
        ).length;
        const tradesLast7d = trades.filter(
            (t: any) => t.timestamp >= now - HOURS_7D
        ).length;

        let status: TraderActivity['status'];
        if (hoursSinceLastTrade < 6) {
            status = 'very_active';
        } else if (hoursSinceLastTrade < 24) {
            status = 'active';
        } else if (hoursSinceLastTrade < 72) {
            status = 'inactive';
        } else {
            status = 'dead';
        }

        return {
            address,
            lastTradeTime,
            lastTradeDate: new Date(lastTradeTime * 1000).toISOString().split('T')[0],
            hoursSinceLastTrade,
            tradesLast24h,
            tradesLast7d,
            totalTrades: trades.length,
            status,
        };
    } catch (error) {
        return {
            address,
            lastTradeTime: 0,
            lastTradeDate: 'Error',
            hoursSinceLastTrade: Infinity,
            tradesLast24h: 0,
            tradesLast7d: 0,
            totalTrades: 0,
            status: 'dead',
        };
    }
}

async function main() {
    console.log(colors.bold('\n🔍 CHECKING TRADER ACTIVITY\n'));
    console.log('━'.repeat(80) + '\n');

    const traders = ENV.USER_ADDRESSES || [];

    if (traders.length === 0) {
        console.log(colors.red('❌ No traders configured in USER_ADDRESSES'));
        process.exit(1);
    }

    console.log(colors.cyan(`Checking ${traders.length} trader(s)...\n`));

    const activities: TraderActivity[] = [];

    for (const trader of traders) {
        process.stdout.write(`Checking ${trader.slice(0, 10)}...${' '.repeat(20)}\r`);
        const activity = await checkTraderActivity(trader);
        activities.push(activity);
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('\n');

    // Display results
    console.log('━'.repeat(80));
    activities.forEach((activity) => {
        const statusColor =
            activity.status === 'very_active'
                ? colors.green
                : activity.status === 'active'
                  ? colors.yellow
                  : activity.status === 'inactive'
                    ? colors.yellow
                    : colors.red;

        const statusEmoji =
            activity.status === 'very_active'
                ? '🟢'
                : activity.status === 'active'
                  ? '🟡'
                  : activity.status === 'inactive'
                    ? '🟠'
                    : '🔴';

        console.log(`\n${statusEmoji} ${activity.address}`);
        console.log(`   Status: ${statusColor(activity.status.toUpperCase())}`);
        console.log(`   Last Trade: ${activity.lastTradeDate} (${activity.hoursSinceLastTrade.toFixed(1)} hours ago)`);
        console.log(`   Trades Last 24h: ${activity.tradesLast24h}`);
        console.log(`   Trades Last 7d: ${activity.tradesLast7d}`);
        console.log(`   Total Trades: ${activity.totalTrades}`);
    });

    console.log('\n' + '━'.repeat(80) + '\n');

    // Recommendations
    const inactiveTraders = activities.filter(
        (a) => a.status === 'inactive' || a.status === 'dead'
    );
    const activeTraders = activities.filter((a) => a.status === 'very_active' || a.status === 'active');

    if (inactiveTraders.length > 0) {
        console.log(colors.yellow('⚠️  INACTIVE TRADERS DETECTED:\n'));
        inactiveTraders.forEach((trader) => {
            console.log(`   • ${trader.address}`);
            console.log(`     Last trade: ${trader.hoursSinceLastTrade.toFixed(1)} hours ago\n`);
        });

        console.log(colors.cyan('💡 RECOMMENDATION:\n'));
        console.log('   Run the following to find better traders:');
        console.log(colors.green('   npm run select-traders\n'));
    } else {
        console.log(colors.green('✅ All traders are active!\n'));
    }

    console.log(`📊 Summary:`);
    console.log(`   Very Active: ${activities.filter((a) => a.status === 'very_active').length}`);
    console.log(`   Active: ${activeTraders.length}`);
    console.log(`   Inactive: ${inactiveTraders.length}\n`);
}

main().catch(console.error);
