import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ─── Colors ──────────────────────────────────────────────────────────────────
const c = {
    cyan: (t: string) => `\x1b[36m${t}\x1b[0m`,
    green: (t: string) => `\x1b[32m${t}\x1b[0m`,
    red: (t: string) => `\x1b[31m${t}\x1b[0m`,
    yellow: (t: string) => `\x1b[33m${t}\x1b[0m`,
    blue: (t: string) => `\x1b[34m${t}\x1b[0m`,
    gray: (t: string) => `\x1b[90m${t}\x1b[0m`,
    bold: (t: string) => `\x1b[1m${t}\x1b[0m`,
    magenta: (t: string) => `\x1b[35m${t}\x1b[0m`,
    dim: (t: string) => `\x1b[2m${t}\x1b[0m`,
};

const pnl = (v: number) => (v >= 0 ? c.green(`+$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : c.red(`-$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`));
const pct = (v: number) => (v >= 0 ? c.green(`+${v.toFixed(2)}%`) : c.red(`${v.toFixed(2)}%`));
const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Constants ───────────────────────────────────────────────────────────────
const DATA_API = 'https://data-api.polymarket.com';
const HTTP_TIMEOUT = 15000;
const BATCH_SIZE = 100;
const MAX_TRADE_PAGES = 30; // 3000 trades max
const RATE_LIMIT_DELAY = 300;
const LINE = '━'.repeat(72);
const THIN_LINE = '─'.repeat(72);

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface LeaderboardEntry {
    rank: string;
    proxyWallet: string;
    userName: string;
    vol: number;
    pnl: number;
    profileImage?: string;
    xUsername?: string;
    verifiedBadge?: boolean;
}

interface Position {
    proxyWallet: string;
    asset: string;
    conditionId: string;
    size: number;
    avgPrice: number;
    initialValue: number;
    currentValue: number;
    cashPnl: number;
    percentPnl: number;
    totalBought: number;
    realizedPnl: number;
    percentRealizedPnl: number;
    curPrice: number;
    redeemable: boolean;
    mergeable: boolean;
    title: string;
    slug: string;
    icon: string;
    eventSlug: string;
    outcome: string;
    outcomeIndex: number;
    oppositeOutcome: string;
    oppositeAsset: string;
    endDate: string;
    negativeRisk: boolean;
}

interface Trade {
    id?: string;
    proxyWallet?: string;
    timestamp: number;
    conditionId?: string;
    type?: string;
    size: number;
    usdcSize: number;
    transactionHash?: string;
    price: number;
    asset: string;
    side: 'BUY' | 'SELL';
    title?: string;
    slug?: string;
    outcome?: string;
}

interface TimePeriodStats {
    pnl: number;
    vol: number;
    rank: string | null;
}

interface TraderReport {
    // Identity
    username: string | null;
    address: string;
    profileUrl: string;

    // Portfolio snapshot
    portfolioValue: number;
    activePositions: number;
    totalCurrentValue: number;
    totalInitialValue: number;

    // Leaderboard across time periods
    leaderboard: {
        day: TimePeriodStats;
        week: TimePeriodStats;
        month: TimePeriodStats;
        all: TimePeriodStats;
    };

    // Position-level risk metrics
    resolvedPositions: number;
    activePositions_unresolved: number;
    winRate: number;
    winRateBasis: string; // what the win rate is calculated from
    profitFactor: number;
    avgPositionPnl: number;
    medianPositionPnl: number;
    largestWin: { pnl: number; title: string };
    largestLoss: { pnl: number; title: string };
    concentrationRisk: number; // largest position as % of portfolio

    // Trade-level metrics
    totalTradesFetched: number;
    tradeHistoryTruncated: boolean;
    avgTradeSize: number;
    medianTradeSize: number;
    tradesPerDay: number;
    tradesPerDayNote: string;
    oldestTradeTimestamp: number;
    newestTradeTimestamp: number;
    daysActive: number;

    // Strategy inference
    strategyType: 'directional' | 'arb_suspected' | 'market_making_suspected' | 'mixed' | 'unknown';
    latencySensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
    marketCategories: Record<string, number>;

    // Drawdown
    maxDrawdownEstimate: number;
    maxDrawdownPercent: number;
    maxDrawdownNote: string;

    // Estimated starting balance
    estimatedStartingBalance: number;
    estimatedStartingBalanceNote: string;

    // Copy trading projections at different starting capitals
    copyProjections: { capital: number; monthlyEstimate: number; dailyEstimate: number }[];

    // Metadata
    analyzedAt: string;
    errors: string[];
}

// ─── HTTP Helper ─────────────────────────────────────────────────────────────
async function apiGet<T>(url: string, retries = 3): Promise<T | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const resp = await axios.get<T>(url, {
                timeout: HTTP_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                family: 4,
            });
            return resp.data;
        } catch (err) {
            if (attempt === retries) return null;
            await sleep(1000 * attempt);
        }
    }
    return null;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Data Fetchers ───────────────────────────────────────────────────────────

async function resolveTraderAddress(input: string): Promise<{ address: string; username: string | null }> {
    // Already an address
    if (input.startsWith('0x') && input.length === 42) {
        // Try to get username from leaderboard
        const data = await apiGet<LeaderboardEntry[]>(
            `${DATA_API}/v1/leaderboard?user=${input}&timePeriod=ALL&limit=1`
        );
        const username = data && data.length > 0 ? data[0].userName : null;
        return { address: input.toLowerCase(), username };
    }

    // Username -- resolve via leaderboard
    const data = await apiGet<LeaderboardEntry[]>(
        `${DATA_API}/v1/leaderboard?userName=${input}&timePeriod=ALL&limit=1`
    );
    if (data && data.length > 0) {
        return { address: data[0].proxyWallet.toLowerCase(), username: data[0].userName };
    }

    // Try other time periods in case they don't appear in ALL
    for (const period of ['MONTH', 'WEEK', 'DAY'] as const) {
        const fallback = await apiGet<LeaderboardEntry[]>(
            `${DATA_API}/v1/leaderboard?userName=${input}&timePeriod=${period}&limit=1`
        );
        if (fallback && fallback.length > 0) {
            return { address: fallback[0].proxyWallet.toLowerCase(), username: fallback[0].userName };
        }
    }

    throw new Error(`Could not resolve trader "${input}" -- not found on any leaderboard`);
}

async function fetchLeaderboardStats(address: string): Promise<TraderReport['leaderboard']> {
    const periods = ['DAY', 'WEEK', 'MONTH', 'ALL'] as const;
    const keys = ['day', 'week', 'month', 'all'] as const;
    const result: any = {};

    for (let i = 0; i < periods.length; i++) {
        await sleep(RATE_LIMIT_DELAY);
        const data = await apiGet<LeaderboardEntry[]>(
            `${DATA_API}/v1/leaderboard?user=${address}&timePeriod=${periods[i]}&limit=1`
        );
        if (data && data.length > 0) {
            result[keys[i]] = { pnl: data[0].pnl, vol: data[0].vol, rank: data[0].rank };
        } else {
            result[keys[i]] = { pnl: 0, vol: 0, rank: null };
        }
    }

    return result as TraderReport['leaderboard'];
}

async function fetchPositions(address: string): Promise<Position[]> {
    const all: Position[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        await sleep(RATE_LIMIT_DELAY);
        const batch = await apiGet<Position[]>(
            `${DATA_API}/positions?user=${address}&limit=500&offset=${offset}&sizeThreshold=0`
        );
        if (!batch || batch.length === 0) {
            hasMore = false;
        } else {
            all.push(...batch);
            offset += batch.length;
            if (batch.length < 500) hasMore = false;
        }
    }

    return all;
}

async function fetchPortfolioValue(address: string): Promise<number> {
    const data = await apiGet<{ user: string; value: number }[]>(
        `${DATA_API}/value?user=${address}`
    );
    if (data && data.length > 0) return data[0].value;
    return 0;
}

async function fetchTradeHistory(address: string): Promise<Trade[]> {
    const all: Trade[] = [];
    let offset = 0;

    for (let page = 0; page < MAX_TRADE_PAGES; page++) {
        await sleep(RATE_LIMIT_DELAY);
        const batch = await apiGet<Trade[]>(
            `${DATA_API}/activity?user=${address}&type=TRADE&limit=${BATCH_SIZE}&offset=${offset}`
        );
        if (!batch || batch.length === 0) break;
        all.push(...batch);
        offset += batch.length;
        if (batch.length < BATCH_SIZE) break;
    }

    return all.sort((a, b) => a.timestamp - b.timestamp);
}

// ─── Analysis ────────────────────────────────────────────────────────────────

function categorizeMarket(title: string): string {
    const t = title.toLowerCase();
    // Crypto price markets
    if (/\b(bitcoin|btc|ethereum|eth|solana|sol|xrp|crypto|up or down|doge|bnb|ada|avax|matic)\b/.test(t)) return 'crypto';
    // Esports (check before sports since esports titles also contain "vs")
    if (/\b(lol|counter-strike|cs2|valorant|dota|esport|bo3|bo5|iem |lcs |lec |lck )\b/.test(t)) return 'esports';
    // Sports -- broad pattern: "X vs. Y" or "X vs Y" is almost always sports on Polymarket
    if (/\bvs\.?\s/i.test(t)) return 'sports';
    // Sports -- team/league/spread patterns
    if (/\b(nba|nfl|nhl|mlb|soccer|football|fc |match|league|epl|serie a|ligue|champions|premier|laliga|bundesliga|playoffs|bowl|cup|spread:|will .+ win on|finals|super bowl|world series|stanley cup|slam|open |grand prix)\b/.test(t)) return 'sports';
    // Politics
    if (/\b(president|election|senate|congress|governor|party|democrat|republican|vote|trump|biden|harris|cabinet|supreme court|impeach|primary|nominee|inaugurat)\b/.test(t)) return 'politics';
    // Economics
    if (/\b(fed |federal reserve|interest rate|inflation|gdp|unemployment|cpi|fomc|tariff|recession|rate cut|rate hike|treasury|jobs report)\b/.test(t)) return 'economics';
    // Weather
    if (/\b(temperature|weather|hurricane|storm|climate|tornado|flood|wildfire)\b/.test(t)) return 'weather';
    // Culture / Entertainment
    if (/\b(oscar|grammy|emmy|movie|film|album|twitter|x\.com|follower|subscriber|tiktok|youtube|spotify|netflix|box office)\b/.test(t)) return 'culture';
    return 'other';
}

function inferStrategy(trades: Trade[], positions: Position[]): {
    type: TraderReport['strategyType'];
    latency: TraderReport['latencySensitivity'];
} {
    if (trades.length === 0) return { type: 'unknown', latency: 'LOW' };

    // Check for arb pattern: buying both YES and NO on the same conditionId
    const conditionSides = new Map<string, Set<string>>();
    for (const pos of positions) {
        const key = pos.conditionId;
        if (!conditionSides.has(key)) conditionSides.set(key, new Set());
        conditionSides.get(key)!.add(pos.outcome);
    }

    let dualSidedCount = 0;
    for (const [, outcomes] of conditionSides) {
        if (outcomes.size >= 2) dualSidedCount++;
    }

    const dualSidedRatio = positions.length > 0 ? dualSidedCount / conditionSides.size : 0;

    // Check market types for latency assessment
    const categories = new Map<string, number>();
    for (const t of trades) {
        const cat = categorizeMarket(t.title || t.slug || '');
        categories.set(cat, (categories.get(cat) || 0) + 1);
    }

    const cryptoRatio = (categories.get('crypto') || 0) / trades.length;

    // Check trade frequency for market-making pattern
    const tradesPerDay = trades.length > 1
        ? trades.length / ((trades[trades.length - 1].timestamp - trades[0].timestamp) / 86400)
        : 0;

    // Infer strategy type
    let type: TraderReport['strategyType'] = 'directional';
    if (dualSidedRatio > 0.3) {
        type = 'arb_suspected';
    } else if (tradesPerDay > 100 && cryptoRatio > 0.5) {
        type = 'market_making_suspected';
    } else if (dualSidedRatio > 0.1) {
        type = 'mixed';
    }

    // Latency sensitivity
    let latency: TraderReport['latencySensitivity'] = 'LOW';
    if (cryptoRatio > 0.5) {
        latency = 'HIGH';
    } else if (cryptoRatio > 0.2 || (categories.get('sports') || 0) / trades.length > 0.5) {
        latency = 'MEDIUM';
    }

    return { type, latency };
}

function estimateMaxDrawdown(trades: Trade[], allTimePnl: number): { maxDrawdown: number; maxDrawdownPercent: number; note: string } {
    if (trades.length === 0) return { maxDrawdown: 0, maxDrawdownPercent: 0, note: 'no trades' };

    // Walk through trades tracking cumulative cash flow as a proxy for PnL curve.
    // BUY = cash out (investment), SELL = cash in (return).
    // This is an approximation since we don't know the resolution values.
    let cumPnl = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (const trade of trades) {
        if (trade.side === 'SELL') {
            cumPnl += trade.usdcSize;
        } else {
            cumPnl -= trade.usdcSize;
        }

        if (cumPnl > peak) peak = cumPnl;
        const drawdown = peak - cumPnl;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Use all-time PnL + total volume as base for percentage if peak is 0
    const base = peak > 0 ? peak : Math.abs(allTimePnl);
    const maxDrawdownPercent = base > 0 ? (maxDrawdown / base) * 100 : 0;

    const truncated = trades.length >= MAX_TRADE_PAGES * BATCH_SIZE;
    const note = truncated
        ? `estimated from ${trades.length} most recent trades (history truncated)`
        : `from ${trades.length} trades`;

    return { maxDrawdown, maxDrawdownPercent, note };
}

function median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Analyze One Trader ──────────────────────────────────────────────────────

async function analyzeTrader(input: string): Promise<TraderReport> {
    const errors: string[] = [];

    // 1. Resolve identity
    console.log(c.gray(`  Resolving ${input}...`));
    const { address, username } = await resolveTraderAddress(input);
    console.log(c.gray(`  Address: ${address}${username ? ` (${username})` : ''}`));

    // 2. Fetch all data in sequence (rate-limited)
    console.log(c.gray(`  Fetching leaderboard stats...`));
    const leaderboard = await fetchLeaderboardStats(address);

    console.log(c.gray(`  Fetching portfolio value...`));
    const portfolioValue = await fetchPortfolioValue(address);

    console.log(c.gray(`  Fetching positions...`));
    const positions = await fetchPositions(address);
    console.log(c.gray(`  Found ${positions.length} positions`));

    console.log(c.gray(`  Fetching trade history...`));
    const trades = await fetchTradeHistory(address);
    console.log(c.gray(`  Found ${trades.length} trades`));

    // 3. Position-level analysis -- separate resolved vs active
    const now = Date.now();
    const resolvedPositions = positions.filter((p) => p.redeemable || (p.endDate && new Date(p.endDate).getTime() < now));
    const unresolvedPositions = positions.filter((p) => !p.redeemable && (!p.endDate || new Date(p.endDate).getTime() >= now));

    // Win rate based on resolved positions only (unresolved have floating PnL)
    const resolvedWithPnl = resolvedPositions.filter((p) => p.cashPnl !== undefined);
    const winningResolved = resolvedWithPnl.filter((p) => p.cashPnl > 0);
    const losingResolved = resolvedWithPnl.filter((p) => p.cashPnl < 0);

    let winRate: number;
    let winRateBasis: string;

    if (resolvedWithPnl.length > 0) {
        winRate = (winningResolved.length / resolvedWithPnl.length) * 100;
        winRateBasis = `${winningResolved.length}W / ${losingResolved.length}L of ${resolvedWithPnl.length} resolved positions (${unresolvedPositions.length} still active)`;
    } else {
        // Fall back to all positions if nothing resolved
        const allWithPnl = positions.filter((p) => p.cashPnl !== undefined);
        const allWinning = allWithPnl.filter((p) => p.cashPnl > 0);
        winRate = allWithPnl.length > 0 ? (allWinning.length / allWithPnl.length) * 100 : 0;
        winRateBasis = `${allWinning.length}W / ${allWithPnl.length - allWinning.length}L of ${allWithPnl.length} positions (no resolved positions found)`;
    }

    // NOTE: The /positions endpoint only returns positions still held (including
    // redeemable-but-unclaimed). Already-redeemed winning positions disappear from
    // this endpoint, which can bias win rate downward. The leaderboard PnL is more
    // reliable for overall performance.

    const totalWins = winningResolved.reduce((s, p) => s + p.cashPnl, 0);
    const totalLosses = Math.abs(losingResolved.reduce((s, p) => s + p.cashPnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const allPnls = resolvedWithPnl.map((p) => p.cashPnl);
    const avgPositionPnl = allPnls.length > 0 ? allPnls.reduce((s, v) => s + v, 0) / allPnls.length : 0;
    const medianPositionPnl = median(allPnls);

    const sortedByPnl = [...resolvedWithPnl].sort((a, b) => b.cashPnl - a.cashPnl);
    const largestWin = sortedByPnl.length > 0 && sortedByPnl[0].cashPnl > 0
        ? { pnl: sortedByPnl[0].cashPnl, title: sortedByPnl[0].title || 'Unknown' }
        : { pnl: 0, title: 'N/A' };
    const largestLoss = sortedByPnl.length > 0 && sortedByPnl[sortedByPnl.length - 1].cashPnl < 0
        ? { pnl: sortedByPnl[sortedByPnl.length - 1].cashPnl, title: sortedByPnl[sortedByPnl.length - 1].title || 'Unknown' }
        : { pnl: 0, title: 'N/A' };

    const totalCurrentValue = positions.reduce((s, p) => s + (p.currentValue || 0), 0);
    const totalInitialValue = positions.reduce((s, p) => s + (p.initialValue || 0), 0);

    // Concentration risk
    const maxPositionValue = positions.length > 0
        ? Math.max(...positions.map((p) => Math.abs(p.currentValue || 0)))
        : 0;
    const concentrationRisk = totalCurrentValue > 0 ? (maxPositionValue / totalCurrentValue) * 100 : 0;

    // 4. Trade-level analysis
    const tradeHistoryTruncated = trades.length >= MAX_TRADE_PAGES * BATCH_SIZE;
    const tradeSizes = trades.map((t) => t.usdcSize).filter((s) => s > 0);
    const avgTradeSize = tradeSizes.length > 0 ? tradeSizes.reduce((s, v) => s + v, 0) / tradeSizes.length : 0;
    const medianTradeSize = median(tradeSizes);

    const oldestTs = trades.length > 0 ? trades[0].timestamp : 0;
    const newestTs = trades.length > 0 ? trades[trades.length - 1].timestamp : 0;
    const daysActive = oldestTs > 0 && newestTs > 0 ? Math.max(1, (newestTs - oldestTs) / 86400) : 0;

    // Trades per day -- if truncated, estimate from volume instead
    let tradesPerDay: number;
    let tradesPerDayNote: string;
    if (tradeHistoryTruncated) {
        // Trade history only covers recent window; use avg trade size + monthly volume for estimate
        if (avgTradeSize > 0 && leaderboard.month.vol > 0) {
            const estMonthlyTrades = leaderboard.month.vol / avgTradeSize;
            tradesPerDay = estMonthlyTrades / 30;
            tradesPerDayNote = `estimated from monthly volume (trade history truncated at ${trades.length} trades spanning ${daysActive.toFixed(1)} days)`;
        } else {
            tradesPerDay = daysActive > 0 ? trades.length / daysActive : 0;
            tradesPerDayNote = `from truncated history (${trades.length} trades in ${daysActive.toFixed(1)} days)`;
        }
    } else {
        tradesPerDay = daysActive > 0 ? trades.length / daysActive : 0;
        tradesPerDayNote = `from full trade history (${trades.length} trades in ${daysActive.toFixed(0)} days)`;
    }

    // 5. Market categories
    const marketCategories: Record<string, number> = {};
    for (const t of trades) {
        const cat = categorizeMarket(t.title || t.slug || '');
        marketCategories[cat] = (marketCategories[cat] || 0) + 1;
    }

    // 6. Strategy inference
    const { type: strategyType, latency: latencySensitivity } = inferStrategy(trades, positions);

    // 7. Drawdown estimate
    const { maxDrawdown, maxDrawdownPercent, note: maxDrawdownNote } = estimateMaxDrawdown(trades, leaderboard.all.pnl);

    // 8. Estimated starting balance
    // This is inherently unreliable from API data alone because:
    //   - We can't see withdrawals or deposits
    //   - /positions only shows currently-held positions
    //   - Redeemed positions disappear from the API
    // Best we can do: portfolio - allTimePnl = minimum starting capital IF no withdrawals.
    // Also show max single position as a floor for capital deployed.
    const maxSinglePosition = positions.length > 0
        ? Math.max(...positions.map((p) => p.initialValue || 0))
        : 0;

    let estimatedStartingBalance: number;
    let estimatedStartingBalanceNote: string;

    const naiveEstimate = portfolioValue - leaderboard.all.pnl;
    if (naiveEstimate > 0) {
        estimatedStartingBalance = naiveEstimate;
        estimatedStartingBalanceNote = `portfolio (${usd(portfolioValue)}) minus all-time PnL (${usd(leaderboard.all.pnl)}). Assumes no withdrawals; actual may be higher.`;
    } else {
        // PnL exceeds portfolio -- they've withdrawn profits
        estimatedStartingBalance = maxSinglePosition;
        estimatedStartingBalanceNote = `unknown (PnL exceeds current portfolio, implying withdrawals). Floor from max position size: ${usd(maxSinglePosition)}`;
    }

    // 9. Copy trading projections
    const monthlyPnl = leaderboard.month.pnl;
    const monthlyVol = leaderboard.month.vol;
    const monthlyReturnRate = monthlyVol > 0 ? monthlyPnl / monthlyVol : 0;

    const copyProjections = [500, 1000, 5000, 10000].map((capital) => ({
        capital,
        monthlyEstimate: capital * monthlyReturnRate,
        dailyEstimate: (capital * monthlyReturnRate) / 30,
    }));

    return {
        username,
        address,
        profileUrl: `https://polymarket.com/profile/${address}`,
        portfolioValue,
        activePositions: positions.length,
        activePositions_unresolved: unresolvedPositions.length,
        resolvedPositions: resolvedPositions.length,
        totalCurrentValue,
        totalInitialValue,
        leaderboard,
        winRate,
        winRateBasis,
        profitFactor,
        avgPositionPnl,
        medianPositionPnl,
        largestWin,
        largestLoss,
        concentrationRisk,
        totalTradesFetched: trades.length,
        tradeHistoryTruncated,
        avgTradeSize,
        medianTradeSize,
        tradesPerDay,
        tradesPerDayNote,
        oldestTradeTimestamp: oldestTs,
        newestTradeTimestamp: newestTs,
        daysActive,
        strategyType,
        latencySensitivity,
        marketCategories,
        maxDrawdownEstimate: maxDrawdown,
        maxDrawdownPercent,
        maxDrawdownNote,
        estimatedStartingBalance,
        estimatedStartingBalanceNote,
        copyProjections,
        analyzedAt: new Date().toISOString(),
        errors,
    };
}

