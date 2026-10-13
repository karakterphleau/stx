import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Database,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Split,
  ChevronRight,
  Clock,
  Zap,
  BarChart2,
  SlidersHorizontal,
} from 'lucide-react';
import { VolatilityScanResult, StockQuote } from '../services/marketScanner';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'split' | 'positive' | 'negative' | 'combined'>('split');

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

  const allStocks = scanResult?.topVolatileStocks || [];

  // Filter stocks based on sector & search query
  const filteredStocks = allStocks.filter((s) => {
    const matchesSector = filterSector === 'ALL' || s.sector === filterSector;
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSector && matchesSearch;
  });

  const positiveStocks = filteredStocks.filter((s) => s.changePercent >= 0);
  const negativeStocks = filteredStocks.filter((s) => s.changePercent < 0);

  const sectors = ['ALL', ...Array.from(new Set(allStocks.map((s) => s.sector)))];

  const bestGainer = [...filteredStocks]
    .filter((s) => s.changePercent >= 0)
    .sort((a, b) => b.changePercent - a.changePercent)[0] || null;

  const worstLoser = [...filteredStocks]
    .filter((s) => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)[0] || null;

  const avgGain = positiveStocks.length > 0
    ? (positiveStocks.reduce((acc, s) => acc + s.changePercent, 0) / positiveStocks.length).toFixed(2)
    : '0.00';

  const avgLoss = negativeStocks.length > 0
    ? (negativeStocks.reduce((acc, s) => acc + s.changePercent, 0) / negativeStocks.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Top Key Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Bullish Gainer Card */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Top Bullish Gainer
            </span>
            <span className="text-slate-400 font-mono font-medium text-[11px]">
              {positiveStocks.length} gainers
            </span>
          </div>

          {bestGainer ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {bestGainer.symbol}
                </span>
                <span className="text-base font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center">
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />+{bestGainer.changePercent}%
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-1">
                {bestGainer.name}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>Price: <strong className="text-white">${bestGainer.price.toFixed(2)}</strong></span>
                <span className="text-amber-400 font-semibold">+{bestGainer.intradaySpreadPercent}% spread</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No positive stocks in current scan</div>
          )}
        </div>

        {/* Top Bearish Decline Card */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400 mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" /> Top Bearish Drop
            </span>
            <span className="text-slate-400 font-mono font-medium text-[11px]">
              {negativeStocks.length} losers
            </span>
          </div>

          {worstLoser ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {worstLoser.symbol}
                </span>
                <span className="text-base font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg flex items-center">
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />{worstLoser.changePercent}%
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-1">
                {worstLoser.name}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>Price: <strong className="text-white">${worstLoser.price.toFixed(2)}</strong></span>
                <span className="text-amber-400 font-semibold">+{worstLoser.intradaySpreadPercent}% spread</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No negative stocks in current scan</div>
          )}
        </div>

        {/* Market Volatility Spread */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Avg Volatility Spread
            </span>
            <span className="text-[11px] font-mono text-cyan-400">Range Delta</span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {scanResult ? `+${scanResult.averageSpreadPercent}%` : '--'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Across top monitored market leaders
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
              <span className="text-emerald-400">Avg Gain: +{avgGain}%</span>
              <span className="text-slate-600">·</span>
              <span className="text-rose-400">Avg Drop: {avgLoss}%</span>
            </div>
          </div>
        </div>

        {/* KV Sync & Session Telemetry */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-purple-400" />
              Cloudflare KV Binding
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Healthy
            </span>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              STOCKS_KV
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Persisting snapshots with 7-day TTL
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
              <span>Scan Time: <strong className="text-emerald-400">{scanResult?.executionDurationMs ?? 48}ms</strong></span>
              <span className="text-amber-400 font-semibold">{scanResult?.marketStatus ?? 'OPEN'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar: View Mode Tabs + Search + Sector + Add Ticker */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* View Mode Segmented Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'split'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-cyan-400" />
              <span>Split Tables (+ &amp; -)</span>
            </button>

            <button
              onClick={() => setViewMode('positive')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'positive'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Positive Movers ({positiveStocks.length})</span>
            </button>

            <button
              onClick={() => setViewMode('negative')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'negative'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Negative Movers ({negativeStocks.length})</span>
            </button>

            <button
              onClick={() => setViewMode('combined')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'combined'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Combined Master ({filteredStocks.length})</span>
            </button>
          </div>

          {/* Search & Sector Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search symbol or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            {/* Sector Dropdown */}
            <select
              aria-label="Filter stocks by industry sector"
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400 cursor-pointer font-medium"
            >
              {sectors.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s === 'ALL' ? 'All Sectors' : s}
                </option>
              ))}
            </select>

            {/* Add Custom Ticker */}
            <form onSubmit={handleAddTicker} className="flex items-center space-x-1">
              <input
                type="text"
                placeholder="+ Symbol"
                value={newTickerInput}
                onChange={(e) => setNewTickerInput(e.target.value)}
                className="bg-slate-950 text-xs text-white placeholder-slate-500 px-3 py-2 rounded-l-lg border border-r-0 border-slate-700/80 focus:outline-none focus:border-amber-400 font-mono uppercase w-24"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold px-3 py-2 rounded-r-lg border border-slate-700/80 transition-colors"
                title="Add ticker to watchlist"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* RENDER THE TABLES */}

      {/* 1. SPLIT VIEW: Both Positive and Negative Tables */}
      {viewMode === 'split' && (
        <div className="space-y-6">
          <CleanStockTable
            title="Bullish Volatile Equities (Positive Net Change)"
            subtitle="Stocks experiencing upward price momentum and broad intraday trading ranges"
            type="positive"
            stocks={positiveStocks}
            onInspectKey={onInspectKey}
          />

          <CleanStockTable
            title="Bearish Volatile Equities (Negative Net Change)"
            subtitle="Stocks experiencing downward price pressure and elevated intraday range volatility"
            type="negative"
            stocks={negativeStocks}
            onInspectKey={onInspectKey}
          />
        </div>
      )}

      {/* 2. POSITIVE ONLY VIEW */}
      {viewMode === 'positive' && (
        <CleanStockTable
          title="Positive Performing Volatile Equities"
          subtitle="Top market gainers sorted by composite volatility score"
          type="positive"
          stocks={positiveStocks}
          onInspectKey={onInspectKey}
        />
      )}

      {/* 3. NEGATIVE ONLY VIEW */}
      {viewMode === 'negative' && (
        <CleanStockTable
          title="Negative Performing Volatile Equities"
          subtitle="Top market drawdowns sorted by composite volatility score"
          type="negative"
          stocks={negativeStocks}
          onInspectKey={onInspectKey}
        />
      )}

      {/* 4. COMBINED MASTER VIEW */}
      {viewMode === 'combined' && (
        <CleanStockTable
          title="All Volatile Equities (Master Composite Ranking)"
          subtitle="Comprehensive ranking of all monitored equities by volatility rating"
          type="combined"
          stocks={filteredStocks}
          onInspectKey={onInspectKey}
        />
      )}
    </div>
  );
};

interface CleanStockTableProps {
  title: string;
  subtitle: string;
  type: 'positive' | 'negative' | 'combined';
  stocks: StockQuote[];
  onInspectKey: (key: string) => void;
}

const CleanStockTable: React.FC<CleanStockTableProps> = ({
  title,
  subtitle,
  type,
  stocks,
  onInspectKey,
}) => {
  const isPositive = type === 'positive';
  const isNegative = type === 'negative';

  const borderColor = isPositive
    ? 'border-emerald-500/30'
    : isNegative
    ? 'border-rose-500/30'
    : 'border-slate-800';

  const headerBg = isPositive
    ? 'bg-emerald-950/20'
    : isNegative
    ? 'bg-rose-950/20'
    : 'bg-slate-900/60';

  const iconColor = isPositive
    ? 'text-emerald-400'
    : isNegative
    ? 'text-rose-400'
    : 'text-amber-400';

  return (
    <div className={`bg-slate-900 border ${borderColor} rounded-xl overflow-hidden shadow-xl transition-all`}>
      {/* Table Header Row */}
      <div className={`px-6 py-4 border-b border-slate-800 ${headerBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-500/10' : isNegative ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
            {isPositive ? (
              <TrendingUp className={`w-5 h-5 ${iconColor}`} />
            ) : isNegative ? (
              <TrendingDown className={`w-5 h-5 ${iconColor}`} />
            ) : (
              <Activity className={`w-5 h-5 ${iconColor}`} />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-base font-bold text-white tracking-tight">
                {title}
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-500/20 text-emerald-300' : isNegative ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
                {stocks.length} Assets
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <span className="hidden sm:inline">Persisted to KV:</span>
          <code className="text-cyan-400 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-xs">
            latest_volatile_stocks
          </code>
        </div>
      </div>

      {/* Table Content */}
      {stocks.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          No {type === 'positive' ? 'positive' : 'negative'} volatile equities recorded in this session.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-5 w-12 text-center">Rank</th>
                <th className="py-3 px-5">Equity / Sector</th>
                <th className="py-3 px-5 text-right">Current Price</th>
                <th className="py-3 px-5 text-right">24h Net</th>
                <th className="py-3 px-5 min-w-[200px]">Intraday Range (Low → High)</th>
                <th className="py-3 px-5 text-right">Spread %</th>
                <th className="py-3 px-5 text-right">Volume</th>
                <th className="py-3 px-5 text-center">Score</th>
                <th className="py-3 px-5 text-center">KV Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {stocks.map((stock, idx) => {
                const spread = stock.intradaySpreadPercent;
                const score = stock.volatilityScore;
                const volSurge = (stock.volume / stock.avgVolume).toFixed(1);

                // Calculate where the current price sits between Low and High (0% to 100%)
                const pricePositionPct = stock.high > stock.low
                  ? Math.min(Math.max(((stock.price - stock.low) / (stock.high - stock.low)) * 100, 5), 95)
                  : 50;

                return (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-slate-850/70 transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-4 px-5 text-center font-mono font-bold text-slate-400">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                          idx === 0
                            ? isPositive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : isNegative
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 bg-slate-800/60'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                    </td>

                    {/* Symbol & Company Name */}
                    <td className="py-4 px-5">
                      <div>
                        <div className="font-bold font-mono text-white text-base flex items-center gap-2">
                          <span>{stock.symbol}</span>
                          {stock.status === 'EXTREME' && (
                            <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              EXTREME
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[180px] mt-0.5">
                          {stock.name} <span className="text-slate-600">·</span> {stock.sector}
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-4 px-5 text-right font-mono font-bold text-slate-100 text-sm">
                      ${stock.price.toFixed(2)}
                    </td>

                    {/* 24h Net Change */}
                    <td className="py-4 px-5 text-right font-mono font-bold">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${
                          stock.changePercent >= 0
                            ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                            : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
                        }`}
                      >
                        {stock.changePercent >= 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {stock.changePercent >= 0 ? '+' : ''}
                        {stock.changePercent}%
                      </span>
                    </td>

                    {/* Intraday Range with marker indicator */}
                    <td className="py-4 px-5 min-w-[200px]">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono text-slate-400">
                          <span>${stock.low.toFixed(2)}</span>
                          <span className={stock.changePercent >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                            ${stock.high.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full relative overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPositive
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : isNegative
                                ? 'bg-gradient-to-r from-orange-500 to-rose-500'
                                : 'bg-gradient-to-r from-cyan-500 to-amber-500'
                            }`}
                            style={{
                              width: `${pricePositionPct}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Spread % */}
                    <td className="py-4 px-5 text-right font-mono font-extrabold text-amber-400 text-sm">
                      +{spread}%
                    </td>

                    {/* Volume Surge Factor */}
                    <td className="py-4 px-5 text-right font-mono text-slate-300 text-xs">
                      <span className={`px-2 py-0.5 rounded font-semibold ${Number(volSurge) >= 2.0 ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400'}`}>
                        {volSurge}x avg
                      </span>
                    </td>

                    {/* Volatility Score */}
                    <td className="py-4 px-5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-black text-xs ${
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

                    {/* KV Inspector Action Button */}
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => onInspectKey(`ticker:${stock.symbol}:latest`)}
                        className="inline-flex items-center space-x-1.5 text-xs text-slate-300 hover:text-cyan-300 bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors shadow-sm"
                        title={`Inspect key: ticker:${stock.symbol}:latest`}
                      >
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
