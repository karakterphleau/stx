import JSZip from 'jszip';
import {
  WORKER_INDEX_TS,
  WRANGLER_TOML,
  PACKAGE_JSON,
  TSCONFIG_JSON,
  DEPLOY_GUIDE_MD,
} from '../worker-templates/workerCode';

export async function downloadWorkerZip(): Promise<void> {
  const zip = new JSZip();

  // Add worker files
  zip.file('src/index.ts', WORKER_INDEX_TS);
  zip.file('wrangler.toml', WRANGLER_TOML);
  zip.file('package.json', PACKAGE_JSON);
  zip.file('tsconfig.json', TSCONFIG_JSON);
  zip.file('README.md', DEPLOY_GUIDE_MD);
  zip.file('.gitignore', `node_modules\n.wrangler\ndist\n.env\n`);

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'cloudflare-volatile-stock-worker.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
