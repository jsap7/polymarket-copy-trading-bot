import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { ENV } from '../config/env';
import { UserActivityInterface, UserPositionInterface } from '../interfaces/User';
import { getUserActivityModel } from '../models/userHistory';
import Logger from './logger';
import { calculateOrderSize, getTradeMultiplier } from '../config/copyStrategy';

const RETRY_LIMIT = ENV.RETRY_LIMIT;
const COPY_STRATEGY_CONFIG = ENV.COPY_STRATEGY_CONFIG;

// Track consecutive Cloudflare errors to implement circuit breaker
let consecutiveCloudflareErrors = 0;
const MAX_CONSECUTIVE_CLOUDFLARE_ERRORS = 3; // Reduced to 3 for faster pause
let cloudflarePauseUntil = 0; // Timestamp when pause expires

/**
 * Check if bot is paused due to Cloudflare blocking
 */
export const isCloudflarePaused = (): boolean => {
    return Date.now() < cloudflarePauseUntil;
};

/**
 * Get remaining pause time in minutes
 */
export const getCloudflarePauseRemaining = (): number => {
    if (!isCloudflarePaused()) return 0;
    return Math.ceil((cloudflarePauseUntil - Date.now()) / 60000);
};

/**
 * Pause bot due to Cloudflare blocking
 */
const pauseForCloudflare = (minutes: number = 30): void => {
    cloudflarePauseUntil = Date.now() + (minutes * 60 * 1000);
    Logger.error(`🚨 PAUSE MODE ACTIVATED: Bot paused for ${minutes} minutes due to Cloudflare blocking`);
    Logger.error(`⏸️  Will resume at ${new Date(cloudflarePauseUntil).toLocaleTimeString()}`);
    Logger.error(`💡 To resume earlier, restart the bot: npm start`);
};

// Legacy parameters (for backward compatibility in SELL logic)
const TRADE_MULTIPLIER = ENV.TRADE_MULTIPLIER;
const COPY_PERCENTAGE = ENV.COPY_PERCENTAGE;

// Polymarket minimum order sizes
const MIN_ORDER_SIZE_USD = 1.0; // Minimum order size in USD for BUY orders
const MIN_ORDER_SIZE_TOKENS = 1.0; // Minimum order size in tokens for SELL/MERGE orders

const extractOrderError = (response: unknown): string | undefined => {
    if (!response) {
        return undefined;
    }

    if (typeof response === 'string') {
        return response;
    }

    if (typeof response === 'object') {
        const data = response as Record<string, unknown>;

        const directError = data.error;
        if (typeof directError === 'string') {
            return directError;
        }

        if (typeof directError === 'object' && directError !== null) {
            const nested = directError as Record<string, unknown>;
            if (typeof nested.error === 'string') {
                return nested.error;
            }
            if (typeof nested.message === 'string') {
                return nested.message;
            }
        }

        if (typeof data.errorMsg === 'string') {
            return data.errorMsg;
        }

        if (typeof data.message === 'string') {
            return data.message;
        }
    }

    return undefined;
};

const isCloudflareBlockError = (response: unknown): boolean => {
    if (!response || typeof response !== 'object') {
        return false;
    }

    const data = response as Record<string, unknown>;
    
    // Check for 403 status (primary indicator)
    if (data.status === 403 || data.statusCode === 403) {
        // Also check if response data contains HTML (Cloudflare block page)
        const responseData = data.data;
        if (typeof responseData === 'string') {
            const lowerData = responseData.toLowerCase();
            if (
                lowerData.includes('<!doctype html') ||
                lowerData.includes('cloudflare') ||
                lowerData.includes('sorry, you have been blocked') ||
                lowerData.includes('attention required')
            ) {
                return true;
            }
        }
        return true; // 403 status alone is enough
    }

    // Check statusText for "Forbidden"
    if (data.statusText === 'Forbidden') {
        return true;
    }

    // Check error message for Cloudflare indicators
    const errorMessage = extractOrderError(response);
    if (errorMessage) {
        const lower = errorMessage.toLowerCase();
        if (
            lower.includes('blocked') ||
            lower.includes('cloudflare') ||
            lower.includes('forbidden') ||
            lower.includes('403') ||
            lower.includes('<!doctype html') ||
            lower.includes('sorry, you have been blocked')
        ) {
            return true;
        }
    }

    // Check if response data is HTML (Cloudflare block page)
    if (data.data && typeof data.data === 'string') {
        const lowerData = (data.data as string).toLowerCase();
        if (
            lowerData.includes('<!doctype html') ||
            lowerData.includes('cloudflare') ||
            lowerData.includes('sorry, you have been blocked')
        ) {
            return true;
        }
    }

    return false;
};