// ─── Console Output ──────────────────────────────────────────────────────────

function printReport(report: TraderReport): void {
    const name = report.username || report.address.slice(0, 10) + '...' + report.address.slice(-6);

    console.log('\n' + c.cyan(LINE));
    console.log(c.cyan(`  TRADER ANALYSIS: ${c.bold(name)}`));
    console.log(c.cyan(LINE));

    // ── Identity ──
    console.log(`\n  ${c.bold('Profile')}`);
    console.log(`  ${c.gray('Username:')}    ${report.username || c.dim('(none)')}`);
    console.log(`  ${c.gray('Address:')}     ${report.address}`);
    console.log(`  ${c.gray('Profile:')}     ${report.profileUrl}`);

    // ── Portfolio ──
    console.log(`\n  ${c.bold('Portfolio Snapshot')}`);
    console.log(`  ${c.gray('Positions Value:')}  ${c.cyan(usd(report.portfolioValue))}`);
    console.log(`  ${c.gray('Positions:')}        ${report.activePositions} total (${report.resolvedPositions} resolved, ${report.activePositions_unresolved} active)`);
    console.log(`  ${c.gray('Current Value:')}    ${usd(report.totalCurrentValue)}`);
    console.log(`  ${c.gray('Initial Value:')}    ${usd(report.totalInitialValue)}`);
    console.log(`  ${c.gray('Est. Starting Bal:')} ${usd(report.estimatedStartingBalance)}`);
    console.log(`  ${c.dim(`                    ${report.estimatedStartingBalanceNote}`)}`);

    // ── Leaderboard ──
    console.log(`\n  ${c.bold('PnL / Volume by Time Period')}`);
    console.log(`  ${'Period'.padEnd(10)} ${'PnL'.padStart(18)} ${'Volume'.padStart(18)} ${'Rank'.padStart(8)}`);
    console.log(`  ${THIN_LINE.slice(0, 56)}`);
    for (const [label, key] of [['Day', 'day'], ['Week', 'week'], ['Month', 'month'], ['All-time', 'all']] as const) {
        const s = report.leaderboard[key];
        const rankStr = s.rank ? `#${s.rank}` : c.dim('--');
        console.log(`  ${label.padEnd(10)} ${pnl(s.pnl).padStart(30)} ${usd(s.vol).padStart(18)} ${rankStr.padStart(12)}`);
    }

    // ── Risk Metrics ──
    console.log(`\n  ${c.bold('Risk Metrics')}`);
    console.log(`  ${c.gray('Win Rate:')}          ${pct(report.winRate)}`);
    console.log(`  ${c.dim(`                    ${report.winRateBasis}`)}`);
    console.log(`  ${c.dim('                    Note: /positions only shows held positions; redeemed wins may be missing')}`);
    console.log(`  ${c.gray('Profit Factor:')}     ${report.profitFactor === Infinity ? c.green('∞') : report.profitFactor.toFixed(2)} ${c.dim('(wins $ / losses $ from resolved positions)')}`);
    console.log(`  ${c.gray('Avg Position PnL:')}  ${pnl(report.avgPositionPnl)} ${c.dim('(resolved only)')}`);
    console.log(`  ${c.gray('Med Position PnL:')}  ${pnl(report.medianPositionPnl)}`);
    console.log(`  ${c.gray('Largest Win:')}       ${pnl(report.largestWin.pnl)} ${c.dim('- ' + report.largestWin.title.slice(0, 50))}`);
    console.log(`  ${c.gray('Largest Loss:')}      ${pnl(report.largestLoss.pnl)} ${c.dim('- ' + report.largestLoss.title.slice(0, 50))}`);
    console.log(`  ${c.gray('Max Drawdown:')}      ${c.red(usd(report.maxDrawdownEstimate))} ${c.dim(`(${report.maxDrawdownPercent.toFixed(1)}% from peak)`)}`);
    console.log(`  ${c.dim(`                    ${report.maxDrawdownNote}`)}`);
    console.log(`  ${c.gray('Concentration:')}     ${report.concentrationRisk.toFixed(1)}% ${c.dim('(largest position as % of portfolio)')}`);

    // ── Trading Activity ──
    console.log(`\n  ${c.bold('Trading Activity')}`);
    console.log(`  ${c.gray('Trades Fetched:')}    ${report.totalTradesFetched}${report.tradeHistoryTruncated ? c.yellow(' (TRUNCATED -- hit API limit)') : ''}`);
    console.log(`  ${c.gray('Avg Trade Size:')}    ${usd(report.avgTradeSize)}`);
    console.log(`  ${c.gray('Med Trade Size:')}    ${usd(report.medianTradeSize)}`);
    console.log(`  ${c.gray('Trades/Day:')}        ${report.tradesPerDay.toFixed(1)}`);
    console.log(`  ${c.dim(`                    ${report.tradesPerDayNote}`)}`);
    if (report.oldestTradeTimestamp > 0) {
        console.log(`  ${c.gray('Trade Window:')}      ${new Date(report.oldestTradeTimestamp * 1000).toLocaleDateString()} - ${new Date(report.newestTradeTimestamp * 1000).toLocaleDateString()}`);
    }

    // ── Market Categories ──
    console.log(`\n  ${c.bold('Market Categories')}`);
    const sortedCats = Object.entries(report.marketCategories).sort((a, b) => b[1] - a[1]);
    for (const [cat, count] of sortedCats) {
        const pctOfTotal = ((count / report.totalTradesFetched) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(Number(pctOfTotal) / 3));
        console.log(`  ${cat.padEnd(12)} ${String(count).padStart(5)} (${pctOfTotal.padStart(5)}%) ${c.cyan(bar)}`);
    }

    // ── Strategy Assessment ──
    console.log(`\n  ${c.bold('Strategy Assessment')}`);
    const typeLabel: Record<string, string> = {
        directional: c.green('Directional'),
        arb_suspected: c.yellow('Arbitrage (suspected)'),
        market_making_suspected: c.yellow('Market Making (suspected)'),
        mixed: c.yellow('Mixed'),
        unknown: c.dim('Unknown'),
    };
    const latencyLabel: Record<string, string> = {
        LOW: c.green('LOW'),
        MEDIUM: c.yellow('MEDIUM'),
        HIGH: c.red('HIGH'),
    };
    console.log(`  ${c.gray('Strategy Type:')}     ${typeLabel[report.strategyType]}`);
    console.log(`  ${c.gray('Latency Sens.:')}     ${latencyLabel[report.latencySensitivity]}`);

    const suitability = report.strategyType === 'directional' && report.latencySensitivity !== 'HIGH'
        ? c.green('GOOD')
        : report.strategyType === 'arb_suspected'
            ? c.red('POOR (arb edge not copyable)')
            : report.latencySensitivity === 'HIGH'
                ? c.yellow('RISKY (latency-dependent)')
                : c.yellow('MODERATE');
    console.log(`  ${c.gray('Copy Suitability:')}  ${suitability}`);

    // ── Copy Projections ──
    if (report.leaderboard.month.vol > 0) {
        console.log(`\n  ${c.bold('Copy Trading Projections')} ${c.dim('(based on monthly return rate)')}`);
        const returnRate = report.leaderboard.month.vol > 0
            ? (report.leaderboard.month.pnl / report.leaderboard.month.vol) * 100
            : 0;
        console.log(`  ${c.gray('Monthly return on volume:')} ${pct(returnRate)}\n`);
        console.log(`  ${'Capital'.padEnd(12)} ${'Est. Monthly'.padStart(14)} ${'Est. Daily'.padStart(14)}`);
        console.log(`  ${THIN_LINE.slice(0, 42)}`);
        for (const proj of report.copyProjections) {
            console.log(`  ${usd(proj.capital).padEnd(12)} ${pnl(proj.monthlyEstimate).padStart(26)} ${pnl(proj.dailyEstimate).padStart(26)}`);
        }
        console.log(`\n  ${c.dim('  * Projections assume you could replicate their volume-to-PnL ratio.')}`);
        console.log(`  ${c.dim('  * Actual results depend on execution timing, slippage, and fees.')}`);
    }

    // ── Errors ──
    if (report.errors.length > 0) {
        console.log(`\n  ${c.yellow('Warnings:')}`);
        for (const err of report.errors) {
            console.log(`  ${c.yellow('!')} ${err}`);
        }
    }

    console.log('\n' + c.cyan(LINE) + '\n');
}

