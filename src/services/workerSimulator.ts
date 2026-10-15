import { kvNamespaceInstance } from './kvStore';
import { scanMarketUniverse, VolatilityScanResult, StockQuote } from './marketScanner';
import { scanCommoditiesUniverse, CommodityScanResult, CommodityQuote } from './commodityScanner';
import { scanAllMarketUniverse, AllMarketScanResult } from './allMarketScanner';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'CRON' | 'HTTP' | 'KV_PUT' | 'KV_GET' | 'WEBHOOK' | 'INFO' | 'WARN';
  message: string;
  details?: any;
}

export interface WebhookAlert {
  id: string;
  timestamp: string;
  ticker: string;
  spreadPercent: number;
  changePercent: number;
  score: number;
  payload: any;
}

class WorkerSimulatorEngine {
  private logs: LogEntry[] = [];
  private logListeners: Set<() => void> = new Set();
  private webhookAlerts: WebhookAlert[] = [];
  private webhookListeners: Set<() => void> = new Set();
  private isScanning = false;
  private autoCronInterval: number | null = null;
  private cronFrequencySeconds = 15;
  private customTickers: string[] = [];

  constructor() {
    this.addLog('INFO', 'Cloudflare Worker runtime initialized. KV Namespace "STOCKS_KV" bound.');
  }

  public subscribeLogs(fn: () => void): () => void {
    this.logListeners.add(fn);
    return () => this.logListeners.delete(fn);
  }

  public subscribeWebhooks(fn: () => void): () => void {
    this.webhookListeners.add(fn);
    return () => this.webhookListeners.delete(fn);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public getWebhooks(): WebhookAlert[] {
    return [...this.webhookAlerts];
  }

  public clearLogs() {
    this.logs = [];
    this.logListeners.forEach(fn => fn());
  }

  private addLog(type: LogEntry['type'], message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 200) this.logs.pop();
    this.logListeners.forEach(fn => fn());
  }

  public setCustomTickers(tickers: string[]) {
    this.customTickers = tickers;
  }

  public getCustomTickers(): string[] {
    return this.customTickers;
  }

