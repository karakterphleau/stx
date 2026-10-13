import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  Radio,
  Sparkles,
} from 'lucide-react';
import { workerSimulatorInstance, LogEntry } from '../services/workerSimulator';

export const LogsConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    setLogs(workerSimulatorInstance.getLogs());
    const unsub = workerSimulatorInstance.subscribeLogs(() => {
      setLogs(workerSimulatorInstance.getLogs());
    });
    return unsub;
  }, []);

  const handleClear = () => {
    workerSimulatorInstance.clearLogs();
  };

  const filteredLogs = filterType === 'ALL'
    ? logs
    : logs.filter((l) => l.type === filterType);

  return (
    <div className="space-y-6">
      {/* Console Top Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center space-x-2.5">
          <Terminal className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            Cloudflare Worker Runtime Logs &amp; Tail Stream
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            ({logs.length} entries)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {['ALL', 'CRON', 'KV_PUT', 'HTTP', 'WEBHOOK'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors ${
                  filterType === type
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={handleClear}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-slate-300 font-semibold">wrangler tail --format=pretty</span>
          </div>
          <span>Cloudflare Edge V8</span>
        </div>

        <div className="p-4 max-h-[560px] overflow-y-auto space-y-2 leading-relaxed">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-600">
              No logs recorded yet. Trigger a scan or turn on Auto-Cron to watch real-time events.
            </div>
          ) : (
            filteredLogs.map((log) => {
              let badgeColor = 'bg-slate-800 text-slate-300';
              if (log.type === 'CRON') badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
              if (log.type === 'KV_PUT') badgeColor = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
              if (log.type === 'HTTP') badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
              if (log.type === 'WEBHOOK') badgeColor = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
              if (log.type === 'WARN') badgeColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';

              return (
                <div
                  key={log.id}
                  className="flex items-start space-x-2.5 hover:bg-slate-900/40 p-1 rounded transition-colors"
                >
                  <span className="text-slate-500 text-[11px] flex-shrink-0 pt-0.5">
                    {log.timestamp}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold flex-shrink-0 ${badgeColor}`}
                  >
                    [{log.type}]
                  </span>
                  <span
                    className={`flex-1 text-[11px] break-all ${
                      log.type === 'WARN'
                        ? 'text-rose-300'
                        : log.type === 'KV_PUT'
                        ? 'text-cyan-200'
                        : log.type === 'CRON'
                        ? 'text-amber-200'
                        : 'text-slate-300'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
