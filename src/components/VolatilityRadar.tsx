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
  Layers,
  ChevronRight,
  Clock,
  Sparkles,
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

  // Filter by sector and search query
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

  const avgPositiveGain = positiveStocks.length > 0
    ? (positiveStocks.reduce((acc, s) => acc + s.changePercent, 0) / positiveStocks.length).toFixed(2)
    : '0.00';

  const avgNegativeDrop = negativeStocks.length > 0
    ? (negativeStocks.reduce((acc, s) => acc + s.changePercent, 0) / negativeStocks.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Sleek Market Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Bullish Gainer Card */}
        <div className="bg-[#0e1117] border border-white/[0.08] rounded-xl p-4.5 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Top Gainer
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {positiveStocks.length} gainers
            </span>
          </div>

          {bestGainer ? (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold font-mono text-white tracking-tight">
                  {bestGainer.symbol}
                </span>
                <span className="text-sm font-bold font-mono text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />+{bestGainer.changePercent}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-white/[0.06]">
                <span className="truncate max-w-[120px]">{bestGainer.name}</span>
                <span className="font-mono text-amber-400 font-medium">
                  +{bestGainer.intradaySpreadPercent}% spread
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-2">No gainers detected in scan</div>
          )}
        </div>

        {/* Top Bearish Decline Card */}
        <div className="bg-[#0e1117] border border-white/[0.08] rounded-xl p-4.5 hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <TrendingDown className="w-3.5 h-3.5" /> Top Decline
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {negativeStocks.length} losers
            </span>
          </div>

          {worstLoser ? (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold font-mono text-white tracking-tight">
                  {worstLoser.symbol}
                </span>
                <span className="text-sm font-bold font-mono text-rose-400 flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />{worstLoser.changePercent}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-white/[0.06]">
                <span className="truncate max-w-[120px]">{worstLoser.name}</span>
                <span className="font-mono text-amber-400 font-medium">
                  +{worstLoser.intradaySpreadPercent}% spread
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-2">No losers detected in scan</div>
          )}
        </div>

        {/* Intraday Spread Benchmark */}
        <div className="bg-[#0e1117] border border-white/[0.08] rounded-xl p-4.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="text-slate-300 font-medium">Average Volatility</span>
            <span className="text-[11px] font-mono text-cyan-400">High-Low Delta</span>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-white">
              {scanResult ? `+${scanResult.averageSpreadPercent}%` : '--'}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-white/[0.06]">
              <span>Avg Gain: +{avgPositiveGain}%</span>
              <span>Avg Drop: {avgNegativeDrop}%</span>
            </div>
          </div>
        </div>

        {/* KV Sync Status */}
        <div className="bg-[#0e1117] border border-white/[0.08] rounded-xl p-4.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="text-slate-300 font-medium">KV Namespace</span>
            <span className="text-[11px] font-mono text-emerald-400">Healthy</span>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-white">
              STOCKS_KV
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-white/[0.06]">
              <span>Execution: {scanResult?.executionDurationMs ?? 45}ms</span>
              <span className="font-mono text-amber-400">{scanResult?.marketStatus ?? 'OPEN'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Filter & View Mode Controls Bar */}
      <div className="bg-[#0e1117] border border-white/[0.08] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Segmented View Mode Tabs */}
        <div className="flex items-center p-1 bg-black/40 rounded-lg border border-white/[0.04] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              viewMode === 'split'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5 text-cyan-400" />
            <span>Split Tables</span>
          </button>
          <button
            onClick={() => setViewMode('positive')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              viewMode === 'positive'
                ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gainers ({positiveStocks.length})</span>
          </button>
          <button
            onClick={() => setViewMode('negative')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              viewMode === 'negative'
                ? 'bg-rose-500/20 text-rose-300 shadow-sm border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Losers ({negativeStocks.length})</span>
          </button>
          <button
            onClick={() => setViewMode('combined')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              viewMode === 'combined'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Combined ({filteredStocks.length})</span>
          </button>
        </div>

        {/* Search & Sector Filters */}
        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ticker or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400 w-36 sm:w-48 font-mono"
            />
          </div>

          {/* Sector Select */}
          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className="bg-black/40 border border-white/[0.08] text-xs text-slate-300 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {sectors.map((s) => (
              <option key={s} value={s} className="bg-slate-900">
                {s === 'ALL' ? 'All Sectors' : s}
              </option>
            ))}
          </select>

          {/* Add custom ticker */}
          <form onSubmit={handleAddTicker} className="flex items-center">
            <input
              type="text"
              placeholder="+ Ticker"
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              className="bg-black/40 text-xs text-white placeholder-slate-500 px-2.5 py-1.5 rounded-l-lg border border-r-0 border-white/[0.08] focus:outline-none focus:border-amber-400 font-mono uppercase w-20"
            />
            <button
              type="submit"
              className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 px-2.5 py-1.5 rounded-r-lg border border-white/[0.08] transition-colors"
              title="Add symbol"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </form>
        </div>
      </div>

      {/* RENDER DEDICATED TABLES */}

      {/* Split Mode: Both Tables Displayed */}
      {viewMode === 'split' && (
        <div className="space-y-6">
          <ModernStockTable
            title="Bullish Volatile Equities"
            category="positive"
            stocks={positiveStocks}
            onInspectKey={onInspectKey}
          />
          <ModernStockTable
            title="Bearish Volatile Equities"
            category="negative"
            stocks={negativeStocks}
            onInspectKey={onInspectKey}
          />
        </div>
      )}

      {/* Positive Only Mode */}
      {viewMode === 'positive' && (
        <ModernStockTable
          title="Positive Performing Volatile Equities (Gainers)"
          category="positive"
          stocks={positiveStocks}
          onInspectKey={onInspectKey}
        />
      )}

      {/* Negative Only Mode */}
      {viewMode === 'negative' && (
        <ModernStockTable
          title="Negative Performing Volatile Equities (Decliners)"
          category="negative"
          stocks={negativeStocks}
          onInspectKey={onInspectKey}
        />
      )}

      {/* Combined Master Table Mode */}
      {viewMode === 'combined' && (
        <ModernStockTable
          title="All Volatile Equities (Combined Master Ranking)"
          category="combined"
          stocks={filteredStocks}
          onInspectKey={onInspectKey}
        />
      )}
    </div>
  );
};

