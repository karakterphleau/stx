import React, { useState } from 'react';
import {
  Send,
  Zap,
  Copy,
  Check,
  Clock,
  Code,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { workerSimulatorInstance } from '../services/workerSimulator';

export const ApiConsole: React.FC<{ onScanDone?: () => void }> = ({ onScanDone }) => {
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [endpoint, setEndpoint] = useState('/api/volatile');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const presets = [
    { label: 'GET /api/volatile', m: 'GET', url: '/api/volatile', desc: 'Read top volatile stocks from STOCKS_KV' },
    { label: 'POST /api/scan', m: 'POST', url: '/api/scan', desc: 'Trigger on-demand market scan & write to KV' },
    { label: 'GET /api/history', m: 'GET', url: '/api/history', desc: 'List historical scan snapshots logged in KV' },
    { label: 'GET /api/ticker/NVDA', m: 'GET', url: '/api/ticker/NVDA', desc: 'Read specific ticker snapshot' },
    { label: 'GET /api/ticker/MSTR', m: 'GET', url: '/api/ticker/MSTR', desc: 'Read MSTR volatility snapshot' },
    { label: 'GET /api/kv/keys', m: 'GET', url: '/api/kv/keys', desc: 'List stored keys in KV namespace' },
    { label: 'GET /', m: 'GET', url: '/', desc: 'Worker status and API index' },
  ];

  const handleSend = async (m = method, url = endpoint) => {
    setLoading(true);
    try {
      const res = await workerSimulatorInstance.simulateFetch(m, url);
      setStatus(res.status);
      setResponse(res.data);
      setDuration(res.durationMs);

      if (url === '/api/scan' && onScanDone) {
        onScanDone();
      }
    } catch (err: any) {
      setStatus(500);
      setResponse({ error: err.message });
      setDuration(0);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (p: typeof presets[0]) => {
    setMethod(p.m as 'GET' | 'POST');
    setEndpoint(p.url);
    handleSend(p.m as 'GET' | 'POST', p.url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Quick Preset Chips */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
          <Zap className="w-4 h-4" />
          <span>Cloudflare Worker HTTP API Console</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Test the endpoints exposed by <code className="text-emerald-300 font-mono">export default &#123; fetch(request, env, ctx) &#125;</code>.
          These routes query the <code className="text-cyan-300 font-mono">STOCKS_KV</code> namespace and return low-latency JSON responses.
        </p>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => handleApplyPreset(p)}
              className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 font-mono flex items-center space-x-1.5 transition-colors"
            >
              <span className={p.m === 'GET' ? 'text-cyan-400' : 'text-amber-400 font-bold'}>
                {p.m}
              </span>
              <span>{p.url}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Request Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
            className="bg-slate-800 text-xs font-mono font-bold text-cyan-400 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>

          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
              https://worker.your-subdomain.workers.dev
            </span>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-xs text-white pl-[270px] pr-3 py-2 rounded-lg font-mono focus:outline-none focus:border-emerald-400"
            />
          </div>

          <button
            onClick={() => handleSend()}
            disabled={loading}
            className="flex items-center justify-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-lg text-xs transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Executing...' : 'Send Request'}</span>
          </button>
        </div>
      </div>

      {/* Response Display Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Code className="w-4 h-4 text-emerald-400" />
              HTTP Response
            </span>
            {status !== null && (
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                  status >= 200 && status < 300
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {status} {status === 200 ? 'OK' : status === 404 ? 'Not Found' : ''}
              </span>
            )}
            {duration !== null && (
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> {duration}ms
              </span>
            )}
          </div>

          {response && (
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
            </button>
          )}
        </div>

        <div className="p-4 bg-slate-950/70 font-mono text-xs overflow-x-auto max-h-[500px]">
          {response ? (
            <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed text-[11px]">
              {JSON.stringify(response, null, 2)}
            </pre>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <Sparkles className="w-6 h-6 text-slate-600" />
              <span>Select an endpoint above or click "Send Request" to test the Cloudflare Worker API</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
