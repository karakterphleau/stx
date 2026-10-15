import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Split,
  Layers,
  Database,
  RotateCw,
  DollarSign,
  Percent,
  SlidersHorizontal,
  Activity,
  CheckCircle2,
  ExternalLink,
  Zap,
  BarChart2,
  Wheat,
} from 'lucide-react';
import { VolatilityScanResult, StockQuote, TimePeriod } from '../services/marketScanner';
import { CommodityScanResult, CommodityQuote } from '../services/commodityScanner';
import { AllMarketScanResult } from '../services/allMarketScanner';

export interface UnifiedMover {
  id: string;
  symbol: string;
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
  dollarVolume: number;
  sparkline: number[];
  timestamp: string;
  isRealTime: boolean;
  unit?: string;
  kvKey: string;
  period?: TimePeriod;
  periodLabel?: string;
}

interface GainersLosersRadarProps {
  scanResult: VolatilityScanResult | null;
  commodityScanResult: CommodityScanResult | null;
  allMarketScanResult?: AllMarketScanResult | null;
  onInspectKey: (key: string) => void;
  onRefresh: () => void;
  isScanning?: boolean;
  period?: TimePeriod;
  onSelectPeriod?: (period: TimePeriod) => void;
}

export const GainersLosersRadar: React.FC<GainersLosersRadarProps> = ({
  scanResult,
  commodityScanResult,
  allMarketScanResult,
  onInspectKey,
  onRefresh,
  isScanning = false,
  period = 'day',
  onSelectPeriod,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'STOCKS' | 'COMMODITIES'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'split' | 'gainers' | 'losers' | 'combined'>('split');
  // Sort metric: 'dollar' (dollar amounts) vs 'percent' (percentage), plus volume and price
  const [sortMetric, setSortMetric] = useState<'dollar' | 'percent' | 'volume' | 'price'>('dollar');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Build unified dataset from full market universe & commodities
  const unifiedMovers: UnifiedMover[] = useMemo(() => {
    const list: UnifiedMover[] = [];

    // 1. Stocks from ALL OF THE MARKET (NYSE, NASDAQ, AMEX)
    const marketStocks = (allMarketScanResult && allMarketScanResult.stocks && allMarketScanResult.stocks.length > 0)
      ? allMarketScanResult.stocks
      : (scanResult?.topVolatileStocks || []);

    marketStocks.forEach((stock) => {
      list.push({
        id: `stock-${stock.symbol}`,
        symbol: stock.symbol,
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
        dollarVolume: stock.dollarVolume,
        sparkline: stock.sparkline || [stock.previousClose, stock.price],
        timestamp: stock.timestamp,
        isRealTime: !!stock.isRealTime,
        unit: 'shares',
        kvKey: ('kvKey' in stock && stock.kvKey) ? (stock as any).kvKey : `ticker:${stock.symbol}:latest`,
        period: stock.period || period,
        periodLabel: stock.periodLabel || (period === 'week' ? 'Week (5D)' : period === 'month' ? 'Month (30D)' : 'Day (1D)'),
      });
    });

    // 2. Commodities
    if (commodityScanResult?.topVolatileCommodities) {
      commodityScanResult.topVolatileCommodities.forEach((comm) => {
        list.push({
          id: `comm-${comm.symbol}`,
          symbol: comm.tickerCode,
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
          dollarVolume: comm.dollarVolume,
          sparkline: comm.sparkline || [comm.previousClose, comm.price],
          timestamp: comm.timestamp,
          isRealTime: !!comm.isRealTime,
          unit: comm.unit,
          kvKey: `commodity:${comm.symbol}:latest`,
          period: comm.period || period,
          periodLabel: comm.periodLabel || (period === 'week' ? 'Week (5D)' : period === 'month' ? 'Month (30D)' : 'Day (1D)'),
        });
      });
    }

    return list;
  }, [allMarketScanResult, scanResult, commodityScanResult, period]);

  const totalStocksCount = useMemo(() => {
    return unifiedMovers.filter((m) => m.assetType === 'STOCK').length;
  }, [unifiedMovers]);

  const totalCommoditiesCount = useMemo(() => {
    return unifiedMovers.filter((m) => m.assetType === 'COMMODITY').length;
  }, [unifiedMovers]);

  // Dynamic available categories from the unified market universe
  const availableCategories = useMemo(() => {
    const relevant = unifiedMovers.filter((item) => {
      if (assetFilter === 'STOCKS') return item.assetType === 'STOCK';
      if (assetFilter === 'COMMODITIES') return item.assetType === 'COMMODITY';
      return true;
    });
    return ['ALL', ...Array.from(new Set(relevant.map((i) => i.category)))];
  }, [unifiedMovers, assetFilter]);

  // Filter by asset type, category & search query
  const filteredMovers = useMemo(() => {
    return unifiedMovers.filter((item) => {
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
  }, [unifiedMovers, assetFilter, categoryFilter, searchQuery]);

  // Separate positive and negative movers
  const gainers = useMemo(() => {
    return filteredMovers.filter((m) => m.changeDollar > 0 || m.changePercent > 0);
  }, [filteredMovers]);

  const losers = useMemo(() => {
    return filteredMovers.filter((m) => m.changeDollar < 0 || m.changePercent < 0);
  }, [filteredMovers]);

  // Sorter helper function
  const sortMovers = (items: UnifiedMover[], isLoserGroup = false) => {
    return [...items].sort((a, b) => {
      let comparison = 0;

      if (sortMetric === 'dollar') {
        // When sorting gainers vs losers specifically, sort by absolute magnitude of dollar gain or drop
        const valA = isLoserGroup ? Math.abs(a.changeDollar) : a.changeDollar;
        const valB = isLoserGroup ? Math.abs(b.changeDollar) : b.changeDollar;
        comparison = valB - valA;
      } else if (sortMetric === 'percent') {
        const valA = isLoserGroup ? Math.abs(a.changePercent) : a.changePercent;
        const valB = isLoserGroup ? Math.abs(b.changePercent) : b.changePercent;
        comparison = valB - valA;
      } else if (sortMetric === 'volume') {
        comparison = b.volume - a.volume;
      } else if (sortMetric === 'price') {
        comparison = b.price - a.price;
      }

      return sortDirection === 'asc' ? -comparison : comparison;
    });
  };

  const sortedGainers = useMemo(() => sortMovers(gainers, false), [gainers, sortMetric, sortDirection]);
  const sortedLosers = useMemo(() => sortMovers(losers, true), [losers, sortMetric, sortDirection]);

  // Combined sorted list for the 'combined' view
  const sortedCombined = useMemo(() => {
    return [...filteredMovers].sort((a, b) => {
      let comparison = 0;
      if (sortMetric === 'dollar') {
        comparison = Math.abs(b.changeDollar) - Math.abs(a.changeDollar);
      } else if (sortMetric === 'percent') {
        comparison = Math.abs(b.changePercent) - Math.abs(a.changePercent);
      } else if (sortMetric === 'volume') {
        comparison = b.volume - a.volume;
      } else if (sortMetric === 'price') {
        comparison = b.price - a.price;
      }
      return sortDirection === 'asc' ? -comparison : comparison;
    });
  }, [filteredMovers, sortMetric, sortDirection]);

  // Top metric highlights
  const topPercentGainer = useMemo(() => {
    return [...gainers].sort((a, b) => b.changePercent - a.changePercent)[0] || null;
  }, [gainers]);

  const topDollarGainer = useMemo(() => {
    return [...gainers].sort((a, b) => b.changeDollar - a.changeDollar)[0] || null;
  }, [gainers]);

  const topPercentLoser = useMemo(() => {
    return [...losers].sort((a, b) => a.changePercent - b.changePercent)[0] || null;
  }, [losers]);

  const topDollarLoser = useMemo(() => {
    return [...losers].sort((a, b) => a.changeDollar - b.changeDollar)[0] || null;
  }, [losers]);

  // Market Breadth calculation
  const totalGainers = gainers.length;
  const totalLosers = losers.length;
  const totalCount = totalGainers + totalLosers;
  const advanceDeclineRatio = totalLosers > 0 ? (totalGainers / totalLosers).toFixed(2) : totalGainers.toString();
  const gainerPct = totalCount > 0 ? Math.round((totalGainers / totalCount) * 100) : 50;

  // Average calculations
  const avgGainerDollar = gainers.length > 0
    ? (gainers.reduce((acc, g) => acc + g.changeDollar, 0) / gainers.length).toFixed(2)
    : '0.00';
  const avgGainerPercent = gainers.length > 0
    ? (gainers.reduce((acc, g) => acc + g.changePercent, 0) / gainers.length).toFixed(2)
    : '0.00';
  const avgLoserDollar = losers.length > 0
    ? (losers.reduce((acc, l) => acc + l.changeDollar, 0) / losers.length).toFixed(2)
    : '0.00';
  const avgLoserPercent = losers.length > 0
    ? (losers.reduce((acc, l) => acc + l.changePercent, 0) / losers.length).toFixed(2)
    : '0.00';

  // Toggle sort helper
  const handleSortToggle = (metric: 'dollar' | 'percent' | 'volume' | 'price') => {
    if (sortMetric === metric) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortMetric(metric);
      setSortDirection('desc');
    }
  };

  // Sparkline renderer
  const renderSparkline = (points: number[], isPositive: boolean) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 64;
    const height = 24;

    const coords = points
      .map((val, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const strokeColor = isPositive ? '#10b981' : '#f43f5e';
    const fillColor = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';

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

  // Render unified table component
  const renderTable = (
    items: UnifiedMover[],
    title: string,
    type: 'gainers' | 'losers' | 'combined',
    emptyMessage: string
  ) => {
    const isGainerTable = type === 'gainers';
    const isLoserTable = type === 'losers';

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
        {/* Table Header Bar */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                isGainerTable
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : isLoserTable
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isGainerTable ? (
                <TrendingUp className="w-4 h-4" />
              ) : isLoserTable ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <ArrowUpDown className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  {items.length} {items.length === 1 ? 'asset' : 'assets'}
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
                  {assetFilter === 'ALL'
                    ? 'All Market Equities & Commodities'
                    : assetFilter === 'STOCKS'
                    ? 'All Market Equities'
                    : 'Only Commodities'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sorted across the whole market by{' '}
                <strong className="text-amber-300">
                  {sortMetric === 'dollar'
                    ? 'Dollar Amount ($)'
                    : sortMetric === 'percent'
                    ? 'Percentage (%)'
                    : sortMetric.toUpperCase()}
                </strong>{' '}
                ({sortDirection === 'desc' ? 'Highest first' : 'Lowest first'})
              </p>
            </div>
          </div>

          {/* In-Table Asset Scope Selector: Both / Only Stocks / Only Commodities */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shadow-inner">
              <span className="text-[11px] font-mono font-medium text-slate-400 px-2 hidden sm:inline">
                Table Scope:
              </span>
              <button
                type="button"
                onClick={() => setAssetFilter('ALL')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  assetFilter === 'ALL'
                    ? 'bg-slate-800 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                title="View both Stocks and Commodities in this table"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Both</span>
                <span className="text-[10px] font-mono text-slate-300 bg-slate-900 px-1 rounded ml-0.5">
                  {unifiedMovers.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAssetFilter('STOCKS')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  assetFilter === 'STOCKS'
                    ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                title="View only Stocks in this table"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Only Stocks</span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-1 rounded ml-0.5">
                  {totalStocksCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAssetFilter('COMMODITIES')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  assetFilter === 'COMMODITIES'
                    ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                title="View only Commodities in this table"
              >
                <Wheat className="w-3.5 h-3.5 text-amber-400" />
                <span>Only Commodities</span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950 px-1 rounded ml-0.5">
                  {totalCommoditiesCount}
                </span>
              </button>
            </div>

            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-1 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>LIVE FEED</span>
              </span>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="py-14 text-center px-4 bg-slate-950/30">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 border border-slate-700">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-slate-200 text-sm font-semibold mb-1">
                {assetFilter === 'STOCKS'
                  ? 'No stocks match the current movers criteria.'
                  : assetFilter === 'COMMODITIES'
                  ? 'No commodities match the current movers criteria.'
                  : emptyMessage}
              </p>
              <p className="text-slate-400 text-xs mb-4 max-w-md mx-auto">
                {assetFilter !== 'ALL'
                  ? `Currently viewing only ${assetFilter === 'STOCKS' ? 'stocks' : 'commodities'}. Switch to Both to include all asset classes.`
                  : 'Try adjusting your search query or refreshing quotes.'}
              </p>
              {assetFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setAssetFilter('ALL')}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-colors shadow-sm"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>View Both Stocks & Commodities</span>
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">Asset</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSortToggle('price')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Price</span>
                      {sortMetric === 'price' && (
                        <span className="text-amber-400">
                          {sortDirection === 'desc' ? '▼' : '▲'}
                        </span>
                      )}
                    </div>
                  </th>
                  {/* Dollar Amount Sortable Column */}
                  <th
                    className={`py-3 px-3 text-right cursor-pointer select-none transition-all ${
                      sortMetric === 'dollar'
                        ? 'text-amber-300 bg-amber-500/10 font-bold border-b-2 border-amber-400'
                        : 'hover:text-white'
                    }`}
                    onClick={() => handleSortToggle('dollar')}
                    title="Click to sort by dollar amount gained or dropped"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>$ Change ({period === 'week' ? '5D' : period === 'month' ? '1M' : '1D'})</span>
                      {sortMetric === 'dollar' && (
                        <span className="text-amber-400 font-bold">
                          {sortDirection === 'desc' ? '▼' : '▲'}
                        </span>
                      )}
                    </div>
                  </th>
                  {/* Percentage Sortable Column */}
                  <th
                    className={`py-3 px-3 text-right cursor-pointer select-none transition-all ${
                      sortMetric === 'percent'
                        ? 'text-amber-300 bg-amber-500/10 font-bold border-b-2 border-amber-400'
                        : 'hover:text-white'
                    }`}
                    onClick={() => handleSortToggle('percent')}
                    title="Click to sort by percentage gained or dropped"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <Percent className="w-3.5 h-3.5" />
                      <span>% Change ({period === 'week' ? '5D' : period === 'month' ? '1M' : '1D'})</span>
                      {sortMetric === 'percent' && (
                        <span className="text-amber-400 font-bold">
                          {sortDirection === 'desc' ? '▼' : '▲'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right hidden md:table-cell">Period Base</th>
                  <th className="py-3 px-3 hidden lg:table-cell">Range ({period === 'week' ? '5D' : period === 'month' ? '1M' : '1D'})</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors select-none hidden sm:table-cell"
                    onClick={() => handleSortToggle('volume')}
                    title="Click to sort by trade volume"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Volume</span>
                      {sortMetric === 'volume' && (
                        <span className="text-amber-400">
                          {sortDirection === 'desc' ? '▼' : '▲'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center hidden xl:table-cell w-20">Trend</th>
                  <th className="py-3 px-3 text-center w-16">KV Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {items.map((item, idx) => {
                  const isPositive = item.changeDollar >= 0;
                  const rangeSpan = item.high - item.low || 1;
                  const rangePct = Math.min(
                    100,
                    Math.max(0, ((item.price - item.low) / rangeSpan) * 100)
                  );

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Rank Number */}
                      <td className="py-3 px-3 text-center text-slate-400 font-bold text-[11px]">
                        #{idx + 1}
                      </td>

                      {/* Asset Symbol & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-bold text-sm tracking-tight group-hover:text-amber-400 transition-colors">
                            {item.symbol}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (assetFilter === 'ALL') {
                                setAssetFilter(item.assetType === 'STOCK' ? 'STOCKS' : 'COMMODITIES');
                              } else {
                                setAssetFilter('ALL');
                              }
                            }}
                            title={`Currently viewing ${assetFilter === 'ALL' ? 'both' : assetFilter === 'STOCKS' ? 'only stocks' : 'only commodities'}. Click to toggle.`}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider transition-all hover:scale-105 cursor-pointer ${
                              item.assetType === 'STOCK'
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 hover:border-cyan-400'
                                : 'bg-amber-950/80 text-amber-300 border border-amber-800/60 hover:border-amber-400'
                            }`}
                          >
                            {item.assetType}
                          </button>
                          {item.isRealTime && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" title="Live real-time feed" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-300 font-sans font-medium truncate max-w-[160px] sm:max-w-[200px]">
                          {item.name} <span className="text-slate-400">· {item.category}</span>
                        </div>
                      </td>

                      {/* Current Price */}
                      <td className="py-3 px-3 text-right font-bold text-white text-xs sm:text-sm">
                        ${item.price.toFixed(2)}
                      </td>

                      {/* Dollar Change ($) - Highlighted and Sortable */}
                      <td
                        className={`py-3 px-3 text-right font-bold text-xs sm:text-sm ${
                          sortMetric === 'dollar' ? 'bg-amber-500/5' : ''
                        } ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        <div className="flex items-center justify-end font-mono">
                          <span>{isPositive ? '+' : ''}${item.changeDollar.toFixed(2)}</span>
                        </div>
                      </td>

                      {/* Percentage Change (%) - Highlighted and Sortable */}
                      <td
                        className={`py-3 px-3 text-right ${
                          sortMetric === 'percent' ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <span
                          className={`inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md text-xs font-bold font-mono ${
                            isPositive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                          )}
                          <span>
                            {isPositive ? '+' : ''}
                            {item.changePercent.toFixed(2)}%
                          </span>
                        </span>
                      </td>

                      {/* Previous Close */}
                      <td className="py-3 px-3 text-right text-slate-300 text-xs hidden md:table-cell">
                        ${item.previousClose.toFixed(2)}
                      </td>

                      {/* Day Range Low - High with Position Bar */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>${item.low.toFixed(1)}</span>
                            <span>${item.high.toFixed(1)}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full ${
                                isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${rangePct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Traded Volume & Dollar Volume */}
                      <td className="py-3 px-3 text-right hidden sm:table-cell font-mono">
                        <div className="text-white font-semibold">
                          {item.volume >= 1_000_000
                            ? `${(item.volume / 1_000_000).toFixed(2)}M`
                            : item.volume.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          ${(item.dollarVolume / 1_000_000).toFixed(1)}M vol
                        </div>
                      </td>

                      {/* Sparkline */}
                      <td className="py-3 px-3 text-center hidden xl:table-cell">
                        {renderSparkline(item.sparkline, isPositive)}
                      </td>

                      {/* Action KV Link */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onInspectKey(item.kvKey)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/60 transition-colors"
                          title={`Inspect ${item.kvKey} in Cloudflare KV`}
                        >
                          <Database className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Scope Banner: All Market Coverage */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400">
            <ArrowUpDown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                All-Market Gainers &amp; Losers
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% WHOLE MARKET
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                NYSE · NASDAQ · AMEX
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live ranking of highest gainers and losers from across the entire market ({totalStocksCount} equities &amp; {totalCommoditiesCount} global commodities) — not restricted to volatile stocks.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span className="text-emerald-400">● Live Screener</span>
          <span className="text-slate-600">·</span>
          <span>Period: <strong className="text-amber-400 font-bold">{period === 'week' ? 'Week (5D)' : period === 'month' ? 'Month (30D)' : 'Day (1D)'}</strong></span>
        </div>
      </div>

      {/* Top 4 Performance Cards (Matching existing layout style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Top Dollar Gainer */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-2">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Top Dollar Gainer ($)
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              DOLLAR GAIN
            </span>
          </div>

          {topDollarGainer ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {topDollarGainer.symbol}
                </span>
                <span className="text-base font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center">
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />+${topDollarGainer.changeDollar.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-1">
                {topDollarGainer.name} · {topDollarGainer.category}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>Price: <strong className="text-white">${topDollarGainer.price.toFixed(2)}</strong></span>
                <span className="text-emerald-400 font-semibold">+{topDollarGainer.changePercent.toFixed(2)}%</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No positive gainers in scan</div>
          )}
        </div>

        {/* Card 2: Top Percentage Gainer */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Percent className="w-4 h-4" /> Top Percentage Gainer (%)
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              % SURGE
            </span>
          </div>

          {topPercentGainer ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {topPercentGainer.symbol}
                </span>
                <span className="text-base font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center">
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />+{topPercentGainer.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-1">
                {topPercentGainer.name} · {topPercentGainer.category}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>Price: <strong className="text-white">${topPercentGainer.price.toFixed(2)}</strong></span>
                <span className="text-emerald-400 font-semibold">+${topPercentGainer.changeDollar.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No positive percentage moves</div>
          )}
        </div>

        {/* Card 3: Top Dollar Loser */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400 mb-2">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Top Dollar Drop ($)
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              DOLLAR DROP
            </span>
          </div>

          {topDollarLoser ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {topDollarLoser.symbol}
                </span>
                <span className="text-base font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg flex items-center">
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />-${Math.abs(topDollarLoser.changeDollar).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-1">
                {topDollarLoser.name} · {topDollarLoser.category}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>Price: <strong className="text-white">${topDollarLoser.price.toFixed(2)}</strong></span>
                <span className="text-rose-400 font-semibold">{topDollarLoser.changePercent.toFixed(2)}%</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No declining assets in scan</div>
          )}
        </div>

        {/* Card 4: Top Percentage Loser */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Percent className="w-4 h-4" /> Top Percentage Drop (%)
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              % DROP
            </span>
          </div>

          {topPercentLoser ? (
            <div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {topPercentLoser.symbol}
                </span>
                <span className="text-base font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg flex items-center">
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />{topPercentLoser.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-1">
                {topPercentLoser.name} · {topPercentLoser.category}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 font-mono">
                <span>Price: <strong className="text-white">${topPercentLoser.price.toFixed(2)}</strong></span>
                <span className="text-rose-400 font-semibold">-${Math.abs(topPercentLoser.changeDollar).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 italic">No percentage drops detected</div>
          )}
        </div>
      </div>

      {/* Market Breadth & Sentiment Summary Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Advancers vs Decliners Bar */}
        <div className="w-full md:w-1/2 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {totalGainers} Advancers ({gainerPct}%)
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              A/D Ratio: <strong className="text-white">{advanceDeclineRatio}</strong>
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> {totalLosers} Decliners ({100 - gainerPct}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
              style={{ width: `${gainerPct}%` }}
              title={`Advancers: ${gainerPct}%`}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-500"
              style={{ width: `${100 - gainerPct}%` }}
              title={`Decliners: ${100 - gainerPct}%`}
            />
          </div>
        </div>

        {/* Averages & Live Indicators */}
        <div className="w-full md:w-1/2 flex flex-wrap items-center justify-between md:justify-end gap-3 sm:gap-6 text-xs font-mono">
          <div className="text-left sm:text-right">
            <div className="text-[11px] text-slate-400">Avg Gain</div>
            <div className="text-emerald-400 font-bold">
              +${avgGainerDollar} ({avgGainerPercent}%)
            </div>
          </div>

          <div className="text-left sm:text-right border-l border-slate-800 pl-3 sm:pl-6">
            <div className="text-[11px] text-slate-400">Avg Drop</div>
            <div className="text-rose-400 font-bold">
              -${Math.abs(parseFloat(avgLoserDollar)).toFixed(2)} ({avgLoserPercent}%)
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isScanning}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-sans transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Syncing...' : 'Refresh Quotes'}</span>
          </button>
        </div>
      </div>

      {/* Control Toolbar: Search, Asset Filter, View Mode, and Sort Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input & Sector/Category Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all market tickers, names, or sectors..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-mono"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category / Sector Selector */}
            <select
              aria-label="Filter by Sector or Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer font-medium"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900">
                  {cat === 'ALL' ? 'All Market Sectors & Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Class Filter Tabs: Both / Only Stocks / Only Commodities */}
          <div className="flex items-center space-x-2 self-start lg:self-auto">
            <span className="text-[11px] font-mono text-slate-400 font-semibold hidden sm:inline">
              Table Scope:
            </span>
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto text-xs shadow-inner">
              <button
                type="button"
                onClick={() => setAssetFilter('ALL')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                  assetFilter === 'ALL'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="View both Stocks and Commodities in the table"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Both (Stocks & Commodities)</span>
                <span className="text-[10px] font-mono text-slate-300 bg-slate-850 px-1.5 py-0.5 rounded ml-1">
                  {unifiedMovers.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAssetFilter('STOCKS')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                  assetFilter === 'STOCKS'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="View only Stocks in the table"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Only Stocks</span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/80 ml-1">
                  {totalStocksCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAssetFilter('COMMODITIES')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                  assetFilter === 'COMMODITIES'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="View only Commodities in the table"
              >
                <Wheat className="w-3.5 h-3.5 text-amber-400" />
                <span>Only Commodities</span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800/80 ml-1">
                  {totalCommoditiesCount}
                </span>
              </button>
            </div>
          </div>

          {/* Period Selector in GainersLosersRadar Toolbar */}
          {onSelectPeriod && (
            <div className="flex items-center space-x-2 self-start lg:self-auto">
              <span className="text-[11px] font-mono text-slate-400 font-semibold hidden sm:inline">
                Period:
              </span>
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shadow-inner">
                <button
                  type="button"
                  onClick={() => onSelectPeriod('day')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                    period === 'day'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Show daily moves (1D)"
                >
                  Day (1D)
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPeriod('week')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                    period === 'week'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Show weekly moves (5D)"
                >
                  Week (5D)
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPeriod('month')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                    period === 'month'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Show monthly moves (1M / 30D)"
                >
                  Month (1M)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Mode & Sort Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'split'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-cyan-400" />
              <span>Split Tables</span>
            </button>
            <button
              onClick={() => setViewMode('gainers')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'gainers'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gainers Only ({gainers.length})</span>
            </button>
            <button
              onClick={() => setViewMode('losers')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'losers'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Losers Only ({losers.length})</span>
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === 'combined'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Unified Rank ({filteredMovers.length})</span>
            </button>
          </div>

          {/* PRIMARY SORT CONTROLS: SORT BY DOLLAR AMOUNT ($) vs PERCENTAGE (%) */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            <span className="text-[11px] font-mono text-slate-400 px-2 font-semibold hidden md:inline">
              Sort by:
            </span>

            {/* Sort by Dollar Amount ($) */}
            <button
              onClick={() => handleSortToggle('dollar')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                sortMetric === 'dollar'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
              title="Sort by dollar amounts gained or dropped"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Dollar Amount ($)</span>
              {sortMetric === 'dollar' && (
                <span className="font-mono text-[10px]">
                  {sortDirection === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </button>

            {/* Sort by Percentage (%) */}
            <button
              onClick={() => handleSortToggle('percent')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                sortMetric === 'percent'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
              title="Sort by percentage gained or dropped"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Percentage (%)</span>
              {sortMetric === 'percent' && (
                <span className="font-mono text-[10px]">
                  {sortDirection === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </button>

            {/* Sort Direction Toggle */}
            <button
              onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={`Currently: ${sortDirection === 'desc' ? 'Highest to Lowest' : 'Lowest to Highest'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Tables Display */}
      {viewMode === 'split' && (
        <div className="space-y-6">
          {/* Top Gainers Table */}
          {renderTable(
            sortedGainers,
            'Top Gainers Leaderboard',
            'gainers',
            'No positive gainers match the current filters.'
          )}

          {/* Top Losers Table */}
          {renderTable(
            sortedLosers,
            'Top Losers Leaderboard',
            'losers',
            'No declining assets match the current filters.'
          )}
        </div>
      )}

      {viewMode === 'gainers' && (
        renderTable(
          sortedGainers,
          'Highest Market Gainers (Advancers)',
          'gainers',
          'No gainers match the current filters.'
        )
      )}

      {viewMode === 'losers' && (
        renderTable(
          sortedLosers,
          'Highest Market Losers (Decliners)',
          'losers',
          'No losers match the current filters.'
        )
      )}

      {viewMode === 'combined' && (
        renderTable(
          sortedCombined,
          'Combined Market Movers (Ranked by Absolute Magnitude)',
          'combined',
          'No assets match the current filters.'
        )
      )}

      {/* Cloudflare KV Persistence Documentation Footnote */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            Market movers are automatically sorted and serialized into Cloudflare KV under{' '}
            <code className="text-cyan-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              latest_volatile_stocks
            </code>{' '}
            and individual keys.
          </span>
        </div>
        <button
          onClick={() => onInspectKey('latest_volatile_stocks')}
          className="text-cyan-400 hover:text-cyan-300 font-semibold font-mono flex items-center space-x-1 flex-shrink-0"
        >
          <span>Open KV Explorer</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
