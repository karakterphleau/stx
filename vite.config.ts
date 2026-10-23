import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for live market quotes (3 second TTL to prevent upstream throttling)
const cache = new Map<string, { data: any; expiry: number }>();

async function fetchRealtimeQuote(symbol: string, period: 'day' | 'week' | 'month' = 'day') {
  const cacheKey = `${symbol}:${period}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  try {
    // interval and range mapping for day / week / month
    let range = '1d';
    let interval = '15m';
    if (period === 'week') {
      range = '5d';
      interval = '1h';
    } else if (period === 'month') {
      range = '1mo';
      interval = '1d';
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data: any = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];

    if (!meta || meta.regularMarketPrice === undefined) {
      return null;
    }

    const price = meta.regularMarketPrice;
    
    // For day, chartPreviousClose or previousClose is used.
    // For week / month, period initial base is the first valid open/close in the historical series
    const closes: number[] = quotes?.close 
      ? quotes.close.filter((c: any) => typeof c === 'number' && !isNaN(c))
      : [price];
    const opens: number[] = quotes?.open
      ? quotes.open.filter((o: any) => typeof o === 'number' && !isNaN(o))
      : [];
    const highs: number[] = quotes?.high
      ? quotes.high.filter((h: any) => typeof h === 'number' && !isNaN(h))
      : [];
    const lows: number[] = quotes?.low
      ? quotes.low.filter((l: any) => typeof l === 'number' && !isNaN(l))
      : [];

    let periodBasePrice = meta.chartPreviousClose || meta.previousClose || price;
    if (period === 'week' && opens.length > 0) {
      periodBasePrice = opens[0];
    } else if (period === 'month' && opens.length > 0) {
      periodBasePrice = opens[0];
    }

    const change = Number((price - periodBasePrice).toFixed(2));
    const changePercent = periodBasePrice > 0
      ? Number(((change / periodBasePrice) * 100).toFixed(2))
      : 0;

    const sparkline = closes.length > 0 ? closes.slice(-20).map((c: number) => Number(c.toFixed(2))) : [price];

    const high = highs.length > 0
      ? Number(Math.max(...highs, price).toFixed(2))
      : (meta.regularMarketDayHigh !== undefined ? Number(meta.regularMarketDayHigh.toFixed(2)) : price);
    const low = lows.length > 0
      ? Number(Math.min(...lows, price).toFixed(2))
      : (meta.regularMarketDayLow !== undefined ? Number(meta.regularMarketDayLow.toFixed(2)) : price);

    const open = opens.length > 0 ? Number(opens[0].toFixed(2)) : Number(periodBasePrice.toFixed(2));
    const volume = meta.regularMarketVolume || (quotes?.volume ? quotes.volume.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) : 0);

    const result = {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || symbol,
      price: Number(price.toFixed(2)),
      open,
      high,
      low,
      previousClose: Number(periodBasePrice.toFixed(2)),
      periodBasePrice: Number(periodBasePrice.toFixed(2)),
      change,
      changePercent,
      volume,
      period,
      currency: meta.currency || 'USD',
      exchangeName: meta.exchangeName || meta.fullExchangeName || 'US Exchange',
      sparkline: sparkline.length > 0 ? sparkline : [price],
      timestamp: new Date(meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()).toISOString(),
      isRealtime: true,
    };

    cache.set(cacheKey, { data: result, expiry: now + 3500 }); // 3.5s cache for real-time freshness
    return result;
  } catch (err) {
    return null;
  }
}

const allMarketCache = new Map<string, { data: any; expiry: number }>();

async function fetchAllMarketScreenerQuotes(period: 'day' | 'week' | 'month' = 'day') {
  const cacheKey = `all_market:${period}`;
  const now = Date.now();
  const cached = allMarketCache.get(cacheKey);
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  try {
    const scrIds = [
      'day_gainers',
      'day_losers',
      'most_actives',
      'growth_technology_stocks',
      'small_cap_gainers',
    ];

    // High nominal price equities that produce the market's highest dollar amount gains and drops ($ gains / $ drops)
    const highDollarLeaders = [
      'NVR', 'AZO', 'SEB', 'FCNCA', 'MKL', 'BKNG', 'TDG', 'FICO', 'GWW', 'FIX',
      'REGN', 'NOW', 'EQIX', 'COST', 'LLY', 'BLK', 'URI', 'NFLX', 'LRCX', 'KLAC',
      'MPWR', 'ASML', 'PH', 'MCK', 'SNPS', 'ISRG', 'DE', 'LIN', 'UNH', 'SPGI'
    ];

    const chartRange = period === 'month' ? '1mo' : period === 'week' ? '5d' : '1d';
    const chartInterval = period === 'month' ? '1d' : period === 'week' ? '1d' : '15m';

    const [screenerResponses, highDollarResponses] = await Promise.all([
      Promise.all(
        scrIds.map(id =>
          fetch(
            `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${id}&count=50`,
            { headers }
          )
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      ),
      Promise.all(
        highDollarLeaders.map(s =>
          fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=${chartRange}&interval=${chartInterval}`,
            { headers }
          )
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      ),
    ]);

    const uniqueQuotesMap = new Map<string, any>();

    // Ingest screener quotes across day gainers, losers, actives, growth, small caps
    for (const json of screenerResponses) {
      const quotes = json?.finance?.result?.[0]?.quotes || [];
      for (const q of quotes) {
        if (q && q.symbol && !uniqueQuotesMap.has(q.symbol)) {
          uniqueQuotesMap.set(q.symbol, q);
        }
      }
    }

    // Ingest high-dollar nominal stocks (guaranteeing NVR, AZO, FIX, etc. are always present)
    highDollarLeaders.forEach((sym, idx) => {
      const chartJson = highDollarResponses[idx];
      const meta = chartJson?.chart?.result?.[0]?.meta;
      const quotes = chartJson?.chart?.result?.[0]?.indicators?.quote?.[0];

      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const closes: number[] = quotes?.close
          ? quotes.close.filter((c: any) => typeof c === 'number' && !isNaN(c))
          : [price];
        const opens: number[] = quotes?.open
          ? quotes.open.filter((o: any) => typeof o === 'number' && !isNaN(o))
          : [];

        let periodBasePrice = meta.chartPreviousClose || meta.previousClose || price;
        if ((period === 'week' || period === 'month') && opens.length > 0) {
          periodBasePrice = opens[0];
        }

        const change = Number((price - periodBasePrice).toFixed(2));
        const changePercent = periodBasePrice > 0
          ? Number(((change / periodBasePrice) * 100).toFixed(2))
          : 0;

        uniqueQuotesMap.set(sym, {
          symbol: sym,
          name: meta.shortName || meta.longName || sym,
          price: Number(price.toFixed(2)),
          open: opens.length > 0 ? Number(opens[0].toFixed(2)) : Number(periodBasePrice.toFixed(2)),
          high: meta.regularMarketDayHigh ? Number(meta.regularMarketDayHigh.toFixed(2)) : price,
          low: meta.regularMarketDayLow ? Number(meta.regularMarketDayLow.toFixed(2)) : price,
          previousClose: Number(periodBasePrice.toFixed(2)),
          change,
          changePercent,
          volume: meta.regularMarketVolume || 100000,
          period,
          exchangeName: meta.fullExchangeName || meta.exchangeName || 'NYSE / NASDAQ',
          sparkline: closes.length > 2 ? closes.slice(-20) : [periodBasePrice, price],
          timestamp: new Date().toISOString(),
          isRealtime: true,
        });
      }
    });

    let finalQuotes: any[] = [];

    if (period === 'day') {
      finalQuotes = Array.from(uniqueQuotesMap.values()).map(q => {
        const price = typeof q.price === 'number' ? q.price : (typeof q.regularMarketPrice === 'number' ? q.regularMarketPrice : 0);
        const prevClose = typeof q.previousClose === 'number' ? q.previousClose : (typeof q.regularMarketPreviousClose === 'number' ? q.regularMarketPreviousClose : price);
        const change = typeof q.change === 'number'
          ? q.change
          : (typeof q.regularMarketChange === 'number' ? q.regularMarketChange : Number((price - prevClose).toFixed(2)));
        const changePercent = typeof q.changePercent === 'number'
          ? q.changePercent
          : (typeof q.regularMarketChangePercent === 'number'
            ? q.regularMarketChangePercent
            : (prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0));

        const high = typeof q.high === 'number' ? q.high : (typeof q.regularMarketDayHigh === 'number' ? q.regularMarketDayHigh : price);
        const low = typeof q.low === 'number' ? q.low : (typeof q.regularMarketDayLow === 'number' ? q.regularMarketDayLow : price);
        const open = typeof q.open === 'number' ? q.open : (typeof q.regularMarketOpen === 'number' ? q.regularMarketOpen : prevClose);
        const volume = typeof q.volume === 'number' ? q.volume : (typeof q.regularMarketVolume === 'number' ? q.regularMarketVolume : 1000000);

        return {
          symbol: q.symbol,
          name: q.name || q.shortName || q.longName || q.displayName || q.symbol,
          price: Number(price.toFixed(2)),
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          previousClose: Number(prevClose.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          volume,
          period: 'day',
          exchangeName: q.exchangeName || q.fullExchangeName || q.exchange || 'US Market',
          sparkline: q.sparkline || [prevClose, price],
          timestamp: new Date().toISOString(),
          isRealtime: true,
        };
      });
    } else {
      // For week or month, resolve period-adjusted quotes
      const allSymbols = Array.from(uniqueQuotesMap.keys());
      const periodQuotes = await Promise.all(allSymbols.map(s => fetchRealtimeQuote(s, period)));
      finalQuotes = periodQuotes.filter(Boolean);
    }

    const payload = {
      success: true,
      source: 'ALL_MARKET_SCREENER_LIVE',
      marketScope: 'Entire US Stock Market (NYSE / NASDAQ / AMEX)',
      timestamp: new Date().toISOString(),
      count: finalQuotes.length,
      quotes: finalQuotes,
      period,
    };

    allMarketCache.set(cacheKey, { data: payload, expiry: now + 60000 }); // 60-second cache
    return payload;
  } catch (err: any) {
    console.error('Error fetching all-market screener:', err);
    if (cached) return cached.data;
    return null;
  }
}

