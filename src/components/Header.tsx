import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  Zap,
  Download,
  Flame,
  Radio,
  Clock,
  Database,
  ExternalLink,
} from 'lucide-react';
import { workerSimulatorInstance } from '../services/workerSimulator';
import { downloadWorkerZip } from '../utils/zipDownloader';
import { injectShock } from '../services/marketScanner';

interface HeaderProps {
  onScanTriggered: () => void;
  isScanning: boolean;
  onSelectTab: (tab: string) => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  onScanTriggered,
  isScanning,
  onSelectTab,
  activeTab,
}) => {
  const [autoCron, setAutoCron] = useState(false);
  const [selectedShockTicker, setSelectedShockTicker] = useState('MSTR');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleManualScan = async () => {
    onScanTriggered();
    await workerSimulatorInstance.triggerScheduledCron();
    showToast('Scan executed & written to KV namespace');
  };

  const handleToggleAutoCron = () => {
    if (autoCron) {
      workerSimulatorInstance.stopAutoCron();
      setAutoCron(false);
      showToast('Scheduled Cron stopped');
    } else {
      workerSimulatorInstance.startAutoCron(15, () => {
        onScanTriggered();
      });
      setAutoCron(true);
      showToast('Cron triggered! Running every 15s');
    }
  };

  const handleInjectShock = (direction: 'UP' | 'DOWN') => {
    injectShock(selectedShockTicker, direction);
    showToast(`Injected volatility surge on ${selectedShockTicker}! Run scan to log to KV.`);
  };

  const handleDownload = async () => {
    await downloadWorkerZip();
    showToast('Downloaded cloudflare-volatile-stock-worker.zip');
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-medium px-4 py-2.5 rounded-lg shadow-xl shadow-emerald-950/50 flex items-center space-x-2 text-sm animate-fade-in border border-emerald-400">
          <Zap className="w-4 h-4 text-slate-950 fill-current" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Brand Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20 ring-1 ring-amber-400/30">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Cloudflare Worker <span className="text-amber-400 font-semibold">• Volatile Stock KV Logger</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                  <Database className="w-3 h-3" /> Binding: STOCKS_KV
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-cyan-400">
                  <Clock className="w-3 h-3" /> Cron: */5 13-20 * * 1-5
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] text-slate-400">V8 Serverless Worker</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Runner Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Market Shock Simulator */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/80">
              <select
                aria-label="Select ticker to inject market shock"
                value={selectedShockTicker}
                onChange={(e) => setSelectedShockTicker(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-amber-300 px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="MSTR" className="bg-slate-900 text-white">MSTR</option>
                <option value="NVDA" className="bg-slate-900 text-white">NVDA</option>
                <option value="TSLA" className="bg-slate-900 text-white">TSLA</option>
                <option value="GME" className="bg-slate-900 text-white">GME</option>
                <option value="SMCI" className="bg-slate-900 text-white">SMCI</option>
                <option value="COIN" className="bg-slate-900 text-white">COIN</option>
              </select>
              <button
                onClick={() => handleInjectShock('UP')}
                title="Inject sudden bullish spike (+15%) to test volatility detection"
                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-1 rounded transition-colors font-mono font-semibold"
              >
                +Shock
              </button>
              <button
                onClick={() => handleInjectShock('DOWN')}
                title="Inject sudden plunge (-14%) to test volatility detection"
                className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-1 rounded ml-1 transition-colors font-mono font-semibold"
              >
                -Shock
              </button>
            </div>

            {/* Auto Cron Scheduler */}
            <button
              onClick={handleToggleAutoCron}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                autoCron
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoCron ? 'animate-pulse text-emerald-400' : 'text-slate-400'}`} />
              <span>{autoCron ? 'Auto-Cron: ON (15s)' : 'Auto-Cron: OFF'}</span>
            </button>

            {/* Trigger Scan Button */}
            <button
              onClick={handleManualScan}
              disabled={isScanning}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Run Worker Cron'}</span>
            </button>

            {/* Download Worker ZIP */}
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              title="Download full ready-to-deploy Cloudflare Worker project files"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export Worker</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 mt-4 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-2.5 text-xs font-medium">
          <button
            onClick={() => onSelectTab('radar')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'radar'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Volatile Stocks Radar</span>
          </button>

          <button
            onClick={() => onSelectTab('kv')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'kv'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>KV Namespace Explorer</span>
          </button>

          <button
            onClick={() => onSelectTab('api')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'api'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>HTTP API Tester</span>
          </button>

          <button
            onClick={() => onSelectTab('code')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'code'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Worker Code &amp; Config</span>
          </button>

          <button
            onClick={() => onSelectTab('logs')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'logs'
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Worker Console Logs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
