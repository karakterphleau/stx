import React, { useState } from 'react';
import {
  RotateCw,
  Zap,
  Download,
  Flame,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  Activity,
  Database,
  Code2,
  Terminal,
  ExternalLink,
  Wheat,
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
  const [showShockMenu, setShowShockMenu] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleManualScan = async () => {
    onScanTriggered();
    await workerSimulatorInstance.triggerScheduledCron();
    showToast('Market scan completed & written to STOCKS_KV');
  };

  const handleToggleAutoCron = () => {
    if (autoCron) {
      workerSimulatorInstance.stopAutoCron();
      setAutoCron(false);
      showToast('Scheduled Auto-Cron stopped');
    } else {
      workerSimulatorInstance.startAutoCron(15, () => {
        onScanTriggered();
      });
      setAutoCron(true);
      showToast('Auto-Cron active (fires every 15s)');
    }
  };

  const handleInjectShock = (direction: 'UP' | 'DOWN') => {
    injectShock(selectedShockTicker, direction);
    setShowShockMenu(false);
    showToast(`Injected volatility surge on ${selectedShockTicker}. Run scan to log.`);
  };

  const handleDownload = async () => {
    await downloadWorkerZip();
    showToast('Downloaded cloudflare-volatile-stock-worker.zip');
  };

  const navItems = [
    { id: 'radar', label: 'Stocks Volatility', icon: Activity },
    { id: 'commodities', label: 'Commodities Volatility', icon: Wheat },
    { id: 'kv', label: 'Cloudflare KV Explorer', icon: Database },
    { id: 'api', label: 'HTTP REST Tester', icon: Zap },
    { id: 'code', label: 'Worker Code & Config', icon: Code2 },
    { id: 'logs', label: 'Runtime Logs', icon: Terminal },
  ];

  return (
    <header className="bg-[#0b0e14] border-b border-slate-800/80 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-opacity-95">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-semibold px-4 py-3 rounded-lg shadow-2xl flex items-center space-x-2.5 text-sm border border-emerald-400 animate-in fade-in slide-in-from-bottom-2">
          <Zap className="w-4 h-4 text-slate-950 fill-current" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Navbar Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20 ring-1 ring-white/10 flex-shrink-0">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Market Volatility Tracker
                </h1>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full font-medium">
                  Cloudflare Worker
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                <span className="text-slate-300">KV Namespace:</span>
                <code className="text-emerald-400 font-mono font-semibold">STOCKS_KV</code>
                <span className="text-slate-600">·</span>
                <span>Cron: <code className="text-slate-300 font-mono">*/5 13-20 * * 1-5</code></span>
                <span className="text-slate-600 hidden sm:inline">·</span>
                <span className="text-slate-400 hidden sm:inline">V8 Edge Isolate</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Shock Testing Menu */}
            <div className="relative">
              <button
                onClick={() => setShowShockMenu(!showShockMenu)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 transition-colors"
                title="Inject artificial volatility shock into a stock"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Shock</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showShockMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 text-xs animate-in fade-in">
                  <div className="font-semibold text-white mb-1">
                    Simulate Market Move
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Inject instant volatility to test the worker's cron detection and KV logging.
                  </p>
                  <div className="mb-3">
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                      Select Equity:
                    </label>
                    <select
                      value={selectedShockTicker}
                      onChange={(e) => setSelectedShockTicker(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    >
                      <option value="MSTR">MSTR — MicroStrategy</option>
                      <option value="NVDA">NVDA — NVIDIA</option>
                      <option value="TSLA">TSLA — Tesla</option>
                      <option value="GME">GME — GameStop</option>
                      <option value="SMCI">SMCI — Super Micro</option>
                      <option value="COIN">COIN — Coinbase</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleInjectShock('UP')}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 text-center"
                    >
                      +Bull Move (+15%)
                    </button>
                    <button
                      onClick={() => handleInjectShock('DOWN')}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 text-center"
                    >
                      -Bear Drop (-14%)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Auto Cron Scheduler Toggle */}
            <button
              onClick={handleToggleAutoCron}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                autoCron
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-sm'
                  : 'bg-slate-850 hover:bg-slate-800 border-slate-700/80 text-slate-300'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoCron ? 'animate-pulse text-emerald-400' : 'text-slate-400'}`} />
              <span>{autoCron ? 'Auto-Cron: ON (15s)' : 'Auto-Cron: OFF'}</span>
            </button>

            {/* Manual Run Worker Cron */}
            <button
              onClick={handleManualScan}
              disabled={isScanning}
              className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Run Scan Now'}</span>
            </button>

            {/* Export Worker ZIP */}
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 transition-colors"
              title="Download Cloudflare Worker deployment bundle"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export Worker</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Row */}
        <nav className="flex items-center space-x-1 border-t border-slate-800/80 pt-2 pb-2.5 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
