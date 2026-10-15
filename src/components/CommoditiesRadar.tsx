import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Split,
  Droplets,
  Coins,
  Wheat,
  SlidersHorizontal,
  Flame,
  Layers,
  RotateCw,
} from 'lucide-react';
import { CommodityScanResult, CommodityQuote, injectCommodityShock } from '../services/commodityScanner';
import { TimePeriod } from '../services/marketScanner';
import { workerSimulatorInstance } from '../services/workerSimulator';

interface CommoditiesRadarProps {
  scanResult: CommodityScanResult | null;
  onInspectKey: (key: string) => void;
  onRefresh: () => void;
  isScanning?: boolean;
  period?: TimePeriod;
  onSelectPeriod?: (period: TimePeriod) => void;
}

export const CommoditiesRadar: React.FC<CommoditiesRadarProps> = ({
  scanResult,
  onInspectKey,
  onRefresh,
  isScanning = false,
  period = 'day',
  onSelectPeriod,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'split' | 'positive' | 'negative' | 'combined'>('split');
  const [selectedShockSymbol, setSelectedShockSymbol] = useState('NAT_GAS');

  const allCommodities = scanResult?.topVolatileCommodities || [];

  const filtered = allCommodities.filter((c) => {
    const matchesCategory = filterCategory === 'ALL' || c.category === filterCategory;
    const matchesSearch =
      c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tickerCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const positive = filtered.filter((c) => c.changePercent >= 0);
  const negative = filtered.filter((c) => c.changePercent < 0);

  const categories = ['ALL', 'Energy', 'Precious Metals', 'Industrial Metals', 'Agriculture'];

  const bestGainer = [...filtered]
    .filter((c) => c.changePercent >= 0)
    .sort((a, b) => b.changePercent - a.changePercent)[0] || null;

  const worstLoser = [...filtered]
    .filter((c) => c.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)[0] || null;

  const handleShock = (direction: 'UP' | 'DOWN') => {
    injectCommodityShock(selectedShockSymbol, direction);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Commodity Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Bullish Commodity */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Top Bullish Commodity
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {positive.length} gainers
            </span>
          </div>

          {bestGainer ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black font-mono text-white tracking-tight">
                  {bestGainer.name}
                </span>
                <span className="text-sm font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />+{bestGainer.changePercent}%
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                {bestGainer.tickerCode} · {bestGainer.category}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>Price: <strong className="text-white">${bestGainer.price.toFixed(2)}</strong> {bestGainer.unit}</span>
                <span className="text-amber-400 font-semibold">+{bestGainer.intradaySpreadPercent}% spread</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No positive commodity moves detected</div>
          )}
        </div>

        {/* Top Bearish Commodity */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400 mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" /> Top Bearish Commodity
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {negative.length} decliners
            </span>
          </div>

          {worstLoser ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black font-mono text-white tracking-tight">
                  {worstLoser.name}
                </span>
                <span className="text-sm font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />{worstLoser.changePercent}%
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                {worstLoser.tickerCode} · {worstLoser.category}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>Price: <strong className="text-white">${worstLoser.price.toFixed(2)}</strong> {worstLoser.unit}</span>
                <span className="text-amber-400 font-semibold">+{worstLoser.intradaySpreadPercent}% spread</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No negative commodity moves detected</div>
          )}
        </div>

        {/* Average Commodity Volatility */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Avg Commodities Spread
            </span>
            <span className="text-[11px] font-mono text-amber-400">High-Low Delta</span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {scanResult ? `+${scanResult.averageSpreadPercent}%` : '--'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Covering Energy, Metals &amp; Agriculture
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
              <span className="text-emerald-400">Gainers: {positive.length}</span>
              <span className="text-slate-600">·</span>
              <span className="text-rose-400">Decliners: {negative.length}</span>
            </div>
          </div>
        </div>

        {/* KV Persistence Info */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-purple-400" />
              KV Destination
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              STOCKS_KV
            </span>
          </div>
          <div>
            <div className="text-base font-bold font-mono text-white mt-1 truncate">
              latest_volatile_commodities
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Logged to Cloudflare KV alongside stocks
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
              <span>Scan Time: <strong className="text-emerald-400">{scanResult?.executionDurationMs ?? 42}ms</strong></span>
              <span className="text-cyan-400">18 Commodities</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: View Switcher, Category Filter, Search, and Shock Testing */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented View Switcher */}
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
              <span>Commodity Gainers ({positive.length})</span>
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
              <span>Commodity Decliners ({negative.length})</span>
            </button>

            <button
              onClick={() => setViewMode('combined')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'combined'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>All Commodities ({filtered.length})</span>
            </button>
          </div>

          {/* Period Selector in CommoditiesRadar */}
          {onSelectPeriod && (
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start lg:self-auto">
              <span className="text-[11px] font-mono text-slate-400 font-semibold px-1.5 hidden sm:inline">
                Period:
              </span>
              <button
                type="button"
                onClick={() => onSelectPeriod('day')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                  period === 'day'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Day (1D)
              </button>
              <button
                type="button"
                onClick={() => onSelectPeriod('week')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                  period === 'week'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Week (5D)
              </button>
              <button
                type="button"
                onClick={() => onSelectPeriod('month')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                  period === 'month'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Month (1M)
              </button>
            </div>
          )}

          {/* Search, Category, and Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-52">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search commodity (e.g. Gold, Crude, Coffee)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            {/* Category Dropdown */}
            <select
              aria-label="Filter commodities by sector category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400 cursor-pointer font-medium"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900">
                  {cat === 'ALL' ? 'All Commodities' : cat}
                </option>
              ))}
            </select>

            {/* Commodity Shock Injection */}
            <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-700/80">
              <select
                aria-label="Select commodity for volatility shock test"
                value={selectedShockSymbol}
                onChange={(e) => setSelectedShockSymbol(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-amber-300 px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="NAT_GAS" className="bg-slate-900 text-white">Natural Gas</option>
                <option value="WTI_CRUDE" className="bg-slate-900 text-white">WTI Crude</option>
                <option value="GOLD" className="bg-slate-900 text-white">Gold</option>
                <option value="SILVER" className="bg-slate-900 text-white">Silver</option>
                <option value="COCOA" className="bg-slate-900 text-white">Cocoa</option>
                <option value="COFFEE" className="bg-slate-900 text-white">Coffee</option>
              </select>
              <button
                onClick={() => handleShock('UP')}
                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-1 rounded transition-colors font-mono font-semibold"
                title="Inject bullish commodity shock"
              >
                +Shock
              </button>
              <button
                onClick={() => handleShock('DOWN')}
                className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-1 rounded ml-1 transition-colors font-mono font-semibold"
                title="Inject bearish commodity shock"
              >
                -Shock
              </button>
            </div>

            <button
              onClick={onRefresh}
              disabled={isScanning}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan Commodities'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDER COMMODITY TABLES */}

      {/* 1. SPLIT VIEW */}
      {viewMode === 'split' && (
        <div className="space-y-6">
          <CommodityTableCard
            title="Bullish Volatile Commodities (Gaining Futures)"
            subtitle="Raw materials and futures contracts moving higher with elevated intraday ranges"
            type="positive"
            commodities={positive}
            onInspectKey={onInspectKey}
          />

          <CommodityTableCard
            title="Bearish Volatile Commodities (Declining Futures)"
            subtitle="Raw materials and futures contracts pulling back with broad intraday spreads"
            type="negative"
            commodities={negative}
            onInspectKey={onInspectKey}
          />
        </div>
      )}

      {/* 2. POSITIVE ONLY */}
      {viewMode === 'positive' && (
        <CommodityTableCard
          title="Positive Performing Commodities"
          subtitle="Ranked by composite volatility score with positive net day performance"
          type="positive"
          commodities={positive}
          onInspectKey={onInspectKey}
        />
      )}

      {/* 3. NEGATIVE ONLY */}
      {viewMode === 'negative' && (
        <CommodityTableCard
          title="Negative Performing Commodities"
          subtitle="Ranked by composite volatility score with negative net day performance"
          type="negative"
          commodities={negative}
          onInspectKey={onInspectKey}
        />
      )}

      {/* 4. COMBINED MASTER */}
      {viewMode === 'combined' && (
        <CommodityTableCard
          title="All Volatile Commodities (Master Ranking)"
          subtitle="Comprehensive ranking across global Energy, Metals, and Agriculture futures"
          type="combined"
          commodities={filtered}
          onInspectKey={onInspectKey}
        />
      )}
    </div>
  );
};

interface CommodityTableCardProps {
  title: string;
  subtitle: string;
  type: 'positive' | 'negative' | 'combined';
  commodities: CommodityQuote[];
  onInspectKey: (key: string) => void;
}

const CommodityTableCard: React.FC<CommodityTableCardProps> = ({
  title,
  subtitle,
  type,
  commodities,
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

  const getCategoryIcon = (category: string) => {
    if (category === 'Energy') return <Droplets className="w-3.5 h-3.5 text-cyan-400" />;
    if (category === 'Precious Metals' || category === 'Industrial Metals') return <Coins className="w-3.5 h-3.5 text-amber-400" />;
    return <Wheat className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div className={`bg-slate-900 border ${borderColor} rounded-xl overflow-hidden shadow-xl transition-all`}>
      {/* Header Bar */}
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
              <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-500/20 text-emerald-300' : isNegative ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
                {commodities.length} Commodities
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center space-x-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>CME / NYMEX LIVE FEED</span>
          </span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline">Persisted to KV:</span>
          <code className="text-cyan-400 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-xs">
            latest_volatile_commodities
          </code>
        </div>
      </div>

      {/* Table Content */}
      {commodities.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          No {type === 'positive' ? 'positive' : 'negative'} commodity moves recorded in this session.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-5 w-12 text-center">Rank</th>
                <th className="py-3 px-5">Commodity / Contract</th>
                <th className="py-3 px-5 text-right">Price / Unit</th>
                <th className="py-3 px-5 text-right">Net Move ({commodities[0]?.periodLabel || '1D'})</th>
                <th className="py-3 px-5 min-w-[180px]">Period Range (Low → High)</th>
                <th className="py-3 px-5 text-right">Spread %</th>
                <th className="py-3 px-5 text-right">Traded Contracts</th>
                <th className="py-3 px-5 text-center">Score</th>
                <th className="py-3 px-5 text-center">KV Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {commodities.map((item, idx) => {
                const spread = item.intradaySpreadPercent;
                const score = item.volatilityScore;
                const formattedVolume = item.volume >= 1000000
                  ? `${(item.volume / 1000000).toFixed(1)}M`
                  : `${(item.volume / 1000).toFixed(0)}K`;

                const pricePositionPct = item.high > item.low
                  ? Math.min(Math.max(((item.price - item.low) / (item.high - item.low)) * 100, 5), 95)
                  : 50;

                return (
                  <tr key={item.symbol} className="hover:bg-slate-850/70 transition-colors group">
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

                    {/* Commodity Name & Category */}
                    <td className="py-4 px-5">
                      <div>
                        <div className="font-bold font-mono text-white text-base flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-xs text-slate-400 font-normal">({item.tickerCode})</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            LIVE
                          </span>
                          {item.status === 'EXTREME' && (
                            <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              EXTREME
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          {getCategoryIcon(item.category)}
                          <span>{item.category}</span>
                        </div>
                      </div>
                    </td>

                    {/* Price and Unit */}
                    <td className="py-4 px-5 text-right font-mono font-bold text-slate-100 text-sm">
                      ${item.price.toFixed(2)}{' '}
                      <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                    </td>

                    {/* 24h Net Change */}
                    <td className="py-4 px-5 text-right font-mono font-bold">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${
                          item.changePercent >= 0
                            ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                            : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
                        }`}
                      >
                        {item.changePercent >= 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {item.changePercent >= 0 ? '+' : ''}
                        {item.changePercent}%
                      </span>
                    </td>

                    {/* Intraday Range with visual marker */}
                    <td className="py-4 px-5 min-w-[180px]">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono text-slate-400">
                          <span>${item.low.toFixed(2)}</span>
                          <span className={item.changePercent >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                            ${item.high.toFixed(2)}
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

                    {/* Traded Contracts Volume */}
                    <td className="py-4 px-5 text-right font-mono text-slate-200 text-xs">
                      <div>
                        <span className="font-semibold">{formattedVolume}</span>
                        <span className="text-[11px] text-slate-400 block">{item.volumeSurgeRatio}x avg</span>
                      </div>
                    </td>

                    {/* Volatility Score */}
                    <td className="py-4 px-5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-black text-xs ${
                          score >= 68
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : score >= 48
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
                        onClick={() => onInspectKey(`commodity:${item.symbol}:latest`)}
                        className="inline-flex items-center space-x-1.5 text-xs text-slate-300 hover:text-cyan-300 bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors shadow-sm"
                        title={`Inspect key: commodity:${item.symbol}:latest`}
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
