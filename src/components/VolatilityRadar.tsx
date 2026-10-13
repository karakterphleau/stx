import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Flame,
  AlertTriangle,
  Activity,
  Plus,
  ArrowUpRight,
  Database,
  BarChart3,
  Clock,
  Layers,
} from 'lucide-react';
import { VolatilityScanResult, StockQuote } from '../services/marketScanner';
import { injectShock } from '../services/marketScanner';
import { workerSimulatorInstance } from '../services/workerSimulator';

interface VolatilityRadarProps {
  scanResult: VolatilityScanResult | null;
  onInspectKey: (key: string) => void;
  onRefresh: () => void;
}

export const VolatilityRadar: React.FC<VolatilityRadarProps> = ({
  scanResult,
  onInspectKey,
  onRefresh,
}) => {
  const [newTickerInput, setNewTickerInput] = useState('');
  const [filterSector, setFilterSector] = useState<string>('ALL');

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = newTickerInput.trim().toUpperCase();
    if (!sym) return;

    const current = workerSimulatorInstance.getCustomTickers();
    if (!current.includes(sym)) {
      workerSimulatorInstance.setCustomTickers([...current, sym]);
      setNewTickerInput('');
      onRefresh();
    }
  };

  const stocks = scanResult?.topVolatileStocks || [];
  const sectors = ['ALL', ...Array.from(new Set(stocks.map((s) => s.sector)))];

  const filteredStocks = filterSector === 'ALL'
    ? stocks
    : stocks.filter((s) => s.sector === filterSector);

  const topMover = scanResult?.highestVolatile;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Volatile Asset */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-850 border border-amber-500/30 rounded-xl p-4.5 relative overflow-hidden shadow-lg shadow-black/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-500" />
              #1 Volatility Leader
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 font-bold">
              SCORE: {topMover ? topMover.volatilityScore : '0.0'}
            </span>
          </div>

          {topMover ? (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white tracking-tight font-mono">
                  {topMover.symbol}
                </span>
                <span className="text-xs text-slate-300 font-medium truncate max-w-[140px]">
                  {topMover.name}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-400 font-mono">Spread:</span>
                  <span className="text-sm font-bold font-mono text-amber-400">
                    +{topMover.intradaySpreadPercent}%
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {topMover.changePercent >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span
                    className={`text-xs font-bold font-mono ${
                      topMover.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {topMover.changePercent >= 0 ? '+' : ''}
                    {topMover.changePercent}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic mt-3">Awaiting first scan trigger...</p>
          )}
        </div>

        {/* Average Volatility Spread */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Avg Top-10 Spread
            </span>
            <span className="text-[11px] font-mono text-cyan-400">Intraday Range</span>
          </div>
          <div className="mt-1">
            <div className="text-2xl font-black text-white font-mono">
              {scanResult ? `${scanResult.averageSpreadPercent}%` : '--'}
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center justify-between pt-2 border-t border-slate-800">
              <span>High-Low / Low Delta</span>
              <span className="text-emerald-400 font-mono font-medium">Weighted</span>
            </p>
          </div>
        </div>

        {/* KV Logging Telemetry */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Database className="w-4 h-4 text-purple-400" />
              KV Destination
            </span>
            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
              7-Day TTL
            </span>
          </div>
          <div className="mt-1">
            <div className="text-lg font-bold text-white font-mono truncate">
              STOCKS_KV
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center justify-between pt-2 border-t border-slate-800">
              <span>Keys written:</span>
              <span className="text-purple-300 font-mono font-semibold">
                latest + history + top5
              </span>
            </p>
          </div>
        </div>

        {/* Cron Execution & Market Session */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-4 h-4 text-emerald-400" />
              Market Status
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                scanResult?.marketStatus === 'OPEN'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {scanResult?.marketStatus || 'MONITORING'}
            </span>
          </div>
          <div className="mt-1">
            <div className="text-sm font-mono text-slate-200">
              Scan Latency:{' '}
              <span className="text-emerald-400 font-bold">
                {scanResult ? `${scanResult.executionDurationMs}ms` : '--'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center justify-between pt-2 border-t border-slate-800">
              <span>Scanned Universe:</span>
              <span className="text-slate-200 font-mono font-medium">
                {scanResult?.scannedCount || 26} Equities
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Custom Ticker Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <Layers className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-400 flex-shrink-0">Filter Sector:</span>
          {sectors.slice(0, 5).map((sec) => (
            <button
              key={sec}
              onClick={() => setFilterSector(sec)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                filterSector === sec
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Add custom ticker to universe */}
        <form onSubmit={handleAddTicker} className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Add Ticker (e.g. COIN)..."
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              className="bg-slate-800 text-xs text-white placeholder-slate-500 px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 font-mono uppercase w-44"
            />
          </div>
          <button
            type="submit"
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* Volatile Stocks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Top Ranked Volatile Equities (Logged to KV)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Key: <code className="text-cyan-400 bg-slate-800 px-1.5 py-0.5 rounded">latest_volatile_stocks</code>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Stock Ticker</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">24h Net</th>
                <th className="py-3 px-4">Intraday Range (Low → High)</th>
                <th className="py-3 px-4 text-right">Spread %</th>
                <th className="py-3 px-4 text-right">Vol Multiplier</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">KV Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredStocks.map((stock, idx) => {
                const spread = stock.intradaySpreadPercent;
                const score = stock.volatilityScore;
                const volSurge = (stock.volume / stock.avgVolume).toFixed(1);

                return (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-slate-850/60 transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                            : idx === 1
                            ? 'bg-orange-500/10 text-orange-300'
                            : idx === 2
                            ? 'bg-purple-500/10 text-purple-300'
                            : 'text-slate-500'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                    </td>

                    {/* Symbol & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div>
                          <div className="font-mono font-bold text-white text-sm flex items-center gap-1.5">
                            {stock.symbol}
                            {stock.status === 'EXTREME' && (
                              <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                EXTREME
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                            {stock.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-200">
                      ${stock.price.toFixed(2)}
                    </td>

                    {/* 24h Net % */}
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs ${
                          stock.changePercent >= 0
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {stock.changePercent >= 0 ? '+' : ''}
                        {stock.changePercent}%
                      </span>
                    </td>

                    {/* Range Visualizer */}
                    <td className="py-3 px-4 min-w-[180px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>${stock.low.toFixed(2)}</span>
                          <span className="text-amber-400/80 font-bold">
                            ${stock.high.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              spread >= 8
                                ? 'bg-gradient-to-r from-orange-500 to-rose-500'
                                : spread >= 4.5
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-cyan-500 to-amber-500'
                            }`}
                            style={{
                              width: `${Math.min(Math.max((spread / 15) * 100, 15), 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Spread % */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                      +{spread}%
                    </td>

                    {/* Volume Surge Factor */}
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          Number(volSurge) >= 2.0
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {volSurge}x
                      </span>
                    </td>

                    {/* Volatility Score */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-mono font-black text-xs ${
                          score >= 70
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : score >= 50
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {score}
                      </span>
                    </td>

                    {/* KV Inspector Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onInspectKey(`ticker:${stock.symbol}:latest`)}
                        className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-md transition-colors"
                        title={`Inspect KV key: ticker:${stock.symbol}:latest`}
                      >
                        <Database className="w-3 h-3 text-cyan-400" />
                        <span>KV</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