  /**
   * Emulates: scheduled(controller, env, ctx)
   */
  public async triggerScheduledCron(period: 'day' | 'week' | 'month' = 'day'): Promise<VolatilityScanResult | null> {
    if (this.isScanning) {
      this.addLog('WARN', '[CRON] Scheduled event skipped: concurrent scan already running.');
      return null;
    }

    this.isScanning = true;
    const nowIso = new Date().toISOString();
    this.addLog('CRON', `[CRON] Scheduled cron trigger fired at ${nowIso} ("*/5 13-20 * * 1-5") [Period: ${period.toUpperCase()}]`);

    try {
      const scanResult = await scanMarketUniverse(this.customTickers, period);

      // Persist to KV
      await this.persistScanToKV(scanResult);

      this.addLog('CRON', `[CRON] Scan completed in ${scanResult.executionDurationMs}ms (${period.toUpperCase()}). Market: ${scanResult.marketStatus}. Top Volatile: ${scanResult.highestVolatile?.symbol} (${scanResult.highestVolatile?.intradaySpreadPercent}% spread).`);

      // Check for extreme alerts (> 8% intraday spread)
      const extreme = scanResult.topVolatileStocks.filter(s => s.intradaySpreadPercent >= 8 || s.volatilityScore >= 70);
      if (extreme.length > 0) {
        this.dispatchSimulatedWebhooks(extreme, scanResult);
      }

      return scanResult;
    } catch (err: any) {
      this.addLog('WARN', `[CRON ERROR] Volatility scan failed: ${err?.message || err}`);
      return null;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Persists results into KV following the exact schema
   */
  private async persistScanToKV(result: VolatilityScanResult) {
    const payload = JSON.stringify(result);
    const byteSize = new Blob([payload]).size;

    // 1. Put latest_volatile_stocks
    await kvNamespaceInstance.put('latest_volatile_stocks', payload, {
      metadata: {
        timestamp: result.timestamp,
        highestTicker: result.highestVolatile?.symbol,
        topCount: result.topVolatileStocks.length,
        period: result.period,
      },
    });
    this.addLog('KV_PUT', `KV.put("latest_volatile_stocks", [Payload: ${(byteSize / 1024).toFixed(1)} KB, Period: ${result.period}])`);

    // 2. Put history:<timestamp> (with 7-day TTL = 604800s)
    const unixTimestamp = new Date(result.timestamp).getTime();
    const historyKey = `history:${unixTimestamp}`;
    await kvNamespaceInstance.put(historyKey, payload, {
      expirationTtl: 604800,
      metadata: {
        scanId: result.scanId,
        topSymbol: result.highestVolatile?.symbol,
        spread: result.highestVolatile?.intradaySpreadPercent,
        period: result.period,
      },
    });
    this.addLog('KV_PUT', `KV.put("${historyKey}", [TTL: 7d / 604,800s])`);

    // 3. Put individual ticker fast-lookups (top 5)
    for (const stock of result.topVolatileStocks.slice(0, 5)) {
      const tickerKey = `ticker:${stock.symbol}:latest`;
      await kvNamespaceInstance.put(tickerKey, JSON.stringify(stock), {
        expirationTtl: 86400,
      });
    }
    this.addLog('KV_PUT', `KV.put(ticker:<SYMBOL>:latest for top 5 tickers)`);

    // 4. Put scan_metadata
    await kvNamespaceInstance.put('scan_metadata', JSON.stringify({
      lastScanAt: result.timestamp,
      scanId: result.scanId,
      scannedTickers: result.scannedCount,
      executionDurationMs: result.executionDurationMs,
      marketSession: result.marketStatus,
      period: result.period,
      topMover: result.highestVolatile ? {
        symbol: result.highestVolatile.symbol,
        spreadPct: result.highestVolatile.intradaySpreadPercent,
        score: result.highestVolatile.volatilityScore,
      } : null,
    }));
  }

  /**
   * Run Commodities Volatility Scan and persist to KV
   */
  public async triggerCommoditiesScan(period: 'day' | 'week' | 'month' = 'day'): Promise<CommodityScanResult | null> {
    try {
      this.addLog('CRON', `[CRON] Scanning global commodities universe (Energy, Metals, Agriculture) [Period: ${period.toUpperCase()}]...`);
      const result = await scanCommoditiesUniverse(period);
      await this.persistCommoditiesToKV(result);
      this.addLog('CRON', `[CRON] Commodities scan completed (${period.toUpperCase()}). Top Mover: ${result.highestVolatile?.name} (${result.highestVolatile?.intradaySpreadPercent}% spread).`);
      return result;
    } catch (err: any) {
      this.addLog('WARN', `[COMMODITIES ERROR] Scan failed: ${err?.message || err}`);
      return null;
    }
  }

  private async persistCommoditiesToKV(result: CommodityScanResult) {
    const payload = JSON.stringify(result);
    const byteSize = new Blob([payload]).size;

    // 1. Put latest_volatile_commodities
    await kvNamespaceInstance.put('latest_volatile_commodities', payload, {
      metadata: {
        timestamp: result.timestamp,
        topCommodity: result.highestVolatile?.symbol,
        count: result.topVolatileCommodities.length,
      },
    });
    this.addLog('KV_PUT', `KV.put("latest_volatile_commodities", [Payload: ${(byteSize / 1024).toFixed(1)} KB])`);

    // 2. Put history:commodities:<timestamp> with 7-day TTL
    const unixTimestamp = new Date(result.timestamp).getTime();
    await kvNamespaceInstance.put(`history:commodities:${unixTimestamp}`, payload, {
      expirationTtl: 604800,
    });

    // 3. Put individual commodity lookups
    for (const item of result.topVolatileCommodities.slice(0, 6)) {
      await kvNamespaceInstance.put(`commodity:${item.symbol}:latest`, JSON.stringify(item), {
        expirationTtl: 86400,
      });
    }
  }

  /**
   * Run All-Market Gainers & Losers Scan across NYSE, NASDAQ, and AMEX and persist to KV
   */
  public async triggerAllMarketScan(period: 'day' | 'week' | 'month' = 'day'): Promise<AllMarketScanResult | null> {
    try {
      this.addLog('CRON', `[CRON] Scanning ALL OF THE MARKET (NYSE, NASDAQ, AMEX screener) [Period: ${period.toUpperCase()}]...`);
      const result = await scanAllMarketUniverse(period);
      await this.persistAllMarketToKV(result);
      this.addLog(
        'CRON',
        `[CRON] All-Market scan completed (${period.toUpperCase()}). Scanned ${result.scannedCount} assets. Top Gainer: ${result.topGainers[0]?.symbol} (+${result.topGainers[0]?.changePercent}% / +$${result.topGainers[0]?.change}). Top Loser: ${result.topLosers[0]?.symbol} (${result.topLosers[0]?.changePercent}% / -$${Math.abs(result.topLosers[0]?.change || 0)}).`
      );
      return result;
    } catch (err: any) {
      this.addLog('WARN', `[ALL MARKET ERROR] Scan failed: ${err?.message || err}`);
      return null;
    }
  }

  private async persistAllMarketToKV(result: AllMarketScanResult) {
    const payload = JSON.stringify(result);
    const byteSize = new Blob([payload]).size;

    // 1. Put latest_market_movers
    await kvNamespaceInstance.put('latest_market_movers', payload, {
      metadata: {
        timestamp: result.timestamp,
        period: result.period,
        count: result.scannedCount,
        topGainer: result.topGainers[0]?.symbol,
        topLoser: result.topLosers[0]?.symbol,
      },
    });
    this.addLog('KV_PUT', `KV.put("latest_market_movers", [Payload: ${(byteSize / 1024).toFixed(1)} KB, Period: ${result.period}])`);

    // 2. Put market:gainers_losers:<period>
    await kvNamespaceInstance.put(`market:gainers_losers:${result.period}`, payload, {
      expirationTtl: 86400,
    });

    // 3. Put individual ticker lookups for top gainers & losers
    const topKeyMovers = [...result.topGainers.slice(0, 5), ...result.topLosers.slice(0, 5)];
    for (const stock of topKeyMovers) {
      await kvNamespaceInstance.put(`ticker:${stock.symbol}:latest`, JSON.stringify(stock), {
        expirationTtl: 86400,
      });
    }
  }

  private dispatchSimulatedWebhooks(extreme: StockQuote[], scan: VolatilityScanResult) {
    for (const stock of extreme.slice(0, 3)) {
      const alert: WebhookAlert = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        ticker: stock.symbol,
        spreadPercent: stock.intradaySpreadPercent,
        changePercent: stock.changePercent,
        score: stock.volatilityScore,
        payload: {
          event: 'EXTREME_VOLATILITY_ALERT',
          symbol: stock.symbol,
          company: stock.name,
          price: stock.price,
          intradaySpreadPercent: stock.intradaySpreadPercent,
          dayChangePercent: stock.changePercent,
          volatilityScore: stock.volatilityScore,
          scanId: scan.scanId,
          timestamp: scan.timestamp,
        },
      };

      this.webhookAlerts.unshift(alert);
      if (this.webhookAlerts.length > 20) this.webhookAlerts.pop();

      this.addLog('WEBHOOK', `[DISCORD/SLACK WEBHOOK] Alert dispatched: ${stock.symbol} spread +${stock.intradaySpreadPercent}% (Score: ${stock.volatilityScore})`);
    }
    this.webhookListeners.forEach(fn => fn());
  }

  /**
   * Emulates: fetch(request, env, ctx)
   */
  public async simulateFetch(method: string, path: string): Promise<{ status: number; data: any; durationMs: number }> {
    const start = performance.now();
    this.addLog('HTTP', `--> ${method} ${path}`);

    let status = 200;
    let data: any = null;

    try {
      if (path === '/' || path === '/health') {
        const metadata = await kvNamespaceInstance.get('scan_metadata', { type: 'json' });
        data = {
          service: 'Cloudflare Worker: Market Volatility Scanner & KV Logger',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          lastScanMetadata: metadata,
          routes: [
            '/api/volatile',
            '/api/scan',
            '/api/history',
            '/api/ticker/:symbol',
            '/api/kv/keys',
            '/api/kv/:key',
          ],
        };
      } else if (path === '/api/volatile') {
        const latest = await kvNamespaceInstance.get('latest_volatile_stocks', { type: 'json' });
        if (!latest) {
          status = 404;
          data = { error: 'No scan recorded yet. Trigger a scan first.' };
        } else {
          data = latest;
        }
      } else if (path === '/api/commodities') {
        const latest = await kvNamespaceInstance.get('latest_volatile_commodities', { type: 'json' });
        if (!latest) {
          status = 404;
          data = { error: 'No commodities scan recorded yet. Run a commodities scan first.' };
        } else {
          data = latest;
        }
      } else if (path === '/api/scan' && method === 'POST') {
        const result = await this.triggerScheduledCron();
        if (result) {
          data = { success: true, message: 'Scan executed and saved to KV', data: result };
        } else {
          status = 500;
          data = { error: 'Scan execution failed' };
        }
      } else if (path === '/api/scan-commodities' && method === 'POST') {
        const result = await this.triggerCommoditiesScan();
        if (result) {
          data = { success: true, message: 'Commodities scan executed and saved to KV', data: result };
        } else {
          status = 500;
          data = { error: 'Commodities scan failed' };
        }
      } else if (path.startsWith('/api/commodity/')) {
        const sym = path.replace('/api/commodity/', '').toUpperCase();
        const commData = await kvNamespaceInstance.get(`commodity:${sym}:latest`, { type: 'json' });
        if (!commData) {
          status = 404;
          data = { error: `Commodity ${sym} not found in KV` };
        } else {
          data = commData;
        }
      } else if (path === '/api/history') {
        const listRes = await kvNamespaceInstance.list({ prefix: 'history:', limit: 10 });
        const historySnapshots = await Promise.all(
          listRes.keys.map(async (keyObj) => {
            const snap = await kvNamespaceInstance.get<VolatilityScanResult>(keyObj.name, { type: 'json' });
            return {
              key: keyObj.name,
              expiration: keyObj.expiration,
              scanId: snap?.scanId,
              timestamp: snap?.timestamp,
              topStock: snap?.highestVolatile?.symbol,
              topSpread: snap?.highestVolatile?.intradaySpreadPercent,
              scannedCount: snap?.scannedCount,
            };
          })
        );
        data = { count: historySnapshots.length, snapshots: historySnapshots.reverse() };
      } else if (path.startsWith('/api/ticker/')) {
        const sym = path.replace('/api/ticker/', '').toUpperCase();
        const tickerData = await kvNamespaceInstance.get(`ticker:${sym}:latest`, { type: 'json' });
        if (!tickerData) {
          status = 404;
          data = { error: `Ticker ${sym} not found in KV` };
        } else {
          data = tickerData;
        }
      } else if (path.startsWith('/api/kv/keys')) {
        const listRes = await kvNamespaceInstance.list();
        data = listRes;
      } else if (path.startsWith('/api/kv/')) {
        const key = decodeURIComponent(path.replace('/api/kv/', ''));
        const val = await kvNamespaceInstance.get(key, { type: 'json' });
        if (val === null) {
          const raw = await kvNamespaceInstance.get(key);
          if (raw === null) {
            status = 404;
            data = { error: `Key ${key} not found` };
          } else {
            data = { key, value: raw };
          }
        } else {
          data = { key, value: val };
        }
      } else {
        status = 404;
        data = { error: 'Route not found' };
      }
    } catch (err: any) {
      status = 500;
      data = { error: err?.message || 'Worker simulation error' };
    }

    const durationMs = Math.round(performance.now() - start);
    this.addLog('HTTP', `<-- ${method} ${path} ${status} (${durationMs}ms)`);

    return { status, data, durationMs };
  }

  /**
   * Auto-Cron schedule toggle
   */
  public startAutoCron(frequencySeconds: number = 15, onTick?: () => void) {
    this.stopAutoCron();
    this.cronFrequencySeconds = frequencySeconds;
    this.addLog('INFO', `[CRON] Auto-scheduler started: running every ${frequencySeconds}s`);
    
    // Run immediately once
    this.triggerScheduledCron().then(() => {
      if (onTick) onTick();
    });

    this.autoCronInterval = window.setInterval(async () => {
      await this.triggerScheduledCron();
      if (onTick) onTick();
    }, frequencySeconds * 1000);
  }

  public stopAutoCron() {
    if (this.autoCronInterval !== null) {
      clearInterval(this.autoCronInterval);
      this.autoCronInterval = null;
      this.addLog('INFO', '[CRON] Auto-scheduler stopped.');
    }
  }

  public isAutoCronRunning(): boolean {
    return this.autoCronInterval !== null;
  }

  public getCronFrequency(): number {
    return this.cronFrequencySeconds;
  }
}

export const workerSimulatorInstance = new WorkerSimulatorEngine();
