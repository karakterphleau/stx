import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for live market quotes (3 second TTL to prevent upstream throttling)
const cache = new Map<string, { data: any; expiry: number }>();

async function fetchRealtimeQuote(symbol: string) {
  const cached = cache.get(symbol);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=15m&range=1d`;
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
    const previousClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = Number((price - previousClose).toFixed(2));
    const changePercent = meta.regularMarketChangePercent !== undefined 
      ? Number(meta.regularMarketChangePercent.toFixed(2)) 
      : Number(((change / previousClose) * 100).toFixed(2));
    const closes: number[] = quotes?.close 
      ? quotes.close.filter((c: any) => typeof c === 'number' && !isNaN(c)).slice(-14)
      : [price];

    const opens: number[] = quotes?.open
      ? quotes.open.filter((o: any) => typeof o === 'number' && !isNaN(o))
      : [];
    const open = opens.length > 0 ? Number(opens[0].toFixed(2)) : Number(previousClose.toFixed(2));

    const maxClose = closes.length > 0 ? Math.max(...closes) : price;
    const minClose = closes.length > 0 ? Math.min(...closes) : price;
    const high = meta.regularMarketDayHigh !== undefined && meta.regularMarketDayHigh !== null
      ? Number(meta.regularMarketDayHigh.toFixed(2))
      : Number(Math.max(price, maxClose).toFixed(2));
    const low = meta.regularMarketDayLow !== undefined && meta.regularMarketDayLow !== null
      ? Number(meta.regularMarketDayLow.toFixed(2))
      : Number(Math.min(price, minClose).toFixed(2));
    const volume = meta.regularMarketVolume || 0;

    const result = {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || symbol,
      price: Number(price.toFixed(2)),
      open,
      high,
      low,
      previousClose: Number(previousClose.toFixed(2)),
      change,
      changePercent,
      volume,
      currency: meta.currency || 'USD',
      exchangeName: meta.exchangeName || meta.fullExchangeName || 'US Exchange',
      sparkline: closes.length > 0 ? closes.map((c: number) => Number(c.toFixed(2))) : [price],
      timestamp: new Date(meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()).toISOString(),
      isRealtime: true,
    };

    cache.set(symbol, { data: result, expiry: now + 3500 }); // 3.5s cache for real-time freshness
    return result;
  } catch (err) {
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

          // Fetch quotes in parallel
          const quotes = await Promise.all(symbolsToFetch.map(s => fetchRealtimeQuote(s)));
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
