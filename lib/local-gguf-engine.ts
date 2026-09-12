/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wllama, AssetsPathConfig } from '@wllama/wllama';
import { GgufMetadata, parseGgufHeader } from './gguf-parser';
import {
  saveGgufModelToStorage,
  loadGgufModelFromStorage,
  clearGgufModelFromStorage,
} from './gguf-storage';

const WASM_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@wllama/wllama@3.6.1/esm/wasm';

const WASM_PATHS: AssetsPathConfig = {
  default: `${WASM_CDN_BASE}/wllama.wasm`,
  'single-thread/wllama.wasm': `${WASM_CDN_BASE}/wllama.wasm`,
  'multi-thread/wllama.wasm': `${WASM_CDN_BASE}/wllama.wasm`,
};

export type GgufEngineStatus = 'unloaded' | 'loading' | 'ready' | 'error';

class LocalGgufEngine {
  private static instance: LocalGgufEngine;
  private wllama: Wllama | null = null;
  private currentMetadata: GgufMetadata | null = null;
  private status: GgufEngineStatus = 'unloaded';
  private statusMessage: string = 'No GGUF model loaded';
  private listeners: Set<(status: GgufEngineStatus, msg: string) => void> = new Set();

  public static getInstance(): LocalGgufEngine {
    if (!LocalGgufEngine.instance) {
      LocalGgufEngine.instance = new LocalGgufEngine();
    }
    return LocalGgufEngine.instance;
  }

  public subscribe(cb: (status: GgufEngineStatus, msg: string) => void) {
    this.listeners.add(cb);
    cb(this.status, this.statusMessage);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(status: GgufEngineStatus, msg: string) {
    this.status = status;
    this.statusMessage = msg;
    this.listeners.forEach(cb => cb(status, msg));
  }

  public getStatus(): GgufEngineStatus {
    return this.status;
  }

  public getStatusMessage(): string {
    return this.statusMessage;
  }

  public getMetadata(): GgufMetadata | null {
    return this.currentMetadata;
  }

  public isReady(): boolean {
    return this.status === 'ready' && !!this.wllama;
  }

  /**
   * Attempts to restore any saved GGUF model from IndexedDB on startup.
   */
  public async tryRestoreFromStorage(): Promise<boolean> {
    if (this.isReady()) return true;

    try {
      const stored = await loadGgufModelFromStorage();
      if (!stored || !stored.file) return false;

      this.notify('loading', `Restoring saved model: ${stored.metadata.fileName}...`);
      await this.loadModel(stored.file, stored.metadata, false);
      return true;
    } catch (err: any) {
      console.warn('Could not restore GGUF model from storage:', err);
      this.notify('unloaded', 'Ready to load model');
      return false;
    }
  }

  /**
   * Loads a GGUF File or Blob into memory and WebAssembly engine.
   */
  public async loadModel(
    file: File | Blob,
    metadata?: GgufMetadata,
    persist: boolean = true,
    onProgress?: (pct: number, stage: string) => void
  ): Promise<GgufMetadata> {
    this.notify('loading', 'Validating GGUF header...');
    onProgress?.(10, 'Checking model header...');

    // 1. Parse header if not supplied
    const meta = metadata || (await parseGgufHeader(file));
    if (!meta.isValid) {
      const err = meta.error || 'Invalid GGUF model file';
      this.notify('error', err);
      throw new Error(err);
    }

    this.currentMetadata = meta;

    try {
      onProgress?.(25, 'Initializing WebAssembly runtime...');
      this.notify('loading', `Loading ${meta.fileName} into memory...`);

      // Unload previous instance if present
      if (this.wllama) {
        try {
          this.wllama = null;
        } catch {}
      }

      // Check file size warning for browser WASM memory (usually ~2GB limit)
      if (meta.fileSize > 2.2 * 1024 * 1024 * 1024) {
        console.warn('Model exceeds 2GB WebAssembly single-file memory limit.');
      }

      const instance = new Wllama(WASM_PATHS, {
        suppressNativeLog: false,
        logger: {
          debug: () => {},
          log: (msg: any) => console.log('[wllama]', msg),
          warn: (msg: any) => console.warn('[wllama]', msg),
          error: (msg: any) => console.error('[wllama]', msg),
        },
      });

      onProgress?.(50, 'Allocating context and model weights...');
      
      const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? Math.min(4, Math.max(1, navigator.hardwareConcurrency - 1))
        : 2;

      await instance.loadModel([file], {
        n_ctx: Math.min(meta.contextLength || 2048, 2048),
        n_threads: threads,
      });

      this.wllama = instance;
      this.notify('ready', `Model ${meta.fileName} ready for translation`);
      onProgress?.(100, 'Model ready');

      // Persist in IndexedDB if requested
      if (persist) {
        saveGgufModelToStorage(file, meta).catch(e => {
          console.warn('Could not save GGUF to IndexedDB (likely browser storage quota):', e);
        });
      }

      return meta;
    } catch (err: any) {
      console.error('Error loading GGUF in WebAssembly:', err);
      const msg = err?.message || 'Failed to load GGUF file in browser';
      this.notify('error', msg);
      throw new Error(msg);
    }
  }

  /**
   * Unloads the current GGUF model and clears storage if requested.
   */
  public async unloadModel(clearStorage: boolean = true): Promise<void> {
    this.wllama = null;
    this.currentMetadata = null;
    this.notify('unloaded', 'No GGUF model loaded');

    if (clearStorage) {
      await clearGgufModelFromStorage();
    }
  }

  /**
   * Executes translation using the loaded local GGUF model.
   */
  public async generateTranslation(params: {
    text: string;
    systemPrompt: string;
    onToken?: (token: string) => void;
  }): Promise<string> {
    if (!this.wllama || this.status !== 'ready') {
      throw new Error('Local GGUF model is not loaded. Please upload a .gguf model in Settings > Model.');
    }

    const { text, systemPrompt, onToken } = params;

    try {
      let accumulated = '';

      const completion = await this.wllama.createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        max_tokens: 256,
        temperature: 0.1,
        top_p: 0.9,
      });

      const rawResult = completion.choices?.[0]?.message?.content || '';
      accumulated = rawResult.trim();

      if (onToken && accumulated) {
        onToken(accumulated);
      }

      return accumulated || text;
    } catch (err: any) {
      console.error('Inference error in local GGUF:', err);
      throw new Error(`GGUF inference failed: ${err?.message || 'Unknown error'}`);
    }
  }
}

export const localGgufEngine = LocalGgufEngine.getInstance();
