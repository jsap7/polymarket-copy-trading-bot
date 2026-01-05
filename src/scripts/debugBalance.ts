import * as dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import { ENV } from '../config/env';

const PROXY_WALLET = ENV.PROXY_WALLET;
const RPC_URL = ENV.RPC_URL;
const USDC_CONTRACT_ADDRESS = ENV.USDC_CONTRACT_ADDRESS;

// Polygon USDC.e contract (the one Polymarket uses)
const POLYGON_USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
// Native Polygon USDC (different token)
const POLYGON_NATIVE_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

const USDC_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
];

async function debugBalance() {
    console.log('🔍 Debugging Wallet Balance...\n');
    console.log('═'.repeat(70));
    console.log('📊 Configuration:');
    console.log('═'.repeat(70));
    console.log(`Wallet Address: ${PROXY_WALLET}`);
    console.log(`RPC URL: ${RPC_URL}`);
    console.log(`USDC Contract (from .env): ${USDC_CONTRACT_ADDRESS}`);
    console.log('');

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    // Check network
    try {
        const network = await provider.getNetwork();
        console.log('═'.repeat(70));
        console.log('🌐 Network Info:');
        console.log('═'.repeat(70));
        console.log(`Chain ID: ${network.chainId}`);
        console.log(`Network Name: ${network.name}`);
        console.log('');
        
        if (network.chainId !== 137) {
            console.log('⚠️  WARNING: RPC is NOT connected to Polygon!');
            console.log('   Expected Chain ID: 137 (Polygon)');
            console.log(`   Actual Chain ID: ${network.chainId}`);
            console.log('');
        }
    } catch (error) {
        console.log('❌ Error checking network:', error);
        console.log('');
    }

    // Check balance on configured USDC contract
    try {
        console.log('═'.repeat(70));
        console.log('💰 Balance Check:');
        console.log('═'.repeat(70));
        
        const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
        const decimals = await usdcContract.decimals();
        const symbol = await usdcContract.symbol();
        const balance = await usdcContract.balanceOf(PROXY_WALLET);
        const balanceFormatted = ethers.utils.formatUnits(balance, decimals);

        console.log(`Contract: ${USDC_CONTRACT_ADDRESS}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`Decimals: ${decimals}`);
        console.log(`Balance: ${balanceFormatted} ${symbol}`);
        console.log('');
    } catch (error) {
        console.log(`❌ Error checking balance on ${USDC_CONTRACT_ADDRESS}:`);
        console.log(`   ${error instanceof Error ? error.message : String(error)}`);
        console.log('');
    }

    // Check balance on Polygon USDC.e (the one Polymarket uses)
    try {
        const usdcEContract = new ethers.Contract(POLYGON_USDC_E, USDC_ABI, provider);
        const decimals = await usdcEContract.decimals();
        const symbol = await usdcEContract.symbol();
        const balance = await usdcEContract.balanceOf(PROXY_WALLET);
        const balanceFormatted = ethers.utils.formatUnits(balance, decimals);

        console.log('═'.repeat(70));
        console.log('💰 USDC.e Balance (Polymarket Standard):');
        console.log('═'.repeat(70));
        console.log(`Contract: ${POLYGON_USDC_E}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`Balance: ${balanceFormatted} ${symbol}`);
        console.log('');
    } catch (error) {
        console.log(`❌ Error checking USDC.e balance:`);
        console.log(`   ${error instanceof Error ? error.message : String(error)}`);
        console.log('');
    }

    // Check native USDC balance
    try {
        const nativeUsdcContract = new ethers.Contract(POLYGON_NATIVE_USDC, USDC_ABI, provider);
        const decimals = await nativeUsdcContract.decimals();
        const symbol = await nativeUsdcContract.symbol();
        const balance = await nativeUsdcContract.balanceOf(PROXY_WALLET);
        const balanceFormatted = ethers.utils.formatUnits(balance, decimals);

        if (!balance.isZero()) {
            console.log('═'.repeat(70));
            console.log('💰 Native USDC Balance (Different Token):');
            console.log('═'.repeat(70));
            console.log(`Contract: ${POLYGON_NATIVE_USDC}`);
            console.log(`Symbol: ${symbol}`);
            console.log(`Balance: ${balanceFormatted} ${symbol}`);
            console.log('⚠️  Note: Polymarket uses USDC.e, not native USDC!');
            console.log('');
        }
    } catch (error) {
        // Ignore errors for native USDC check
    }

    // Check MATIC/POL balance
    try {
        const maticBalance = await provider.getBalance(PROXY_WALLET);
        const maticFormatted = ethers.utils.formatEther(maticBalance);
        console.log('═'.repeat(70));
        console.log('⛽ Gas Balance (POL/MATIC):');
        console.log('═'.repeat(70));
        console.log(`Balance: ${maticFormatted} POL`);
        console.log('');
    } catch (error) {
        console.log(`❌ Error checking POL balance:`);
        console.log(`   ${error instanceof Error ? error.message : String(error)}`);
        console.log('');
    }

    console.log('═'.repeat(70));
    console.log('💡 Tips:');
    console.log('═'.repeat(70));
    console.log('• If USDC.e balance is 0, you may have USDC on Ethereum instead of Polygon');
    console.log('• Bridge USDC from Ethereum to Polygon: https://wallet.polygon.technology/polygon/bridge');
    console.log('• Make sure your RPC URL is for Polygon (chain ID 137)');
    console.log('• Polymarket uses USDC.e (0x2791...), not native USDC');
    console.log('');
}

debugBalance().catch(console.error);