// ─── Save Results ────────────────────────────────────────────────────────────

function saveReports(reports: TraderReport[]): string {
    const resultsDir = path.join(process.cwd(), 'trader_analysis_results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `trader_analysis_${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(reports, null, 2), 'utf8');
    return filepath;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.log(c.cyan(`\n${LINE}`));
    console.log(c.cyan('  POLYMARKET TRADER ANALYZER'));
    console.log(c.cyan(LINE) + '\n');

    // Parse trader list from CLI args or env
    let traderInputs: string[] = [];

    // Check CLI args: --traders "a,b,c"
    const args = process.argv.slice(2);
    const tradersArgIdx = args.indexOf('--traders');
    if (tradersArgIdx !== -1 && args[tradersArgIdx + 1]) {
        traderInputs = args[tradersArgIdx + 1].split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Fallback to env
    if (traderInputs.length === 0 && process.env.ANALYZE_TRADERS) {
        traderInputs = process.env.ANALYZE_TRADERS.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Fallback to positional args
    if (traderInputs.length === 0) {
        traderInputs = args.filter((a) => !a.startsWith('--')).flatMap((a) => a.split(',').map((t) => t.trim())).filter(Boolean);
    }

    if (traderInputs.length === 0) {
        console.log(c.yellow('Usage:'));
        console.log(c.gray('  npx ts-node src/scripts/analyzeTrader.ts --traders "ilovecircle,DrPufferfish"'));
        console.log(c.gray('  npx ts-node src/scripts/analyzeTrader.ts ilovecircle DrPufferfish'));
        console.log(c.gray('  ANALYZE_TRADERS="ilovecircle" npm run analyze-trader'));
        console.log(c.gray('  npm run analyze-trader -- --traders "0xdb27bf2ac5d428a9c63dbc914611036855a6c56e"'));
        process.exit(1);
    }

    console.log(c.cyan(`Analyzing ${traderInputs.length} trader(s): ${traderInputs.join(', ')}\n`));

    const reports: TraderReport[] = [];

    for (let i = 0; i < traderInputs.length; i++) {
        const input = traderInputs[i];
        console.log(c.bold(`[${i + 1}/${traderInputs.length}] Analyzing ${input}...`));

        try {
            const report = await analyzeTrader(input);
            reports.push(report);
            printReport(report);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.log(c.red(`  Error analyzing ${input}: ${msg}\n`));
        }

        // Delay between traders to be nice to the API
        if (i < traderInputs.length - 1) {
            await sleep(1000);
        }
    }

    // Summary comparison if multiple traders
    if (reports.length > 1) {
        console.log(c.cyan(LINE));
        console.log(c.cyan('  COMPARISON SUMMARY'));
        console.log(c.cyan(LINE) + '\n');

        console.log(`  ${'Trader'.padEnd(20)} ${'Month PnL'.padStart(14)} ${'All PnL'.padStart(14)} ${'Win%'.padStart(7)} ${'PF'.padStart(6)} ${'Strategy'.padStart(16)} ${'Copy?'.padStart(10)}`);
        console.log(`  ${THIN_LINE}`);

        for (const r of reports) {
            const name = (r.username || r.address.slice(0, 10) + '...').padEnd(20);
            const suit = r.strategyType === 'directional' && r.latencySensitivity !== 'HIGH' ? c.green('GOOD') :
                r.strategyType === 'arb_suspected' ? c.red('POOR') : c.yellow('RISK');

            console.log(`  ${name} ${pnl(r.leaderboard.month.pnl).padStart(26)} ${pnl(r.leaderboard.all.pnl).padStart(26)} ${r.winRate.toFixed(1).padStart(7)} ${(r.profitFactor === Infinity ? '∞' : r.profitFactor.toFixed(1)).padStart(6)} ${r.strategyType.padStart(16)} ${suit.padStart(14)}`);
        }
        console.log('');
    }

    // Save
    if (reports.length > 0) {
        const filepath = saveReports(reports);
        console.log(c.green(`Results saved to: ${filepath}\n`));
    }
}

main().catch((err) => {
    console.error(c.red('Fatal error:'), err);
    process.exit(1);
});
