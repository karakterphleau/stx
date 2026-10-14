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

  // Initialize and run initial scan on mount
  useEffect(() => {
    const init = async () => {
      // 1. Stocks Scan Init
      const existing = await kvNamespaceInstance.get<VolatilityScanResult>(
        'latest_volatile_stocks',
        { type: 'json' }
      );

      if (existing) {
        setScanResult(existing);
      } else {
        setIsScanning(true);
        const res = await workerSimulatorInstance.triggerScheduledCron();
        if (res) {
          setScanResult(res);
        }
        setIsScanning(false);
      }

      // 2. Commodities Scan Init
      const existingComm = await kvNamespaceInstance.get<CommodityScanResult>(
        'latest_volatile_commodities',
        { type: 'json' }
      );

      if (existingComm) {
        setCommodityScanResult(existingComm);
      } else {
        setIsCommodityScanning(true);
        const commRes = await workerSimulatorInstance.triggerCommoditiesScan();
        if (commRes) {
          setCommodityScanResult(commRes);
        }
        setIsCommodityScanning(false);
      }
    };

    init();
  }, []);

  const handleTriggerScan = async () => {
    setIsScanning(true);
    const res = await workerSimulatorInstance.triggerScheduledCron();
    if (res) {
      setScanResult(res);
    }
    setIsScanning(false);
  };

  const handleTriggerCommoditiesScan = async () => {
    setIsCommodityScanning(true);
    const res = await workerSimulatorInstance.triggerCommoditiesScan();
    if (res) {
      setCommodityScanResult(res);
    }
    setIsCommodityScanning(false);
  };

  const handleInspectKey = (key: string) => {
    setSelectedKeyForKV(key);
    setActiveTab('kv');
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Interactive Top Header */}
      <Header
        onScanTriggered={handleTriggerScan}
        isScanning={isScanning}
        onSelectTab={setActiveTab}
        activeTab={activeTab}
      />

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
