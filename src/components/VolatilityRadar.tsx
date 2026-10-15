import React, { useState, useMemo } from 'react';
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
  Wheat,
  DollarSign,
  Percent,
  ArrowUpDown,
  Layers,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { VolatilityScanResult, StockQuote, TimePeriod } from '../services/marketScanner';
import { CommodityScanResult, CommodityQuote } from '../services/commodityScanner';
import { workerSimulatorInstance } from '../services/workerSimulator';

export interface UnifiedVolatileItem {
  id: string;
  symbol: string;
  tickerCode: string;
  name: string;
  assetType: 'STOCK' | 'COMMODITY';
  category: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  changeDollar: number; // Dollar amount gained or dropped
  changePercent: number; // Percentage gained or dropped
  volume: number;
  avgVolume: number;
  dollarVolume: number;
  volatilityScore: number;
  intradaySpreadPercent: number;
  status: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'MODERATE' | string;
  sparkline: number[];
  timestamp: string;
  isRealTime: boolean;
  exchangeSource: string;
  unit?: string;
  kvKey: string;
  period?: TimePeriod;
  periodLabel?: string;
}

export interface VolatilityRadarProps {
  scanResult: VolatilityScanResult | null;
  commodityScanResult: CommodityScanResult | null;
  onInspectKey: (key: string) => void;
  onRefresh: () => void;
  isScanning?: boolean;
  period?: TimePeriod;
  onSelectPeriod?: (period: TimePeriod) => void;
}

