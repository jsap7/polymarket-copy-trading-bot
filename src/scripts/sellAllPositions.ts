import { ethers } from 'ethers';
import { AssetType, ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { SignatureType } from '@polymarket/order-utils';
import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

const PROXY_WALLET = ENV.PROXY_WALLET;
const PRIVATE_KEY = ENV.PRIVATE_KEY;
const CLOB_HTTP_URL = ENV.CLOB_HTTP_URL;
const RPC_URL = ENV.RPC_URL;
const POLYGON_CHAIN_ID = 137;

interface Position {
    asset: string;
    conditionId: string;
    size: number;
    avgPrice: number;
    currentValue: number;
    curPrice: number;
    title?: string;
    outcome?: string;
    slug?: string;
}

const isGnosisSafe = async (
    address: string,
    provider: ethers.providers.JsonRpcProvider
): Promise<boolean> => {
    try {
        const code = await provider.getCode(address);
        return code !== '0x';
    } catch (error) {
        console.error(`Error checking wallet type: ${error}`);
        return false;
    }
};

const createClobClient = async (
    provider: ethers.providers.JsonRpcProvider
): Promise<ClobClient> => {
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const isProxySafe = await isGnosisSafe(PROXY_WALLET, provider);
    const signatureType = isProxySafe ? SignatureType.POLY_GNOSIS_SAFE : SignatureType.EOA;

    console.log(`Wallet type: ${isProxySafe ? 'Gnosis Safe' : 'EOA'}`);

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    console.log = function () {};
    console.error = function () {};

    let clobClient = new ClobClient(
        CLOB_HTTP_URL,
        POLYGON_CHAIN_ID,
        wallet,
        undefined,
        signatureType,
        isProxySafe ? PROXY_WALLET : undefined
    );

    let creds = await clobClient.createApiKey();
    if (!creds.key) {
        creds = await clobClient.deriveApiKey();
    }

    clobClient = new ClobClient(
        CLOB_HTTP_URL,
        POLYGON_CHAIN_ID,
        wallet,
        creds,
        signatureType,
        isProxySafe ? PROXY_WALLET : undefined
    );

    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    return clobClient;
};

const randomDelay = (min: number, max: number): Promise<void> => {
    const delay = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, delay));
};

const sellAllPositions = async () => {
    console.log('\n💰 SELLING ALL POSITIONS\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Wallet: ${PROXY_WALLET}\n`);

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const clobClient = await createClobClient(provider);

    // Fetch all positions
    console.log('📊 Fetching positions...\n');
    const positionsUrl = `https://data-api.polymarket.com/positions?user=${PROXY_WALLET}`;
    const positions: Position[] = await fetchData(positionsUrl);

    // Filter to only open positions (size > 0)
    const openPositions = positions.filter((p) => p.size > 0);

    if (openPositions.length === 0) {
        console.log('✅ No open positions to sell\n');
        return;
    }

    console.log(`Found ${openPositions.length} open position(s) to sell:\n`);

    let totalSold = 0;
    let totalValue = 0;

    for (let i = 0; i < openPositions.length; i++) {
        const position = openPositions[i];
        totalValue += position.currentValue || 0;

        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Position ${i + 1}/${openPositions.length}:`);
        console.log(`Market: ${position.title || 'Unknown'}`);
        console.log(`Outcome: ${position.outcome || 'Unknown'}`);
        console.log(`Size: ${position.size.toFixed(2)} tokens`);
        console.log(`Current Value: $${(position.currentValue || 0).toFixed(2)}`);
        console.log(`Current Price: $${position.curPrice.toFixed(4)}\n`);

        try {
            // Update balance cache for this specific token
            console.log('🔄 Updating balance cache...');
            try {
                await clobClient.updateBalanceAllowance({
                    asset_type: AssetType.CONDITIONAL,
                    token_id: position.asset,
                });
                console.log('✅ Cache updated');
            } catch (cacheError: any) {
                console.log(`⚠️  Cache update warning: ${cacheError.message || cacheError}`);
            }

            // Get order book
            await randomDelay(2000, 3000);
            const orderBook = await clobClient.getOrderBook(position.asset);

            if (!orderBook.bids || orderBook.bids.length === 0) {
                console.log('⚠️  No bids available - skipping\n');
                continue;
            }

            // Find best bid
            const bestBid = orderBook.bids.reduce((max, bid) => {
                return parseFloat(bid.price) > parseFloat(max.price) ? bid : max;
            }, orderBook.bids[0]);

            console.log(`Best bid: ${bestBid.size} @ $${bestBid.price}`);

            // Determine sell amount (sell all)
            const sellAmount = Math.min(position.size, parseFloat(bestBid.size));

            // Create sell order
            const sellOrder = await clobClient.createMarketOrder({
                side: Side.SELL,
                tokenID: position.asset,
                amount: sellAmount,
                price: parseFloat(bestBid.price),
            });

            // Post order
            await randomDelay(1000, 1500);
            const result = await clobClient.postOrder(sellOrder, OrderType.FOK);

            if (result.success) {
                console.log(`✅ Sold ${sellAmount.toFixed(2)} tokens @ $${bestBid.price}`);
                totalSold += 1;
            } else {
                console.log(`❌ Failed to sell: ${JSON.stringify(result)}`);
            }

            console.log('');

            // Delay between positions
            if (i < openPositions.length - 1) {
                await randomDelay(2000, 3000);
            }
        } catch (error: any) {
            console.log(`❌ Error selling position: ${error.message || error}\n`);
        }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total positions: ${openPositions.length}`);
    console.log(`   Successfully sold: ${totalSold}`);
    console.log(`   Total value: $${totalValue.toFixed(2)}\n`);
};

sellAllPositions().catch(console.error);
