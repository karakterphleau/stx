import React, { useState, useEffect } from 'react';
import {
  Database,
  Trash2,
  Copy,
  Check,
  Search,
  RefreshCw,
  Plus,
  Download,
  AlertOctagon,
  Clock,
  FileCode,
  Eye,
  Key,
} from 'lucide-react';
import { kvNamespaceInstance, KVEntry } from '../services/kvStore';

interface KVExplorerProps {
  selectedKeyFromRadar?: string | null;
  onClearSelectedKey?: () => void;
}

export const KVExplorer: React.FC<KVExplorerProps> = ({
  selectedKeyFromRadar,
  onClearSelectedKey,
}) => {
  const [entries, setEntries] = useState<KVEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrefix, setFilterPrefix] = useState<string>('ALL');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyTtl, setNewKeyTtl] = useState('86400');

  const refreshEntries = () => {
    const list = kvNamespaceInstance.getAllEntries();
    setEntries(list);
  };

  useEffect(() => {
    refreshEntries();
    const unsubscribe = kvNamespaceInstance.subscribe(() => {
      refreshEntries();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (selectedKeyFromRadar) {
      handleInspectKey(selectedKeyFromRadar);
      if (onClearSelectedKey) onClearSelectedKey();
    }
  }, [selectedKeyFromRadar]);

  const handleInspectKey = async (key: string) => {
    setActiveKey(key);
    const val = await kvNamespaceInstance.get(key);
    setActiveValue(val);
  };

  const handleDeleteKey = async (key: string) => {
    await kvNamespaceInstance.delete(key);
    if (activeKey === key) {
      setActiveKey(null);
      setActiveValue(null);
    }
    refreshEntries();
  };

  const handlePurgeAll = async () => {
    if (confirm('Are you sure you want to purge all keys from the STOCKS_KV namespace emulator?')) {
      await kvNamespaceInstance.clear();
      setActiveKey(null);
      setActiveValue(null);
      refreshEntries();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveNewKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !newKeyValue.trim()) return;

    const ttl = parseInt(newKeyTtl, 10);
    await kvNamespaceInstance.put(newKeyName.trim(), newKeyValue.trim(), {
      expirationTtl: isNaN(ttl) || ttl <= 0 ? undefined : ttl,
    });

    setIsAddingKey(false);
    setNewKeyName('');
    setNewKeyValue('');
    refreshEntries();
  };

  const handleExportDump = () => {
    const dump: Record<string, any> = {};
    entries.forEach((e) => {
      try {
        dump[e.key] = JSON.parse(e.value);
      } catch {
        dump[e.key] = e.value;
      }
    });

    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stocks-kv-dump-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter keys
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.key.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterPrefix === 'ALL') return true;
    if (filterPrefix === 'latest') return entry.key.startsWith('latest_');
    if (filterPrefix === 'history') return entry.key.startsWith('history:');
    if (filterPrefix === 'ticker') return entry.key.startsWith('ticker:');
    if (filterPrefix === 'metadata') return entry.key.includes('metadata');
    return true;
  });

  const totalBytes = kvNamespaceInstance.getTotalBytes();

  return (
    <div className="space-y-6">
      {/* Top KV Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Database className="w-4 h-4" />
              KV Namespace Binding
            </span>
            <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded">
              Active
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">STOCKS_KV</div>
          <p className="text-xs text-slate-500 mt-1">Bound to Worker script environment</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
              <Key className="w-4 h-4" />
              Total Stored Keys
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {entries.length}{' '}
            <span className="text-xs font-normal text-slate-400">keys present</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Across latest, history, and tickers</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <FileCode className="w-4 h-4" />
              Storage Footprint
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {(totalBytes / 1024).toFixed(2)} KB
          </div>
          <p className="text-xs text-slate-500 mt-1">Cloudflare KV free limit: 1 GB</p>
        </div>
      </div>

      {/* Action Controls & Prefix Filters */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keys (e.g. latest, history, NVDA)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAddingKey(!isAddingKey)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Put Key</span>
            </button>
            <button
              onClick={handleExportDump}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-colors"
              title="Download KV dump as JSON"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Dump</span>
            </button>
            <button
              onClick={handlePurgeAll}
              className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold px-3 py-2 rounded-lg border border-rose-500/30 transition-colors"
              title="Clear all keys in KV emulator"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purge KV</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-slate-400">Prefix:</span>
          {[
            { id: 'ALL', label: 'All Keys' },
            { id: 'latest', label: 'latest_*' },
            { id: 'history', label: 'history:* (7d TTL)' },
            { id: 'ticker', label: 'ticker:* (24h TTL)' },
            { id: 'metadata', label: 'scan_metadata' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterPrefix(item.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                filterPrefix === item.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Put Custom Key Form */}
      {isAddingKey && (
        <form
          onSubmit={handleSaveNewKey}
          className="bg-slate-850 border border-cyan-500/40 rounded-xl p-4 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Put KV Key-Value Pair
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingKey(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Key Name:
              </label>
              <input
                type="text"
                placeholder="e.g. ticker:TSLA:latest or custom_alert"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Expiration TTL (seconds, optional):
              </label>
              <input
                type="number"
                placeholder="e.g. 86400 (24h) or 604800 (7d)"
                value={newKeyTtl}
                onChange={(e) => setNewKeyTtl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Value (JSON string or raw text):
            </label>
            <textarea
              rows={3}
              placeholder='{"symbol": "CUSTOM", "volatility": 12.5}'
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs"
            >
              Execute KV.put()
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: Keys List & Key Content Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Keys Table (7 cols on lg) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              KV Keys ({filteredEntries.length})
            </span>
            <button
              onClick={refreshEntries}
              className="text-slate-400 hover:text-white p-1 rounded"
              title="Refresh list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No keys found in STOCKS_KV. Run a scan to populate volatile stocks.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredEntries.map((entry) => {
                  const isSelected = activeKey === entry.key;
                  const nowSec = Math.floor(Date.now() / 1000);
                  const remainingSec = entry.expiration ? entry.expiration - nowSec : null;

                  return (
                    <div
                      key={entry.key}
                      onClick={() => handleInspectKey(entry.key)}
                      className={`p-3.5 cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-500/10 border-l-4 border-cyan-400'
                          : 'hover:bg-slate-850/60'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-mono text-xs font-bold text-white flex items-center gap-2 truncate">
                          <span>{entry.key}</span>
                          {entry.key === 'latest_volatile_stocks' && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 font-sans px-1.5 py-0.2 rounded font-semibold">
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                          <span>{(entry.byteSize / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>
                            {new Date(entry.createdAt).toLocaleTimeString()}
                          </span>
                          {remainingSec !== null && (
                            <>
                              <span>•</span>
                              <span className="text-purple-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                TTL: {Math.max(0, Math.floor(remainingSec / 3600))}h left
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectKey(entry.key);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-slate-750 rounded transition-colors"
                          title="View JSON"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteKey(entry.key);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-750 rounded transition-colors"
                          title="Delete from KV"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Key JSON Inspector (5 cols on lg) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              KV Value Inspector
            </span>
            {activeKey && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleCopy(activeValue || '', 'inspector')}
                  className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded"
                >
                  {copiedKey === 'inspector' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedKey === 'inspector' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[520px] bg-slate-950/60 font-mono text-xs">
            {activeKey ? (
              <div>
                <div className="mb-3 pb-2 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Key: <strong className="text-cyan-400">{activeKey}</strong></span>
                </div>
                <pre className="text-emerald-300 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(activeValue || ''), null, 2);
                    } catch {
                      return activeValue || '<empty>';
                    }
                  })()}
                </pre>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16 space-y-2">
                <Database className="w-8 h-8 text-slate-700" />
                <p className="text-xs">Select any key from the table to view stored JSON payload</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