function realtimeMarketDataPlugin(): Plugin {
  return {
    name: 'realtime-market-data-proxy',
    configureServer(server) {
      server.middlewares.use('/api/live-market', async (req, res) => {
        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const type = url.searchParams.get('type') || 'stocks';
          const symbolsParam = url.searchParams.get('symbols');
          const rawPeriod = url.searchParams.get('period') || 'day';
          const period: 'day' | 'week' | 'month' = (rawPeriod === 'week' || rawPeriod === 'month') ? rawPeriod : 'day';

          // Handle ALL_MARKET / MOVERS request covering the entire market
          if (type === 'all_market' || type === 'movers') {
            const allMarketData = await fetchAllMarketScreenerQuotes(period);
            if (allMarketData && allMarketData.quotes && allMarketData.quotes.length > 0) {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify(allMarketData));
              return;
            }
          }

          let symbolsToFetch: string[] = [];

          if (symbolsParam) {
            symbolsToFetch = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          } else if (type === 'commodities') {
            symbolsToFetch = [
              'CL=F', 'BZ=F', 'NG=F', 'HO=F', 'RB=F',
              'GC=F', 'SI=F', 'PL=F', 'PA=F',
              'HG=F', 'ALI=F', 'NI=F',
              'CC=F', 'KC=F', 'ZC=F', 'ZS=F', 'ZW=F', 'SB=F'
            ];
          } else {
            // Default volatile stock universe
            symbolsToFetch = [
              'NVDA', 'TSLA', 'MSTR', 'COIN', 'SMCI', 'PLTR', 'AMD',
              'GME', 'DJT', 'IONQ', 'RKLB', 'MARA', 'RIOT', 'TQQQ',
              'SOXL', 'ARM', 'INTC', 'SOFI', 'HOOD', 'UPST', 'AFRM',
              'LUNR', 'ASTS', 'AAPL', 'MSFT', 'SPY', 'QQQ'
            ];
          }

          // Fetch quotes in parallel with chosen period
          const quotes = await Promise.all(symbolsToFetch.map(s => fetchRealtimeQuote(s, period)));
          const validQuotes = quotes.filter(Boolean);

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({
            success: true,
            source: 'EXCHANGE_LIVE_FEED',
            timestamp: new Date().toISOString(),
            count: validQuotes.length,
            quotes: validQuotes,
          }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), realtimeMarketDataPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