const isInsufficientBalanceOrAllowanceError = (message: string | undefined): boolean => {
    if (!message) {
        return false;
    }
    const lower = message.toLowerCase();
    return lower.includes('not enough balance') || lower.includes('allowance');
};

/**
 * Add a random delay with jitter to make request patterns less predictable
 * Helps avoid Cloudflare detection
 */
const randomDelay = (baseMs: number, jitterMs: number = 0): Promise<void> => {
    const delay = baseMs + (jitterMs > 0 ? Math.random() * jitterMs : 0);
    return new Promise((resolve) => setTimeout(resolve, delay));
};

const postOrder = async (
    clobClient: ClobClient,
    condition: string,
    my_position: UserPositionInterface | undefined,
    user_position: UserPositionInterface | undefined,
    trade: UserActivityInterface,
    my_balance: number,
    user_balance: number,
    userAddress: string
) => {
    const UserActivity = getUserActivityModel(userAddress);
    
    // Check if paused due to Cloudflare
    if (isCloudflarePaused()) {
        const remainingMinutes = Math.ceil((cloudflarePauseUntil - Date.now()) / 60000);
        Logger.warning(`⏸️  Bot is paused due to Cloudflare blocking. Resuming in ${remainingMinutes} minute(s)...`);
        Logger.warning(`💡 Restart the bot to resume immediately, or wait for auto-resume`);
        await UserActivity.updateOne({ _id: trade._id }, { bot: true });
        return;
    }
    //Merge strategy
    if (condition === 'merge') {
        Logger.info('Executing MERGE strategy...');
        if (!my_position) {
            Logger.warning('No position to merge');
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
            return;
        }
        let remaining = my_position.size;

        // Check minimum order size
        if (remaining < MIN_ORDER_SIZE_TOKENS) {
            Logger.warning(
                `Position size (${remaining.toFixed(2)} tokens) too small to merge - skipping`
            );
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
            return;
        }

        let retry = 0;
        let abortDueToFunds = false;
        while (remaining > 0 && retry < RETRY_LIMIT) {
            // Delay before fetching order book to reduce request frequency
            if (retry > 0) {
                await randomDelay(1000, 500); // 1-1.5s delay on retries
            }
            
            const orderBook = await clobClient.getOrderBook(trade.asset);
            if (!orderBook.bids || orderBook.bids.length === 0) {
                Logger.warning('No bids available in order book');
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                break;
            }

            const maxPriceBid = orderBook.bids.reduce((max, bid) => {
                return parseFloat(bid.price) > parseFloat(max.price) ? bid : max;
            }, orderBook.bids[0]);

            Logger.info(`Best bid: ${maxPriceBid.size} @ $${maxPriceBid.price}`);
            let order_arges;
            if (remaining <= parseFloat(maxPriceBid.size)) {
                order_arges = {
                    side: Side.SELL,
                    tokenID: my_position.asset,
                    amount: remaining,
                    price: parseFloat(maxPriceBid.price),
                };
            } else {
                order_arges = {
                    side: Side.SELL,
                    tokenID: my_position.asset,
                    amount: parseFloat(maxPriceBid.size),
                    price: parseFloat(maxPriceBid.price),
                };
            }
            // Order args logged internally
            const signedOrder = await clobClient.createMarketOrder(order_arges);
            
            // Delay between order book fetch and order posting (helps avoid Cloudflare) - RELAXED
            await randomDelay(1000, 500); // 1-1.5s delay (relaxed from 5-10s)
            
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);
            if (resp.success === true) {
                retry = 0;
                consecutiveCloudflareErrors = 0; // Reset on success
                Logger.orderResult(
                    true,
                    `Sold ${order_arges.amount} tokens at $${order_arges.price}`
                );
                remaining -= order_arges.amount;
                // Small delay after successful order to space out requests
                if (remaining > 0) {
                    await randomDelay(1000, 500); // 1-1.5s delay before next order
                }
            } else {
                const errorMessage = extractOrderError(resp);
                
                // Check for Cloudflare blocking
                if (isCloudflareBlockError(resp)) {
                    consecutiveCloudflareErrors += 1;
                    Logger.warning('⚠️  Cloudflare blocking detected (403 Forbidden)');
                    
                    // Circuit breaker: if too many consecutive Cloudflare errors, pause bot completely
                    if (consecutiveCloudflareErrors >= MAX_CONSECUTIVE_CLOUDFLARE_ERRORS) {
                        pauseForCloudflare(15); // Pause for 15 minutes (relaxed from 60)
                        Logger.error('🚨 Your IP address has been blocked by Cloudflare');
                        Logger.error('💡 Solutions:');
                        Logger.error('   1. Wait 30 minutes and restart the bot');
                        Logger.error('   2. Use a different network (mobile hotspot, VPN)');
                        Logger.error('   3. Contact Polymarket support to whitelist your IP');
                        await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                        return; // Stop trying to place orders
                    }
                    
                    Logger.warning(`This usually resolves after a few minutes. Retry ${consecutiveCloudflareErrors}/${MAX_CONSECUTIVE_CLOUDFLARE_ERRORS}...`);
                    
                    // Exponential backoff for Cloudflare errors: 10s, 20s, 40s (RELAXED)
                    const cloudflareDelay = Math.min(10000 * Math.pow(2, retry), 60000); // Up to 60 seconds
                    Logger.info(`Waiting ${cloudflareDelay / 1000}s before retry...`);
                    await randomDelay(cloudflareDelay, cloudflareDelay * 0.2); // Add 20% jitter
                    
                    retry += 1;
                    if (retry >= RETRY_LIMIT) {
                        Logger.error('Max retries reached for Cloudflare blocking. Marking trade as failed.');
                        Logger.error('💡 Consider waiting 15-30 minutes before restarting the bot');
                    }
                    continue;
                } else {
                    // Reset counter on non-Cloudflare errors
                    consecutiveCloudflareErrors = 0;
                }
                
                if (isInsufficientBalanceOrAllowanceError(errorMessage)) {
                    abortDueToFunds = true;
                    Logger.warning(
                        `Order rejected: ${errorMessage || 'Insufficient balance or allowance'}`
                    );
                    Logger.warning(
                        'Skipping remaining attempts. Top up funds or run `npm run check-allowance` before retrying.'
                    );
                    break;
                }
                retry += 1;
                Logger.warning(
                    `Order failed (attempt ${retry}/${RETRY_LIMIT})${errorMessage ? ` - ${errorMessage}` : ''}`
                );
            }
        }
        if (abortDueToFunds) {
            await UserActivity.updateOne(
                { _id: trade._id },
                { bot: true, botExcutedTime: RETRY_LIMIT }
            );
            return;
        }
        if (retry >= RETRY_LIMIT) {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true, botExcutedTime: retry });
        } else {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
        }
    } else if (condition === 'buy') {
        //Buy strategy
        Logger.info('Executing BUY strategy...');

        Logger.info(`Your balance: $${my_balance.toFixed(2)}`);
        Logger.info(`Trader bought: $${trade.usdcSize.toFixed(2)}`);

        // Get current position size for position limit checks
        const currentPositionValue = my_position ? my_position.size * my_position.avgPrice : 0;

        // Use new copy strategy system
        const orderCalc = calculateOrderSize(
            COPY_STRATEGY_CONFIG,
            trade.usdcSize,
            my_balance,
            currentPositionValue
        );

        // Log the calculation reasoning
        Logger.info(`📊 ${orderCalc.reasoning}`);

        // Check if order should be executed
        if (orderCalc.finalAmount === 0) {
            Logger.warning(`❌ Cannot execute: ${orderCalc.reasoning}`);
            if (orderCalc.belowMinimum) {
                Logger.warning(`💡 Increase COPY_SIZE or wait for larger trades`);
            }
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
            return;
        }

        let remaining = orderCalc.finalAmount;

        let retry = 0;
        let abortDueToFunds = false;
        let totalBoughtTokens = 0; // Track total tokens bought for this trade

        while (remaining > 0 && retry < RETRY_LIMIT) {
            // Delay before fetching order book to reduce request frequency
            if (retry > 0) {
                await randomDelay(1000, 500); // 1-1.5s delay on retries
            }
            
            const orderBook = await clobClient.getOrderBook(trade.asset);
            if (!orderBook.asks || orderBook.asks.length === 0) {
                Logger.warning('No asks available in order book');
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                break;
            }

            const minPriceAsk = orderBook.asks.reduce((min, ask) => {
                return parseFloat(ask.price) < parseFloat(min.price) ? ask : min;
            }, orderBook.asks[0]);

            Logger.info(`Best ask: ${minPriceAsk.size} @ $${minPriceAsk.price}`);
            if (parseFloat(minPriceAsk.price) - 0.05 > trade.price) {
                Logger.warning('Price slippage too high - skipping trade');
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                break;
            }

            // Check if remaining amount is below minimum before creating order
            if (remaining < MIN_ORDER_SIZE_USD) {
                Logger.info(
                    `Remaining amount ($${remaining.toFixed(2)}) below minimum - completing trade`
                );
                await UserActivity.updateOne(
                    { _id: trade._id },
                    { bot: true, myBoughtSize: totalBoughtTokens }
                );
                break;
            }

            const maxOrderSize = parseFloat(minPriceAsk.size) * parseFloat(minPriceAsk.price);
            const orderSize = Math.min(remaining, maxOrderSize);

            const order_arges = {
                side: Side.BUY,
                tokenID: trade.asset,
                amount: orderSize,
                price: parseFloat(minPriceAsk.price),
            };

            Logger.info(
                `Creating order: $${orderSize.toFixed(2)} @ $${minPriceAsk.price} (Balance: $${my_balance.toFixed(2)})`
            );
            // Order args logged internally
            const signedOrder = await clobClient.createMarketOrder(order_arges);
            
            // Delay between order book fetch and order posting (helps avoid Cloudflare) - RELAXED
            await randomDelay(1000, 500); // 1-1.5s delay (relaxed from 5-10s)
            
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);
            if (resp.success === true) {
                retry = 0;
                consecutiveCloudflareErrors = 0; // Reset on success
                const tokensBought = order_arges.amount / order_arges.price;
                totalBoughtTokens += tokensBought;
                Logger.orderResult(
                    true,
                    `Bought $${order_arges.amount.toFixed(2)} at $${order_arges.price} (${tokensBought.toFixed(2)} tokens)`
                );
                remaining -= order_arges.amount;
                // Small delay after successful order to space out requests
                if (remaining > 0) {
                    await randomDelay(1000, 500); // 1-1.5s delay before next order
                }
            } else {
                const errorMessage = extractOrderError(resp);
                
                // Check for Cloudflare blocking
                if (isCloudflareBlockError(resp)) {
                    consecutiveCloudflareErrors += 1;
                    Logger.warning('⚠️  Cloudflare blocking detected (403 Forbidden)');
                    
                    // Circuit breaker: if too many consecutive Cloudflare errors, pause bot completely
                    if (consecutiveCloudflareErrors >= MAX_CONSECUTIVE_CLOUDFLARE_ERRORS) {
                        pauseForCloudflare(15); // Pause for 15 minutes (relaxed from 60)
                        Logger.error('🚨 Your IP address has been blocked by Cloudflare');
                        Logger.error('💡 Solutions:');
                        Logger.error('   1. Wait 30 minutes and restart the bot');
                        Logger.error('   2. Use a different network (mobile hotspot, VPN)');
                        Logger.error('   3. Contact Polymarket support to whitelist your IP');
                        await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                        return; // Stop trying to place orders
                    }
                    
                    Logger.warning(`This usually resolves after a few minutes. Retry ${consecutiveCloudflareErrors}/${MAX_CONSECUTIVE_CLOUDFLARE_ERRORS}...`);
                    
                    // Exponential backoff for Cloudflare errors: 10s, 20s, 40s (RELAXED)
                    const cloudflareDelay = Math.min(10000 * Math.pow(2, retry), 60000); // Up to 60 seconds
                    Logger.info(`Waiting ${cloudflareDelay / 1000}s before retry...`);
                    await randomDelay(cloudflareDelay, cloudflareDelay * 0.2); // Add 20% jitter
                    
                    retry += 1;
                    if (retry >= RETRY_LIMIT) {
                        Logger.error('Max retries reached for Cloudflare blocking. Marking trade as failed.');
                        Logger.error('💡 Consider waiting 15-30 minutes before restarting the bot');
                    }
                    continue;
                } else {
                    // Reset counter on non-Cloudflare errors
                    consecutiveCloudflareErrors = 0;
                }
                
                if (isInsufficientBalanceOrAllowanceError(errorMessage)) {
                    abortDueToFunds = true;
                    Logger.warning(
                        `Order rejected: ${errorMessage || 'Insufficient balance or allowance'}`
                    );
                    Logger.warning(
                        'Skipping remaining attempts. Top up funds or run `npm run check-allowance` before retrying.'
                    );
                    break;
                }
                retry += 1;
                Logger.warning(
                    `Order failed (attempt ${retry}/${RETRY_LIMIT})${errorMessage ? ` - ${errorMessage}` : ''}`
                );
            }
        }
        if (abortDueToFunds) {
            await UserActivity.updateOne(
                { _id: trade._id },
                { bot: true, botExcutedTime: RETRY_LIMIT, myBoughtSize: totalBoughtTokens }
            );
            return;
        }
        if (retry >= RETRY_LIMIT) {
            await UserActivity.updateOne(
                { _id: trade._id },
                { bot: true, botExcutedTime: retry, myBoughtSize: totalBoughtTokens }
            );
        } else {
            await UserActivity.updateOne(
                { _id: trade._id },
                { bot: true, myBoughtSize: totalBoughtTokens }
            );
        }

        // Log the tracked purchase for later sell reference
        if (totalBoughtTokens > 0) {
            Logger.info(
                `📝 Tracked purchase: ${totalBoughtTokens.toFixed(2)} tokens for future sell calculations`
            );
        }
    } else if (condition === 'sell') {
        //Sell strategy
        Logger.info('Executing SELL strategy...');
        let remaining = 0;
        if (!my_position) {
            Logger.warning('No position to sell');
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
            return;
        }

        // Get all previous BUY trades for this asset to calculate total bought
        const previousBuys = await UserActivity.find({
            asset: trade.asset,
            conditionId: trade.conditionId,
            side: 'BUY',
            bot: true,
            myBoughtSize: { $exists: true, $gt: 0 },
        }).exec();

        const totalBoughtTokens = previousBuys.reduce(
            (sum, buy) => sum + (buy.myBoughtSize || 0),
            0
        );

        if (totalBoughtTokens > 0) {
            Logger.info(
                `📊 Found ${previousBuys.length} previous purchases: ${totalBoughtTokens.toFixed(2)} tokens bought`
            );
        }

        if (!user_position) {
            // Trader sold entire position - we sell entire position too
            remaining = my_position.size;
            Logger.info(
                `Trader closed entire position → Selling all your ${remaining.toFixed(2)} tokens`
            );
        } else {
            // Calculate the % of position the trader is selling
            const trader_sell_percent = trade.size / (user_position.size + trade.size);
            const trader_position_before = user_position.size + trade.size;

            Logger.info(
                `Position comparison: Trader has ${trader_position_before.toFixed(2)} tokens, You have ${my_position.size.toFixed(2)} tokens`
            );
            Logger.info(
                `Trader selling: ${trade.size.toFixed(2)} tokens (${(trader_sell_percent * 100).toFixed(2)}% of their position)`
            );

            // Use tracked bought tokens if available, otherwise fallback to current position
            let baseSellSize;
            if (totalBoughtTokens > 0) {
                baseSellSize = totalBoughtTokens * trader_sell_percent;
                Logger.info(
                    `Calculating from tracked purchases: ${totalBoughtTokens.toFixed(2)} × ${(trader_sell_percent * 100).toFixed(2)}% = ${baseSellSize.toFixed(2)} tokens`
                );
            } else {
                baseSellSize = my_position.size * trader_sell_percent;
                Logger.warning(
                    `No tracked purchases found, using current position: ${my_position.size.toFixed(2)} × ${(trader_sell_percent * 100).toFixed(2)}% = ${baseSellSize.toFixed(2)} tokens`
                );
            }

            // Apply tiered or single multiplier based on trader's order size (symmetrical with BUY logic)
            const multiplier = getTradeMultiplier(COPY_STRATEGY_CONFIG, trade.usdcSize);
            remaining = baseSellSize * multiplier;

            if (multiplier !== 1.0) {
                Logger.info(
                    `Applying ${multiplier}x multiplier (based on trader's $${trade.usdcSize.toFixed(2)} order): ${baseSellSize.toFixed(2)} → ${remaining.toFixed(2)} tokens`
                );
            }
        }

        // Check minimum order size
        if (remaining < MIN_ORDER_SIZE_TOKENS) {
            Logger.warning(
                `❌ Cannot execute: Sell amount ${remaining.toFixed(2)} tokens below minimum (${MIN_ORDER_SIZE_TOKENS} token)`
            );
            Logger.warning(`💡 This happens when position sizes are too small or mismatched`);
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
            return;
        }

        // Cap sell amount to available position size
        if (remaining > my_position.size) {
            Logger.warning(
                `⚠️  Calculated sell ${remaining.toFixed(2)} tokens > Your position ${my_position.size.toFixed(2)} tokens`
            );
            Logger.warning(`Capping to maximum available: ${my_position.size.toFixed(2)} tokens`);
            remaining = my_position.size;
        }

        let retry = 0;
        let abortDueToFunds = false;
        let totalSoldTokens = 0; // Track total tokens sold

        while (remaining > 0 && retry < RETRY_LIMIT) {
            // Delay before fetching order book to reduce request frequency
            if (retry > 0) {
                await randomDelay(1000, 500); // 1-1.5s delay on retries
            }
            
            const orderBook = await clobClient.getOrderBook(trade.asset);
            if (!orderBook.bids || orderBook.bids.length === 0) {
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                Logger.warning('No bids available in order book');
                break;
            }

            const maxPriceBid = orderBook.bids.reduce((max, bid) => {
                return parseFloat(bid.price) > parseFloat(max.price) ? bid : max;
            }, orderBook.bids[0]);

            Logger.info(`Best bid: ${maxPriceBid.size} @ $${maxPriceBid.price}`);

            // Check if remaining amount is below minimum before creating order
            if (remaining < MIN_ORDER_SIZE_TOKENS) {
                Logger.info(
                    `Remaining amount (${remaining.toFixed(2)} tokens) below minimum - completing trade`
                );
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                break;
            }

            const sellAmount = Math.min(remaining, parseFloat(maxPriceBid.size));

            // Final check: don't create orders below minimum
            if (sellAmount < MIN_ORDER_SIZE_TOKENS) {
                Logger.info(
                    `Order amount (${sellAmount.toFixed(2)} tokens) below minimum - completing trade`
                );
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                break;
            }

            const order_arges = {
                side: Side.SELL,
                tokenID: trade.asset,
                amount: sellAmount,
                price: parseFloat(maxPriceBid.price),
            };
            // Order args logged internally
            const signedOrder = await clobClient.createMarketOrder(order_arges);
            
            // Delay between order book fetch and order posting (helps avoid Cloudflare) - RELAXED
            await randomDelay(1000, 500); // 1-1.5s delay (relaxed from 5-10s)
            
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);
            if (resp.success === true) {
                retry = 0;
                consecutiveCloudflareErrors = 0; // Reset on success
                totalSoldTokens += order_arges.amount;
                Logger.orderResult(
                    true,
                    `Sold ${order_arges.amount} tokens at $${order_arges.price}`
                );
                remaining -= order_arges.amount;
                // Small delay after successful order to space out requests
                if (remaining > 0) {
                    await randomDelay(1000, 500); // 1-1.5s delay before next order
                }
            } else {
                const errorMessage = extractOrderError(resp);
                
                // Check for Cloudflare blocking
                if (isCloudflareBlockError(resp)) {
                    consecutiveCloudflareErrors += 1;
                    Logger.warning('⚠️  Cloudflare blocking detected (403 Forbidden)');
                    
                    // Circuit breaker: if too many consecutive Cloudflare errors, pause bot completely
                    if (consecutiveCloudflareErrors >= MAX_CONSECUTIVE_CLOUDFLARE_ERRORS) {
                        pauseForCloudflare(15); // Pause for 15 minutes (relaxed from 60)
                        Logger.error('🚨 Your IP address has been blocked by Cloudflare');
                        Logger.error('💡 Solutions:');
                        Logger.error('   1. Wait 30 minutes and restart the bot');
                        Logger.error('   2. Use a different network (mobile hotspot, VPN)');
                        Logger.error('   3. Contact Polymarket support to whitelist your IP');
                        await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                        return; // Stop trying to place orders
                    }
                    
                    Logger.warning(`This usually resolves after a few minutes. Retry ${consecutiveCloudflareErrors}/${MAX_CONSECUTIVE_CLOUDFLARE_ERRORS}...`);
                    
                    // Exponential backoff for Cloudflare errors: 10s, 20s, 40s (RELAXED)
                    const cloudflareDelay = Math.min(10000 * Math.pow(2, retry), 60000); // Up to 60 seconds
                    Logger.info(`Waiting ${cloudflareDelay / 1000}s before retry...`);
                    await randomDelay(cloudflareDelay, cloudflareDelay * 0.2); // Add 20% jitter
                    
                    retry += 1;
                    if (retry >= RETRY_LIMIT) {
                        Logger.error('Max retries reached for Cloudflare blocking. Marking trade as failed.');
                        Logger.error('💡 Consider waiting 15-30 minutes before restarting the bot');
                    }
                    continue;
                } else {
                    // Reset counter on non-Cloudflare errors
                    consecutiveCloudflareErrors = 0;
                }
                
                if (isInsufficientBalanceOrAllowanceError(errorMessage)) {
                    abortDueToFunds = true;
                    Logger.warning(
                        `Order rejected: ${errorMessage || 'Insufficient balance or allowance'}`
                    );
                    Logger.warning(
                        'Skipping remaining attempts. Top up funds or run `npm run check-allowance` before retrying.'
                    );
                    break;
                }
                retry += 1;
                Logger.warning(
                    `Order failed (attempt ${retry}/${RETRY_LIMIT})${errorMessage ? ` - ${errorMessage}` : ''}`
                );
            }
        }

        // Update tracked purchases after successful sell
        if (totalSoldTokens > 0 && totalBoughtTokens > 0) {
            const sellPercentage = totalSoldTokens / totalBoughtTokens;

            if (sellPercentage >= 0.99) {
                // Sold essentially all tracked tokens - clear tracking
                await UserActivity.updateMany(
                    {
                        asset: trade.asset,
                        conditionId: trade.conditionId,
                        side: 'BUY',
                        bot: true,
                        myBoughtSize: { $exists: true, $gt: 0 },
                    },
                    { $set: { myBoughtSize: 0 } }
                );
                Logger.info(
                    `🧹 Cleared purchase tracking (sold ${(sellPercentage * 100).toFixed(1)}% of position)`
                );
            } else {
                // Partial sell - reduce tracked purchases proportionally
                for (const buy of previousBuys) {
                    const newSize = (buy.myBoughtSize || 0) * (1 - sellPercentage);
                    await UserActivity.updateOne(
                        { _id: buy._id },
                        { $set: { myBoughtSize: newSize } }
                    );
                }
                Logger.info(
                    `📝 Updated purchase tracking (sold ${(sellPercentage * 100).toFixed(1)}% of tracked position)`
                );
            }
        }

        if (abortDueToFunds) {
            await UserActivity.updateOne(
                { _id: trade._id },
                { bot: true, botExcutedTime: RETRY_LIMIT }
            );
            return;
        }
        if (retry >= RETRY_LIMIT) {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true, botExcutedTime: retry });
        } else {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
        }
    } else {
        Logger.error(`Unknown condition: ${condition}`);
    }
};

export default postOrder;
