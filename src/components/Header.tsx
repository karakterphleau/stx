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
  Code2,
  Terminal,
  Activity,
  SlidersHorizontal,
  ChevronDown,
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
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleManualScan = async () => {
    onScanTriggered();
    await workerSimulatorInstance.triggerScheduledCron();
    showToast('Scheduled scan executed & persisted to STOCKS_KV');
  };

  const handleToggleAutoCron = () => {
    if (autoCron) {
      workerSimulatorInstance.stopAutoCron();
      setAutoCron(false);
      showToast('Scheduled auto-cron stopped');
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
    showToast(`Injected volatility surge on ${selectedShockTicker}. Run scan to inspect KV.`);
  };

  const handleDownload = async () => {
    await downloadWorkerZip();
    showToast('Downloaded worker ZIP project bundle');
  };

  const navItems = [
    { id: 'radar', label: 'Volatility Radar', icon: Activity, desc: 'Real-time ranked tables' },
    { id: 'kv', label: 'KV Storage', icon: Database, desc: 'Namespace inspector' },
    { id: 'api', label: 'API Tester', icon: Zap, desc: 'Worker HTTP endpoints' },
    { id: 'code', label: 'Worker Code', icon: Code2, desc: 'wrangler.toml & src' },
    { id: 'logs', label: 'Live Logs', icon: Terminal, desc: 'Isolate runtime tail' },
  ];

  return (
    <header className="bg-[#090b10] border-b border-white/[0.08] sticky top-0 z-40 backdrop-blur-xl bg-opacity-90">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-medium px-4 py-2.5 rounded-lg shadow-2xl flex items-center space-x-2 text-xs border border-emerald-400">
          <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & System Kicker */}
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20 ring-1 ring-white/10 flex-shrink-0">
              <Flame className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-white tracking-tight text-sm sm:text-base truncate">
                  Cloudflare Stock Volatility Worker
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="text-emerald-400">STOCKS_KV</span>
                <span className="text-slate-600">·</span>
                <span className="text-cyan-400 hidden sm:inline">Cron: */5 13-20 * * 1-5</span>
                <span className="text-slate-600 hidden sm:inline">·</span>
                <span className="text-slate-400">Edge Runtime</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Shock Testing Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowShockMenu(!showShockMenu)}
                className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                title="Inject artificial volatility shock into a stock"
              >
                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                <span>Simulate Shock</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showShockMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 text-xs">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Inject Price Shock
                  </div>
                  <div className="mb-2">
                    <label className="text-[11px] text-slate-400 block mb-1">Target Symbol:</label>
                    <select
                      value={selectedShockTicker}
                      onChange={(e) => setSelectedShockTicker(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                    >
                      <option value="MSTR">MSTR (MicroStrategy)</option>
                      <option value="NVDA">NVDA (NVIDIA)</option>
                      <option value="TSLA">TSLA (Tesla)</option>
                      <option value="GME">GME (GameStop)</option>
                      <option value="SMCI">SMCI (Super Micro)</option>
                      <option value="COIN">COIN (Coinbase)</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleInjectShock('UP')}
                      className="flex-1 py-1 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] border border-emerald-500/20 text-center"
                    >
                      +Bull Shock
                    </button>
                    <button
                      onClick={() => handleInjectShock('DOWN')}
                      className="flex-1 py-1 px-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-[11px] border border-rose-500/20 text-center"
                    >
                      -Bear Shock
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Auto Cron Scheduler Toggle */}
            <button
              onClick={handleToggleAutoCron}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                autoCron
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoCron ? 'animate-pulse text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{autoCron ? 'Cron Active (15s)' : 'Auto-Cron: Off'}</span>
              <span className="sm:hidden">{autoCron ? '15s' : 'Off'}</span>
            </button>

            {/* Manual Run Worker Cron */}
            <button
              onClick={handleManualScan}
              disabled={isScanning}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold px-3.5 py-1.5 rounded-lg text-xs transition-all shadow-md shadow-orange-500/15 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Run Scan'}</span>
            </button>

            {/* Export Worker ZIP */}
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
              title="Download Cloudflare Worker deployment bundle"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Clean Modern Navigation Tabs */}
        <nav className="flex items-center space-x-1 border-t border-white/[0.06] py-1.5 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