export const VolatilityRadar: React.FC<VolatilityRadarProps> = ({
  scanResult,
  commodityScanResult,
  onInspectKey,
  onRefresh,
  isScanning = false,
  period = 'day',
  onSelectPeriod,
}) => {
  const [newTickerInput, setNewTickerInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'STOCKS' | 'COMMODITIES'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'split' | 'positive' | 'negative' | 'combined'>('split');
  // Sort metric: 'dollar' (dollar amounts) vs 'percent' (percentage), plus volatility score, spread, volume, price
  const [sortMetric, setSortMetric] = useState<'volatility' | 'dollar' | 'percent' | 'spread' | 'volume' | 'price'>('volatility');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Unified dataset combining Stocks and Commodities
  const unifiedItems: UnifiedVolatileItem[] = useMemo(() => {
    const list: UnifiedVolatileItem[] = [];

    // 1. Stock items
    if (scanResult?.topVolatileStocks) {
      scanResult.topVolatileStocks.forEach((stock) => {
        list.push({
          id: `stock-${stock.symbol}`,
          symbol: stock.symbol,
          tickerCode: stock.symbol,
          name: stock.name,
          assetType: 'STOCK',
          category: stock.sector,
          price: stock.price,
          open: stock.open,
          high: stock.high,
          low: stock.low,
          previousClose: stock.previousClose,
          changeDollar: stock.change,
          changePercent: stock.changePercent,
          volume: stock.volume,
          avgVolume: stock.avgVolume || stock.volume,
          dollarVolume: stock.dollarVolume,
          volatilityScore: stock.volatilityScore,
          intradaySpreadPercent: stock.intradaySpreadPercent,
          status: stock.status,
          sparkline: stock.sparkline || [stock.previousClose, stock.price],
          timestamp: stock.timestamp,
          isRealTime: !!stock.isRealTime,
          exchangeSource: stock.exchangeSource || 'US Exchanges',
          unit: 'shares',
          kvKey: `ticker:${stock.symbol}:latest`,
          period: stock.period || period,
          periodLabel: stock.periodLabel || (period === 'week' ? 'Week (5D)' : period === 'month' ? 'Month (30D)' : 'Day (1D)'),
        });
      });
    }

    // 2. Commodity items
    if (commodityScanResult?.topVolatileCommodities) {
      commodityScanResult.topVolatileCommodities.forEach((comm) => {
        list.push({
          id: `comm-${comm.symbol}`,
          symbol: comm.tickerCode,
          tickerCode: comm.symbol,
          name: comm.name,
          assetType: 'COMMODITY',
          category: comm.category,
          price: comm.price,
          open: comm.open,
          high: comm.high,
          low: comm.low,
          previousClose: comm.previousClose,
          changeDollar: comm.change,
          changePercent: comm.changePercent,
          volume: comm.volume,
          avgVolume: comm.volume,
          dollarVolume: comm.dollarVolume,
          volatilityScore: comm.volatilityScore,
          intradaySpreadPercent: comm.intradaySpreadPercent,
          status: comm.status,
          sparkline: comm.sparkline || [comm.previousClose, comm.price],
          timestamp: comm.timestamp,
          isRealTime: !!comm.isRealTime,
          exchangeSource: comm.exchangeSource || 'NYMEX/COMEX Live',
          unit: comm.unit,
          kvKey: `commodity:${comm.symbol}:latest`,
          period: comm.period || period,
          periodLabel: comm.periodLabel || (period === 'week' ? 'Week (5D)' : period === 'month' ? 'Month (30D)' : 'Day (1D)'),
        });
      });
    }

    return list;
  }, [scanResult, commodityScanResult, period]);

  // Counts for asset scoping
  const totalStocksCount = scanResult?.topVolatileStocks?.length || 0;
  const totalCommoditiesCount = commodityScanResult?.topVolatileCommodities?.length || 0;
  const totalCombinedCount = unifiedItems.length;

  // Filter items based on Asset type (All / Stocks / Commodities), Category, and Search Query
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (assetFilter === 'STOCKS' && item.assetType !== 'STOCK') return false;
      if (assetFilter === 'COMMODITIES' && item.assetType !== 'COMMODITY') return false;

      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [unifiedItems, assetFilter, categoryFilter, searchQuery]);

  // Dynamic available categories
  const availableCategories = useMemo(() => {
    const relevant = unifiedItems.filter((item) => {
      if (assetFilter === 'STOCKS') return item.assetType === 'STOCK';
      if (assetFilter === 'COMMODITIES') return item.assetType === 'COMMODITY';
      return true;
    });
    return ['ALL', ...Array.from(new Set(relevant.map((i) => i.category)))];
  }, [unifiedItems, assetFilter]);

  // Sort helper function matching the Gainers & Losers sorting engine
  const sortItems = (items: UnifiedVolatileItem[], isNegativeGroup = false) => {
    return [...items].sort((a, b) => {
      let comparison = 0;

      if (sortMetric === 'volatility') {
        comparison = b.volatilityScore - a.volatilityScore;
      } else if (sortMetric === 'dollar') {
        // Absolute magnitude when in partitioned groups, or direct signed/absolute
        const valA = isNegativeGroup ? Math.abs(a.changeDollar) : a.changeDollar;
        const valB = isNegativeGroup ? Math.abs(b.changeDollar) : b.changeDollar;
        comparison = valB - valA;
      } else if (sortMetric === 'percent') {
        const valA = isNegativeGroup ? Math.abs(a.changePercent) : a.changePercent;
        const valB = isNegativeGroup ? Math.abs(b.changePercent) : b.changePercent;
        comparison = valB - valA;
      } else if (sortMetric === 'spread') {
        comparison = b.intradaySpreadPercent - a.intradaySpreadPercent;
      } else if (sortMetric === 'volume') {
        comparison = b.dollarVolume - a.dollarVolume;
      } else if (sortMetric === 'price') {
        comparison = b.price - a.price;
      }

      return sortDirection === 'asc' ? -comparison : comparison;
    });
  };

  // Positive and Negative movers
  const positiveItems = useMemo(() => {
    return filteredItems.filter((item) => item.changePercent >= 0 || item.changeDollar >= 0);
  }, [filteredItems]);

  const negativeItems = useMemo(() => {
    return filteredItems.filter((item) => item.changePercent < 0 || item.changeDollar < 0);
  }, [filteredItems]);

  const sortedPositive = useMemo(() => sortItems(positiveItems, false), [positiveItems, sortMetric, sortDirection]);
  const sortedNegative = useMemo(() => sortItems(negativeItems, true), [negativeItems, sortMetric, sortDirection]);

  // Combined master sorted list
  const sortedCombined = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      if (sortMetric === 'volatility') {
        comparison = b.volatilityScore - a.volatilityScore;
      } else if (sortMetric === 'dollar') {
        comparison = Math.abs(b.changeDollar) - Math.abs(a.changeDollar);
      } else if (sortMetric === 'percent') {
        comparison = Math.abs(b.changePercent) - Math.abs(a.changePercent);
      } else if (sortMetric === 'spread') {
        comparison = b.intradaySpreadPercent - a.intradaySpreadPercent;
      } else if (sortMetric === 'volume') {
        comparison = b.dollarVolume - a.dollarVolume;
      } else if (sortMetric === 'price') {
        comparison = b.price - a.price;
      }
      return sortDirection === 'asc' ? -comparison : comparison;
    });
  }, [filteredItems, sortMetric, sortDirection]);

  // Top metric highlights
  const bestGainer = useMemo(() => {
    return [...positiveItems].sort((a, b) => {
      if (sortMetric === 'dollar') return b.changeDollar - a.changeDollar;
      return b.changePercent - a.changePercent;
    })[0] || null;
  }, [positiveItems, sortMetric]);

  const worstLoser = useMemo(() => {
    return [...negativeItems].sort((a, b) => {
      if (sortMetric === 'dollar') return a.changeDollar - b.changeDollar;
      return a.changePercent - b.changePercent;
    })[0] || null;
  }, [negativeItems, sortMetric]);

  const mostVolatileItem = useMemo(() => {
    return [...filteredItems].sort((a, b) => b.volatilityScore - a.volatilityScore)[0] || null;
  }, [filteredItems]);

  const avgGain = positiveItems.length > 0
    ? (positiveItems.reduce((acc, s) => acc + s.changePercent, 0) / positiveItems.length).toFixed(2)
    : '0.00';

  const avgLoss = negativeItems.length > 0
    ? (negativeItems.reduce((acc, s) => acc + s.changePercent, 0) / negativeItems.length).toFixed(2)
    : '0.00';

  const avgSpread = filteredItems.length > 0
    ? (filteredItems.reduce((acc, s) => acc + s.intradaySpreadPercent, 0) / filteredItems.length).toFixed(1)
    : '0.0';

  // Toggle sort helper
  const handleSortToggle = (metric: 'volatility' | 'dollar' | 'percent' | 'spread' | 'volume' | 'price') => {
    if (sortMetric === metric) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortMetric(metric);
      setSortDirection('desc');
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Top Key Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Bullish Gainer Card */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Top Bullish Mover
            </span>
            <span className="text-slate-400 font-mono font-medium text-[11px]">
              {positiveItems.length} gainers
            </span>
          </div>

          {bestGainer ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {bestGainer.symbol}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      bestGainer.assetType === 'COMMODITY'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {bestGainer.assetType}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg inline-flex items-center">
                    <ArrowUpRight className="w-4 h-4 mr-0.5" />
                    {sortMetric === 'dollar'
                      ? `+$${bestGainer.changeDollar.toFixed(2)}`
                      : `+${bestGainer.changePercent}%`}
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-1">
                {bestGainer.name} <span className="text-slate-600">·</span> {bestGainer.category}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>
                  Price: <strong className="text-white">${bestGainer.price.toFixed(2)}</strong> {bestGainer.unit}
                </span>
                <span className="text-amber-400 font-semibold">Score: {bestGainer.volatilityScore}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No positive assets in current scan</div>
          )}
        </div>

        {/* Top Bearish Decline Card */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400 mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" /> Top Bearish Drop
            </span>
            <span className="text-slate-400 font-mono font-medium text-[11px]">
              {negativeItems.length} losers
            </span>
          </div>

          {worstLoser ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {worstLoser.symbol}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      worstLoser.assetType === 'COMMODITY'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {worstLoser.assetType}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg inline-flex items-center">
                    <ArrowDownRight className="w-4 h-4 mr-0.5" />
                    {sortMetric === 'dollar'
                      ? `-$${Math.abs(worstLoser.changeDollar).toFixed(2)}`
                      : `${worstLoser.changePercent}%`}
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-1">
                {worstLoser.name} <span className="text-slate-600">·</span> {worstLoser.category}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>
                  Price: <strong className="text-white">${worstLoser.price.toFixed(2)}</strong> {worstLoser.unit}
                </span>
                <span className="text-amber-400 font-semibold">Score: {worstLoser.volatilityScore}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No negative assets in current scan</div>
          )}
        </div>

        {/* Most Volatile Leader */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Highest Volatility Index
            </span>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
              Score: {mostVolatileItem?.volatilityScore ?? '--'}
            </span>
          </div>

          {mostVolatileItem ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {mostVolatileItem.symbol}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      mostVolatileItem.assetType === 'COMMODITY'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {mostVolatileItem.assetType}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  +{mostVolatileItem.intradaySpreadPercent}% spread
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-1">
                {mostVolatileItem.name}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>Avg Spread: <strong className="text-amber-400">+{avgSpread}%</strong></span>
                <span className={mostVolatileItem.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  Net: {mostVolatileItem.changePercent >= 0 ? '+' : ''}{mostVolatileItem.changePercent}%
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No volatile assets monitored</div>
          )}
        </div>

        {/* KV Persistence & Unified Feeds */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-purple-400" />
              Unified KV Namespaces
            </span>
            <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE</span>
            </span>
          </div>
          <div>
            <div className="text-base font-bold font-mono text-white mt-1 flex items-center justify-between">
              <span className="text-emerald-400">STOCKS_KV</span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400">COMMODITIES_KV</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 truncate">
              US Equities &amp; Global Commodity Exchanges
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
              <span>Assets: <strong className="text-white">{totalCombinedCount}</strong></span>
              <span className="text-amber-400 font-semibold">{period === 'week' ? '5D Week' : period === 'month' ? '1M Month' : '1D Day'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Control Toolbar: Asset Scope, Period, Sort Buttons, View Mode, Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-3.5">
        {/* Top Control Bar: Asset Scope Filter + Period Switcher + Refresh */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          {/* Asset Scope Segmented Switcher (Both / Stocks Only / Commodities Only) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-medium text-slate-400 mr-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Asset Universe:</span>
            </span>
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shadow-inner">
              <button
                type="button"
                onClick={() => setAssetFilter('ALL')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all flex items-center space-x-1.5 ${
                  assetFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Both Stocks &amp; Commodities</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    assetFilter === 'ALL' ? 'bg-slate-950/30 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {totalCombinedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAssetFilter('STOCKS')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all flex items-center space-x-1.5 ${
                  assetFilter === 'STOCKS'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Stocks Only</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    assetFilter === 'STOCKS' ? 'bg-slate-950/30 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {totalStocksCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAssetFilter('COMMODITIES')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all flex items-center space-x-1.5 ${
                  assetFilter === 'COMMODITIES'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Commodities Only</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    assetFilter === 'COMMODITIES' ? 'bg-slate-950/30 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {totalCommoditiesCount}
                </span>
              </button>
            </div>
          </div>

          {/* Time Period Selector (Day / Week / Month) & Refresh Button */}
          <div className="flex items-center gap-2 self-start xl:self-auto">
            {onSelectPeriod && (
              <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <span className="text-[11px] font-mono text-slate-400 font-semibold px-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Period:</span>
                </span>
                <button
                  type="button"
                  onClick={() => onSelectPeriod('day')}
                  className={`px-2.5 py-1 font-semibold rounded transition-all ${
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
                  className={`px-2.5 py-1 font-semibold rounded transition-all ${
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
                  className={`px-2.5 py-1 font-semibold rounded transition-all ${
                    period === 'month'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Month (1M)
                </button>
              </div>
            )}

            <button
              onClick={onRefresh}
              disabled={isScanning}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition-colors disabled:opacity-50"
              title="Rescan market volatility now"
            >
              <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Now</span>
            </button>
          </div>
        </div>

        {/* Second Control Bar: View Modes & Sort Controls (Dollar / Percent / Volatility Score / Spread / Volume / Price) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* View Mode Segmented Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
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
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'positive'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bullish Movers ({positiveItems.length})</span>
            </button>

            <button
              onClick={() => setViewMode('negative')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'negative'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Bearish Movers ({negativeItems.length})</span>
            </button>

            <button
              onClick={() => setViewMode('combined')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'combined'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Combined Master ({filteredItems.length})</span>
            </button>
          </div>

          {/* Sort Controls Matching the Gainers & Losers Tab */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-medium text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Sort by:</span>
            </span>

            {/* Sort Metric Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shadow-inner">
              <button
                type="button"
                onClick={() => handleSortToggle('volatility')}
                className={`px-2.5 py-1 font-semibold rounded transition-all flex items-center space-x-1 ${
                  sortMetric === 'volatility'
                    ? 'bg-purple-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by Composite Volatility Score"
              >
                <Activity className="w-3 h-3" />
                <span>Volatility Score</span>
              </button>

              <button
                type="button"
                onClick={() => handleSortToggle('dollar')}
                className={`px-2.5 py-1 font-semibold rounded transition-all flex items-center space-x-1 ${
                  sortMetric === 'dollar'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by Dollar Amount ($) gained or dropped"
              >
                <DollarSign className="w-3 h-3" />
                <span>Dollar ($)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSortToggle('percent')}
                className={`px-2.5 py-1 font-semibold rounded transition-all flex items-center space-x-1 ${
                  sortMetric === 'percent'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by Percentage (%) gained or dropped"
              >
                <Percent className="w-3 h-3" />
                <span>Percent (%)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSortToggle('spread')}
                className={`px-2.5 py-1 font-semibold rounded transition-all flex items-center space-x-1 ${
                  sortMetric === 'spread'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by Intraday Range Spread %"
              >
                <BarChart2 className="w-3 h-3" />
                <span>Spread %</span>
              </button>

              <button
                type="button"
                onClick={() => handleSortToggle('volume')}
                className={`px-2.5 py-1 font-semibold rounded transition-all flex items-center space-x-1 ${
                  sortMetric === 'volume'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by Dollar Turnover / Volume"
              >
                <span>Volume</span>
              </button>

              <button
                type="button"
                onClick={() => handleSortToggle('price')}
                className={`px-2.5 py-1 font-semibold rounded transition-all flex items-center space-x-1 ${
                  sortMetric === 'price'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by Current Price"
              >
                <span>Price</span>
              </button>
            </div>

            {/* Direction Toggle Button */}
            <button
              type="button"
              onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 text-xs font-mono font-semibold text-slate-300 border border-slate-800 hover:bg-slate-800 transition-colors"
              title={`Switch to ${sortDirection === 'desc' ? 'Ascending (Lowest first)' : 'Descending (Highest first)'}`}
            >
              <span>{sortDirection === 'desc' ? 'Highest First ▾' : 'Lowest First ▴'}</span>
            </button>
          </div>
        </div>

        {/* Third Row: Search, Category Filter, and Custom Ticker Injection */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Box */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search stocks, commodities, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            {/* Category / Sector Dropdown */}
            <select
              aria-label="Filter assets by sector or commodity category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400 cursor-pointer font-medium"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900">
                  {cat === 'ALL' ? 'All Sectors & Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Add Custom Ticker */}
          <form onSubmit={handleAddTicker} className="flex items-center space-x-1">
            <input
              type="text"
              placeholder="+ Equity Ticker"
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              className="bg-slate-950 text-xs text-white placeholder-slate-500 px-3 py-2 rounded-l-lg border border-r-0 border-slate-700/80 focus:outline-none focus:border-amber-400 font-mono uppercase w-28"
            />
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold px-3 py-2 rounded-r-lg border border-slate-700/80 transition-colors"
              title="Add equity ticker to monitored universe"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </form>
        </div>
      </div>

      {/* RENDER THE UNIFIED TABLES */}

      {/* 1. SPLIT VIEW: Both Bullish and Bearish Tables */}
      {viewMode === 'split' && (
        <div className="space-y-6">
          <UnifiedVolatileTable
            title="Bullish Volatile Movers (Equities & Commodities)"
            subtitle="Assets experiencing upward momentum, sorted by active volatility ranking"
            type="positive"
            items={sortedPositive}
            onInspectKey={onInspectKey}
            sortMetric={sortMetric}
            sortDirection={sortDirection}
            onSortToggle={handleSortToggle}
            assetFilter={assetFilter}
            onSelectAssetFilter={setAssetFilter}
          />

          <UnifiedVolatileTable
            title="Bearish Volatile Decliners (Equities & Commodities)"
            subtitle="Assets experiencing downward pressure, sorted by active volatility ranking"
            type="negative"
            items={sortedNegative}
            onInspectKey={onInspectKey}
            sortMetric={sortMetric}
            sortDirection={sortDirection}
            onSortToggle={handleSortToggle}
            assetFilter={assetFilter}
            onSelectAssetFilter={setAssetFilter}
          />
        </div>
      )}

      {/* 2. POSITIVE ONLY VIEW */}
      {viewMode === 'positive' && (
        <UnifiedVolatileTable
          title="Positive Performing Volatile Assets"
          subtitle="Top market gainers across stocks and commodities sorted by active metric"
          type="positive"
          items={sortedPositive}
          onInspectKey={onInspectKey}
          sortMetric={sortMetric}
          sortDirection={sortDirection}
          onSortToggle={handleSortToggle}
          assetFilter={assetFilter}
          onSelectAssetFilter={setAssetFilter}
        />
      )}

      {/* 3. NEGATIVE ONLY VIEW */}
      {viewMode === 'negative' && (
        <UnifiedVolatileTable
          title="Negative Performing Volatile Assets"
          subtitle="Top market drawdowns across stocks and commodities sorted by active metric"
          type="negative"
          items={sortedNegative}
          onInspectKey={onInspectKey}
          sortMetric={sortMetric}
          sortDirection={sortDirection}
          onSortToggle={handleSortToggle}
          assetFilter={assetFilter}
          onSelectAssetFilter={setAssetFilter}
        />
      )}

      {/* 4. COMBINED MASTER VIEW */}
      {viewMode === 'combined' && (
        <UnifiedVolatileTable
          title="All Volatile Assets (Master Composite Ranking)"
          subtitle="Unified comprehensive ranking of monitored equities and commodities"
          type="combined"
          items={sortedCombined}
          onInspectKey={onInspectKey}
          sortMetric={sortMetric}
          sortDirection={sortDirection}
          onSortToggle={handleSortToggle}
          assetFilter={assetFilter}
          onSelectAssetFilter={setAssetFilter}
        />
      )}
    </div>
  );
};

interface UnifiedVolatileTableProps {
  title: string;
  subtitle: string;
  type: 'positive' | 'negative' | 'combined';
  items: UnifiedVolatileItem[];
  onInspectKey: (key: string) => void;
  sortMetric: 'volatility' | 'dollar' | 'percent' | 'spread' | 'volume' | 'price';
  sortDirection: 'desc' | 'asc';
  onSortToggle: (metric: 'volatility' | 'dollar' | 'percent' | 'spread' | 'volume' | 'price') => void;
  assetFilter: 'ALL' | 'STOCKS' | 'COMMODITIES';
  onSelectAssetFilter: (f: 'ALL' | 'STOCKS' | 'COMMODITIES') => void;
}

const UnifiedVolatileTable: React.FC<UnifiedVolatileTableProps> = ({
  title,
  subtitle,
  type,
  items,
  onInspectKey,
  sortMetric,
  sortDirection,
  onSortToggle,
  assetFilter,
  onSelectAssetFilter,
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

  // Render SVG Sparkline
  const renderSparkline = (points: number[], positive: boolean) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 56;
    const height = 20;

    const coords = points
      .map((val, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const strokeColor = positive ? '#10b981' : '#f43f5e';

    return (
      <svg width={width} height={height} className="overflow-visible inline-block">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords}
        />
      </svg>
    );
  };

  return (
    <div className={`bg-slate-900 border ${borderColor} rounded-xl overflow-hidden shadow-xl transition-all`}>
      {/* Table Header Row */}
      <div className={`px-6 py-4 border-b border-slate-800 ${headerBg} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
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
                {items.length} Assets
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  assetFilter === 'ALL'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : assetFilter === 'STOCKS'
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {assetFilter === 'ALL' ? 'Stocks & Commodities' : assetFilter === 'STOCKS' ? 'Stocks Only' : 'Commodities Only'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {subtitle} · Sorted by{' '}
              <strong className="text-amber-300 font-mono">
                {sortMetric === 'dollar'
                  ? 'Dollar Amount ($)'
                  : sortMetric === 'percent'
                  ? 'Percentage (%)'
                  : sortMetric === 'volatility'
                  ? 'Volatility Score'
                  : sortMetric === 'spread'
                  ? 'Spread %'
                  : sortMetric.toUpperCase()}
              </strong>{' '}
              ({sortDirection === 'desc' ? 'Highest first' : 'Lowest first'})
            </p>
          </div>
        </div>

        {/* Quick In-Table Scope Selector & KV Tag */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onSelectAssetFilter('ALL')}
              className={`px-2 py-0.5 rounded font-sans text-[11px] font-medium transition-all ${
                assetFilter === 'ALL' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => onSelectAssetFilter('STOCKS')}
              className={`px-2 py-0.5 rounded font-sans text-[11px] font-medium transition-all ${
                assetFilter === 'STOCKS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stocks
            </button>
            <button
              type="button"
              onClick={() => onSelectAssetFilter('COMMODITIES')}
              className={`px-2 py-0.5 rounded font-sans text-[11px] font-medium transition-all ${
                assetFilter === 'COMMODITIES' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Commodities
            </button>
          </div>

          <span className="inline-flex items-center space-x-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>EXCHANGE FEED</span>
          </span>
        </div>
      </div>

      {/* Table Content */}
      {items.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          No {type === 'positive' ? 'positive' : type === 'negative' ? 'negative' : ''} volatile assets found in this filter range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Asset / Type / Category</th>

                {/* Clickable Column: Price */}
                <th
                  onClick={() => onSortToggle('price')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none"
                  title="Click to sort by Price"
                >
                  <div className="inline-flex items-center space-x-1">
                    <span>Price</span>
                    {sortMetric === 'price' && (
                      <span className="text-amber-400 font-mono text-[10px]">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>

                {/* Clickable Column: Dollar Gain/Drop */}
                <th
                  onClick={() => onSortToggle('dollar')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none"
                  title="Click to sort by Dollar Amount ($) gained or dropped"
                >
                  <div className="inline-flex items-center space-x-1">
                    <DollarSign className="w-3 h-3 text-amber-400" />
                    <span>Net $ Change</span>
                    {sortMetric === 'dollar' && (
                      <span className="text-amber-400 font-mono text-[10px]">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>

                {/* Clickable Column: Percentage Gain/Drop */}
                <th
                  onClick={() => onSortToggle('percent')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none"
                  title="Click to sort by Percentage (%) gained or dropped"
                >
                  <div className="inline-flex items-center space-x-1">
                    <Percent className="w-3 h-3 text-amber-400" />
                    <span>Change % ({items[0]?.periodLabel || '1D'})</span>
                    {sortMetric === 'percent' && (
                      <span className="text-amber-400 font-mono text-[10px]">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>

                <th className="py-3 px-4 min-w-[180px]">Period Range (Low → High)</th>

                {/* Clickable Column: Spread % */}
                <th
                  onClick={() => onSortToggle('spread')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none"
                  title="Click to sort by Range Spread %"
                >
                  <div className="inline-flex items-center space-x-1">
                    <span>Spread %</span>
                    {sortMetric === 'spread' && (
                      <span className="text-amber-400 font-mono text-[10px]">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>

                {/* Clickable Column: Volume */}
                <th
                  onClick={() => onSortToggle('volume')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors select-none"
                  title="Click to sort by Volume / Dollar Turnover"
                >
                  <div className="inline-flex items-center space-x-1">
                    <span>Traded Volume</span>
                    {sortMetric === 'volume' && (
                      <span className="text-amber-400 font-mono text-[10px]">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>

                {/* Trend sparkline */}
                <th className="py-3 px-4 text-center">Trend</th>

                {/* Clickable Column: Volatility Score */}
                <th
                  onClick={() => onSortToggle('volatility')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-white transition-colors select-none"
                  title="Click to sort by Volatility Score"
                >
                  <div className="inline-flex items-center space-x-1">
                    <span>Score</span>
                    {sortMetric === 'volatility' && (
                      <span className="text-amber-400 font-mono text-[10px]">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>

                <th className="py-3 px-4 text-center">KV Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {items.map((item, idx) => {
                const spread = item.intradaySpreadPercent;
                const score = item.volatilityScore;
                const isItemPositive = item.changePercent >= 0 || item.changeDollar >= 0;

                // Price position between low and high
                const pricePositionPct = item.high > item.low
                  ? Math.min(Math.max(((item.price - item.low) / (item.high - item.low)) * 100, 5), 95)
                  : 50;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-850/70 transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
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

                    {/* Symbol, Name, Asset Tag & Category */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold font-mono text-white text-sm flex items-center gap-2">
                          <span>{item.symbol}</span>
                          <span
                            className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded border ${
                              item.assetType === 'COMMODITY'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            }`}
                          >
                            {item.assetType}
                          </span>
                          {item.status === 'EXTREME' && (
                            <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              EXTREME
                            </span>
                          )}
                          {item.status === 'SURGING' && (
                            <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              SURGE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[190px] mt-0.5">
                          {item.name} <span className="text-slate-600">·</span> {item.category}
                        </div>
                      </div>
                    </td>

                    {/* Current Price */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 text-sm">
                      ${item.price.toFixed(2)}
                      {item.unit && item.unit !== 'shares' && (
                        <span className="text-[10px] text-slate-400 font-normal block">{item.unit}</span>
                      )}
                    </td>

                    {/* Net Change in Dollar ($) */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          isItemPositive
                            ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                            : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
                        }`}
                      >
                        {isItemPositive ? '+' : '-'}${Math.abs(item.changeDollar).toFixed(2)}
                      </span>
                    </td>

                    {/* Net Change in Percent (%) */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          isItemPositive
                            ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                            : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
                        }`}
                      >
                        {isItemPositive ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {isItemPositive ? '+' : ''}{item.changePercent}%
                      </span>
                    </td>

                    {/* Range Bar */}
                    <td className="py-3.5 px-4 min-w-[180px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                          <span>${item.low.toFixed(2)}</span>
                          <span className={isItemPositive ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                            ${item.high.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full relative overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isItemPositive
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-orange-500 to-rose-500'
                            }`}
                            style={{
                              width: `${pricePositionPct}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Spread % */}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-amber-400 text-xs">
                      +{spread}%
                    </td>

                    {/* Traded Volume & Dollar Turnover */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs">
                      <div>
                        <span className="font-bold text-white text-xs">
                          {item.volume >= 1000000
                            ? `${(item.volume / 1000000).toFixed(1)}M`
                            : `${(item.volume / 1000).toFixed(0)}K`}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {item.dollarVolume >= 1000000000
                            ? `$${(item.dollarVolume / 1000000000).toFixed(2)}B`
                            : `$${(item.dollarVolume / 1000000).toFixed(0)}M`}
                        </span>
                      </div>
                    </td>

                    {/* Mini Sparkline */}
                    <td className="py-3.5 px-4 text-center">
                      {renderSparkline(item.sparkline, isItemPositive)}
                    </td>

                    {/* Volatility Score */}
                    <td className="py-3.5 px-4 text-center">
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

                    {/* KV Inspector Button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onInspectKey(item.kvKey)}
                        className="inline-flex items-center space-x-1 text-xs text-slate-300 hover:text-cyan-300 bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors shadow-sm"
                        title={`Inspect KV namespace key: ${item.kvKey}`}
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