interface ModernStockTableProps {
  title: string;
  category: 'positive' | 'negative' | 'combined';
  stocks: StockQuote[];
  onInspectKey: (key: string) => void;
}

const ModernStockTable: React.FC<ModernStockTableProps> = ({
  title,
  category,
  stocks,
  onInspectKey,
}) => {
  const isPositive = category === 'positive';
  const isNegative = category === 'negative';

  return (
    <div className="bg-[#0e1117] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
      {/* Table Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : isNegative ? (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          ) : (
            <Activity className="w-4 h-4 text-amber-400" />
          )}
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
            <span className="text-xs text-slate-400 font-mono">
              ({stocks.length} recorded)
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono hidden sm:flex items-center gap-1.5">
          <span>KV Key:</span>
          <code className="text-cyan-400 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">
            latest_volatile_stocks
          </code>
        </div>
      </div>

      {/* Table Body */}
      {stocks.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          No {category === 'positive' ? 'positive' : 'negative'} stocks recorded in this scan.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-black/20 text-[11px] font-medium text-slate-400">
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4">Ticker / Company</th>
                <th className="py-2.5 px-4 text-right">Price</th>
                <th className="py-2.5 px-4 text-right">24h Net</th>
                <th className="py-2.5 px-4 min-w-[150px]">Intraday Range</th>
                <th className="py-2.5 px-4 text-right">Spread %</th>
                <th className="py-2.5 px-4 text-right">Vol Surge</th>
                <th className="py-2.5 px-4 text-center">Score</th>
                <th className="py-2.5 px-4 text-right">KV Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {stocks.map((stock, idx) => {
                const spread = stock.intradaySpreadPercent;
                const volSurge = (stock.volume / stock.avgVolume).toFixed(1);

                return (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 font-mono text-slate-500 text-xs">
                      {idx + 1}
                    </td>

                    {/* Ticker & Name */}
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-bold font-mono text-white text-sm flex items-center gap-1.5">
                          {stock.symbol}
                          {stock.status === 'EXTREME' && (
                            <span className="text-[10px] font-sans font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              EXTREME
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {stock.name} <span className="text-slate-600">·</span> {stock.sector}
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-200">
                      ${stock.price.toFixed(2)}
                    </td>

                    {/* 24h Net Change % */}
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          stock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
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

                    {/* Intraday Range (Low -> High) */}
                    <td className="py-3 px-4 min-w-[150px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>${stock.low.toFixed(2)}</span>
                          <span className="text-slate-300 font-medium">${stock.high.toFixed(2)}</span>
                        </div>
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              stock.changePercent >= 0
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
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

                    {/* Volume Multiplier */}
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {volSurge}x
                    </td>

                    {/* Volatility Score */}
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span
                        className={
                          stock.volatilityScore >= 70
                            ? 'text-rose-400'
                            : stock.volatilityScore >= 50
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }
                      >
                        {stock.volatilityScore}
                      </span>
                    </td>

                    {/* KV Inspector Action Button */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspectKey(`ticker:${stock.symbol}:latest`)}
                        className="inline-flex items-center space-x-1 text-[11px] text-slate-400 hover:text-cyan-400 bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 rounded border border-white/[0.06] transition-colors"
                        title={`Inspect KV key: ticker:${stock.symbol}:latest`}
                      >
                        <Database className="w-3 h-3 text-cyan-400" />
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
