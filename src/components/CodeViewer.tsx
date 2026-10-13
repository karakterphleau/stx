import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  WORKER_INDEX_TS,
  WRANGLER_TOML,
  PACKAGE_JSON,
  TSCONFIG_JSON,
  DEPLOY_GUIDE_MD,
} from '../worker-templates/workerCode';
import { downloadWorkerZip } from '../utils/zipDownloader';

export const CodeViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string>('src/index.ts');
  const [copied, setCopied] = useState(false);

  const filesMap: Record<string, { content: string; lang: string; desc: string }> = {
    'src/index.ts': {
      content: WORKER_INDEX_TS,
      lang: 'typescript',
      desc: 'Cloudflare Worker source code: scheduled() cron handler + fetch() REST API + KV operations',
    },
    'wrangler.toml': {
      content: WRANGLER_TOML,
      lang: 'toml',
      desc: 'Wrangler configuration with KV namespace binding & US market hours cron trigger',
    },
    'package.json': {
      content: PACKAGE_JSON,
      lang: 'json',
      desc: 'NPM package manifest with Wrangler & Cloudflare Worker TypeScript definitions',
    },
    'tsconfig.json': {
      content: TSCONFIG_JSON,
      lang: 'json',
      desc: 'TypeScript configuration targeting ES2022 and @cloudflare/workers-types',
    },
    'README.md': {
      content: DEPLOY_GUIDE_MD,
      lang: 'markdown',
      desc: 'Complete deployment and operational guide for Cloudflare Workers & KV',
    },
  };

  const current = filesMap[activeFile] || filesMap['src/index.ts'];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    await downloadWorkerZip();
  };

  const lines = current.content.split('\n');

  return (
    <div className="space-y-6">
      {/* Top Banner with Download Callout */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Ready-to-Deploy Cloudflare Worker Project</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Export the complete project or copy individual source files
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            This worker connects to Cloudflare's edge network, runs on zero-cold-start V8 isolates, and schedules periodic market scans directly into your KV namespace.
          </p>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs shadow-lg shadow-purple-600/20 transition-all flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Worker ZIP (.zip)</span>
        </button>
      </div>

      {/* Cloudflare Deployment Guidance Callout */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 flex items-start space-x-3 text-xs">
        <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300">
            Deploying to Cloudflare? Here is what you need to know:
          </p>
          <p className="text-slate-300 leading-relaxed">
            • <strong>Cloudflare Worker (Backend + Cron + KV):</strong> Deploy this with <code className="text-cyan-300 font-mono bg-slate-950 px-1 py-0.5 rounded">npx wrangler deploy</code>. It uses <code className="text-purple-300 font-mono bg-slate-950 px-1 py-0.5 rounded">src/index.ts</code> as its entry point. It does <em>not</em> need or use <code className="text-slate-400 font-mono">index.html</code>.
          </p>
          <p className="text-slate-300 leading-relaxed">
            • <strong>Cloudflare Pages (Frontend Web App):</strong> If you are deploying this visual dashboard to Cloudflare Pages, use build command <code className="text-emerald-300 font-mono bg-slate-950 px-1 py-0.5 rounded">npm run build</code> and output directory <code className="text-emerald-300 font-mono bg-slate-950 px-1 py-0.5 rounded">dist</code>. The frontend entry point <code className="text-slate-200 font-mono">src/main.tsx</code> mounts <code className="text-slate-200 font-mono">src/App.tsx</code>.
          </p>
        </div>
      </div>

      {/* Code Browser Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* File Tabs & Header */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {Object.keys(filesMap).map((fileName) => (
              <button
                key={fileName}
                onClick={() => setActiveFile(fileName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors ${
                  activeFile === fileName
                    ? 'bg-slate-800 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{fileName}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              {lines.length} lines
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied' : 'Copy File'}</span>
            </button>
          </div>
        </div>

        {/* File Description bar */}
        <div className="px-4 py-2 bg-slate-950/30 border-b border-slate-800/80 text-[11px] text-slate-400 font-mono flex items-center gap-2">
          <ChevronRight className="w-3 h-3 text-purple-400" />
          <span>{current.desc}</span>
        </div>

        {/* Code View with Line Numbers */}
        <div className="p-4 bg-slate-950/90 font-mono text-xs overflow-x-auto max-h-[580px] leading-relaxed">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                  <td className="w-12 pr-4 text-right text-slate-600 select-none text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="text-slate-200 whitespace-pre text-[11px]">
                    {line}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deployment CLI Walkthrough */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
            <Terminal className="w-4 h-4" />
            <span>1. Create KV Namespace</span>
          </div>
          <p className="text-xs text-slate-400">
            Run in terminal to provision the KV storage bucket:
          </p>
          <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 border border-slate-800">
            npx wrangler kv:namespace create STOCKS_KV
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400">
            <Terminal className="w-4 h-4" />
            <span>2. Test Locally</span>
          </div>
          <p className="text-xs text-slate-400">
            Test the scheduled cron event and HTTP APIs locally:
          </p>
          <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 border border-slate-800">
            npx wrangler dev --test-scheduled
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
            <Terminal className="w-4 h-4" />
            <span>3. Deploy to Cloudflare</span>
          </div>
          <p className="text-xs text-slate-400">
            Publish the worker worldwide across 300+ edge locations:
          </p>
          <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 border border-slate-800">
            npx wrangler deploy
          </div>
        </div>
      </div>
    </div>
  );
};
