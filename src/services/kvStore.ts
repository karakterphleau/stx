/**
 * Cloudflare KV Namespace In-Memory & LocalStorage Emulator
 * Faithfully mirrors the Cloudflare Workers KV API: get, put, list, delete.
 */

export interface KVEntry {
  key: string;
  value: string;
  metadata?: any;
  expiration?: number; // UNIX timestamp in seconds
  createdAt: number;   // UNIX timestamp in ms
  byteSize: number;
}

export interface KVListResult {
  keys: Array<{
    name: string;
    expiration?: number;
    metadata?: any;
  }>;
  list_complete: boolean;
  cursor?: string;
}

const STORAGE_KEY = 'cf_worker_stocks_kv_data';

class CloudflareKVEmulator {
  private store: Map<string, KVEntry> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const nowSec = Math.floor(Date.now() / 1000);
        Object.entries(parsed).forEach(([key, entry]: [string, any]) => {
          // Filter out expired items
          if (!entry.expiration || entry.expiration > nowSec) {
            this.store.set(key, entry);
          }
        });
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage() {
    try {
      const obj: Record<string, KVEntry> = {};
      this.store.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Ignore quota errors
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  /**
   * KV.put(key, value, options)
   */
  async put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: {
      expiration?: number;
      expirationTtl?: number;
      metadata?: any;
    }
  ): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);

    let expiration: number | undefined;
    if (options?.expiration) {
      expiration = options.expiration;
    } else if (options?.expirationTtl) {
      expiration = nowSec + options.expirationTtl;
    }

    const byteSize = new Blob([stringValue]).size;

    const entry: KVEntry = {
      key,
      value: stringValue,
      metadata: options?.metadata,
      expiration,
      createdAt: nowMs,
      byteSize,
    };

    this.store.set(key, entry);
    this.saveToStorage();
  }

  /**
   * KV.get(key, options)
   */
  async get<T = string>(
    key: string,
    options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream'; cacheTtl?: number }
  ): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check expiration
    if (entry.expiration && entry.expiration <= Math.floor(Date.now() / 1000)) {
      this.store.delete(key);
      this.saveToStorage();
      return null;
    }

    if (options?.type === 'json') {
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return null;
      }
    }

    return entry.value as unknown as T;
  }

  /**
   * KV.getWithMetadata(key, options)
   */
  async getWithMetadata<T = string>(
    key: string,
    options?: { type?: 'text' | 'json' }
  ): Promise<{ value: T | null; metadata: any }> {
    const entry = this.store.get(key);
    if (!entry) return { value: null, metadata: null };

    const value = await this.get<T>(key, options);
    return { value, metadata: entry.metadata ?? null };
  }

  /**
   * KV.list(options)
   */
  async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<KVListResult> {
    const prefix = options?.prefix || '';
    const limit = options?.limit || 1000;
    const nowSec = Math.floor(Date.now() / 1000);

    const keys: KVListResult['keys'] = [];

    for (const [k, entry] of this.store.entries()) {
      // Expiration check
      if (entry.expiration && entry.expiration <= nowSec) {
        this.store.delete(k);
        continue;
      }

      if (k.startsWith(prefix)) {
        keys.push({
          name: k,
          expiration: entry.expiration,
          metadata: entry.metadata,
        });
      }
      if (keys.length >= limit) break;
    }

    return {
      keys,
      list_complete: true,
    };
  }

  /**
   * KV.delete(key)
   */
  async delete(key: string): Promise<void> {
    if (this.store.has(key)) {
      this.store.delete(key);
      this.saveToStorage();
    }
  }

  /**
   * Clear entire KV namespace
   */
  async clear(): Promise<void> {
    this.store.clear();
    this.saveToStorage();
  }

  /**
   * Get all entries directly for the UI inspector
   */
  getAllEntries(): KVEntry[] {
    const nowSec = Math.floor(Date.now() / 1000);
    const list: KVEntry[] = [];
    this.store.forEach((entry, key) => {
      if (entry.expiration && entry.expiration <= nowSec) {
        this.store.delete(key);
      } else {
        list.push(entry);
      }
    });
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  getTotalBytes(): number {
    let total = 0;
    this.store.forEach((entry) => {
      total += entry.byteSize;
    });
    return total;
  }
}

export const kvNamespaceInstance = new CloudflareKVEmulator();
