/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VolatilityRadar } from './components/VolatilityRadar';
import { CommoditiesRadar } from './components/CommoditiesRadar';
import { KVExplorer } from './components/KVExplorer';
import { ApiConsole } from './components/ApiConsole';
import { CodeViewer } from './components/CodeViewer';
import { LogsConsole } from './components/LogsConsole';
import { workerSimulatorInstance } from './services/workerSimulator';
import { VolatilityScanResult } from './services/marketScanner';
import { CommodityScanResult } from './services/commodityScanner';
import { kvNamespaceInstance } from './services/kvStore';
import {
  Flame,
  Database,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('radar');
  const [scanResult, setScanResult] = useState<VolatilityScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [commodityScanResult, setCommodityScanResult] = useState<CommodityScanResult | null>(null);
  const [isCommodityScanning, setIsCommodityScanning] = useState(false);
  const [selectedKeyForKV, setSelectedKeyForKV] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(10);

  // Initialize and run initial scan on mount
  useEffect(() => {
    const init = async () => {
      setIsScanning(true);
      setIsCommodityScanning(true);

      const [res, commRes] = await Promise.all([
        workerSimulatorInstance.triggerScheduledCron(),
        workerSimulatorInstance.triggerCommoditiesScan(),
      ]);

      if (res) setScanResult(res);
      if (commRes) setCommodityScanResult(commRes);

      setIsScanning(false);
      setIsCommodityScanning(false);
    };

    init();
  }, []);

  // Continuous Real-Time Streaming Interval
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger silent background real-time sync
          if (activeTab === 'commodities') {
            workerSimulatorInstance.triggerCommoditiesScan().then((res) => {
              if (res) setCommodityScanResult(res);
            });
          } else {
            workerSimulatorInstance.triggerScheduledCron().then((res) => {
              if (res) setScanResult(res);
            });
          }
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, activeTab]);

  const handleTriggerScan = async () => {
    setIsScanning(true);
    const res = await workerSimulatorInstance.triggerScheduledCron();
    if (res) {
      setScanResult(res);
    }
    setIsScanning(false);
    setCountdown(10);
  };

  const handleTriggerCommoditiesScan = async () => {
    setIsCommodityScanning(true);
    const res = await workerSimulatorInstance.triggerCommoditiesScan();
    if (res) {
      setCommodityScanResult(res);
    }
    setIsCommodityScanning(false);
    setCountdown(10);
  };

  const handleInspectKey = (key: string) => {
    setSelectedKeyForKV(key);
    setActiveTab('kv');
  };

  // Top ticker items combining most active stocks and commodities
  const tickerItems = [
    ...(scanResult?.topVolatileStocks.slice(0, 8).map(s => ({
      symbol: s.symbol,
      price: `$${s.price.toFixed(2)}`,
      changePercent: s.changePercent,
      isPositive: s.changePercent >= 0,
      type: 'STOCK',
    })) || []),
    ...(commodityScanResult?.topVolatileCommodities.slice(0, 6).map(c => ({
      symbol: c.tickerCode,
      price: `$${c.price.toFixed(2)}`,
      changePercent: c.changePercent,
      isPositive: c.changePercent >= 0,
      type: 'COMMODITY',
    })) || []),
  ];

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Interactive Top Header */}
      <Header
        onScanTriggered={handleTriggerScan}
        isScanning={isScanning || isCommodityScanning}
        onSelectTab={setActiveTab}
        activeTab={activeTab}
        isRealTime={true}
        dataSource={scanResult?.dataSource || 'US Financial Exchanges Live'}
        lastSyncTime={scanResult?.lastSyncTime}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        countdownSeconds={countdown}
      />

      {/* Real-Time Live Ticker Tape Bar */}
      <div className="bg-[#0b0d13] border-b border-slate-800/80 py-2 px-4 overflow-hidden relative shadow-inner">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold text-white uppercase tracking-wider">Live Exchange Feed:</span>
            <span className="text-emerald-400 hidden sm:inline">100% Real-Time</span>
          </div>

          <div className="flex items-center space-x-5 overflow-x-auto no-scrollbar font-mono text-xs">
            {tickerItems.map((item, idx) => (
              <div key={`${item.symbol}-${idx}`} className="flex items-center space-x-1.5 flex-shrink-0">
                <span className="font-bold text-slate-200">{item.symbol}</span>
                <span className="text-slate-300">{item.price}</span>
                <span
                  className={`text-[11px] font-semibold px-1 rounded ${
                    item.isPositive ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                  }`}
                >
                  {item.isPositive ? '+' : ''}{item.changePercent}%
                </span>
              </div>
            ))}
          </div>

          <div className="hidden lg:flex items-center space-x-2 text-[11px] font-mono text-slate-400 flex-shrink-0">
            <span>Next sync in:</span>
            <strong className="text-amber-400 font-bold">{countdown}s</strong>
          </div>
        </div>
      </div>

      {/* Main App Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'radar' && (
          <VolatilityRadar
            scanResult={scanResult}
            onInspectKey={handleInspectKey}
            onRefresh={handleTriggerScan}
          />
        )}

        {activeTab === 'commodities' && (
          <CommoditiesRadar
            scanResult={commodityScanResult}
            onInspectKey={handleInspectKey}
            onRefresh={handleTriggerCommoditiesScan}
            isScanning={isCommodityScanning}
          />
        )}

        {activeTab === 'kv' && (
          <KVExplorer
            selectedKeyFromRadar={selectedKeyForKV}
            onClearSelectedKey={() => setSelectedKeyForKV(null)}
          />
        )}

        {activeTab === 'api' && (
          <ApiConsole onScanDone={handleTriggerScan} />
        )}

        {activeTab === 'code' && (
          <CodeViewer />
        )}

        {activeTab === 'logs' && (
          <LogsConsole />
        )}
      </main>

      {/* Footer Info */}
      <footer className="border-t border-white/[0.06] bg-[#090b10] py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-400">
              Cloudflare Worker Engine · Automated Stock Volatility Tracking with KV Namespace Persistence
            </span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-400">
            <span>Cron: */5 13-20 * * 1-5</span>
            <span className="text-slate-600">·</span>
            <span>KV: STOCKS_KV</span>
            <span className="text-slate-600">·</span>
            <span>Edge V8</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
