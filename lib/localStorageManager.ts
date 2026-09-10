/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelStorageItem {
  id: string;
  name: string;
  category: 'stt' | 'llm' | 'tts' | 'vad' | 'cache';
  fileName: string;
  description: string;
  sizeBytes: number;
  formattedSize: string;
  isDownloaded: boolean;
  downloadProgress: number; // 0.0 to 1.0
  downloadUrl: string;
  lastUpdated?: string;
}

export interface DeviceStorageMetrics {
  usedBytes: number;
  quotaBytes: number;
  freeBytes: number;
  usagePercent: number;
  modelsTotalBytes: number;
  audioCacheBytes: number;
  formattedAppUsage: string;
  formattedDeviceQuota: string;
  formattedFreeSpace: string;
  isOfflineReady: boolean;
}

const STORAGE_KEYS = {
  MODELS_PREFIX: 'edgetr_model_',
  AUDIO_CACHE_SIZE: 'edgetr_audio_cache_bytes',
  LAST_CLEARED: 'edgetr_storage_last_cleared',
};

export const INITIAL_MODELS: ModelStorageItem[] = [
  {
    id: 'whisper_stt_base',
    name: 'Whisper Edge STT (Base Q5_1)',
    category: 'stt',
    fileName: 'ggml-base.bin',
    description: 'On-device Speech-to-Text neural model for Dutch/Flemish and multi-language transcription.',
    sizeBytes: 60 * 1024 * 1024, // ~60 MB
    formattedSize: '60 MB',
    isDownloaded: true,
    downloadProgress: 1.0,
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
  },
  {
    id: 'qwen_llm_05b',
    name: 'Qwen 2.5 0.5B Instruct (Q4_K_M GGUF)',
    category: 'llm',
    fileName: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    description: 'Lightweight language model quantized for mobile edge inference with Dutch/Flemish translation context.',
    sizeBytes: 398 * 1024 * 1024, // ~398 MB
    formattedSize: '398 MB',
    isDownloaded: true,
    downloadProgress: 1.0,
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  },
  {
    id: 'piper_rdh_flemish',
    name: 'Piper Flemish RDH Voice (Male)',
    category: 'tts',
    fileName: 'nl_BE-rdh-medium.onnx',
    description: 'Natural Flemish male voice ONNX model and acoustic phoneme map for Belgian Dutch speech synthesis.',
    sizeBytes: 65 * 1024 * 1024, // ~65 MB
    formattedSize: '65 MB',
    isDownloaded: true,
    downloadProgress: 1.0,
    downloadUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_BE/rdh/medium/nl_BE-rdh-medium.onnx',
  },
  {
    id: 'piper_nathalie_flemish',
    name: 'Piper Flemish Nathalie Voice (Female)',
    category: 'tts',
    fileName: 'nl_BE-nathalie-medium.onnx',
    description: 'Belgian Flemish female voice ONNX model for high-clarity offline speech playback.',
    sizeBytes: 65 * 1024 * 1024, // ~65 MB
    formattedSize: '65 MB',
    isDownloaded: false,
    downloadProgress: 0.0,
    downloadUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_BE/nathalie/medium/nl_BE-nathalie-medium.onnx',
  },
  {
    id: 'silero_vad',
    name: 'Silero VAD (Voice Activity Detector)',
    category: 'vad',
    fileName: 'silero_vad.onnx',
    description: 'Ultra-low latency speech boundary detection to separate voice audio from background noise.',
    sizeBytes: 2400 * 1024, // ~2.4 MB
    formattedSize: '2.4 MB',
    isDownloaded: true,
    downloadProgress: 1.0,
    downloadUrl: 'https://github.com/snakers4/silero-vad/raw/master/src/silero_vad/data/silero_vad.onnx',
  },
];

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(i >= 2 ? 1 : 0)} ${sizes[i]}`;
}

export class LocalStorageManager {
  private static instance: LocalStorageManager;
  private models: ModelStorageItem[] = [];
  private listeners: Set<(models: ModelStorageItem[]) => void> = new Set();

  private constructor() {
    this.init();
  }

  public static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  private init() {
    this.models = INITIAL_MODELS.map(model => {
      const stored = localStorage.getItem(`${STORAGE_KEYS.MODELS_PREFIX}${model.id}`);
      if (stored !== null) {
        try {
          const parsed = JSON.parse(stored);
          return {
            ...model,
            isDownloaded: Boolean(parsed.isDownloaded),
            downloadProgress: parsed.isDownloaded ? 1.0 : 0.0,
            lastUpdated: parsed.lastUpdated,
          };
        } catch (e) {
          return model;
        }
      }
      return model;
    });
  }

  public subscribe(listener: (models: ModelStorageItem[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.models]);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const copy = [...this.models];
    this.listeners.forEach(fn => fn(copy));
  }

  public getModels(): ModelStorageItem[] {
    return [...this.models];
  }

  public async getStorageMetrics(): Promise<DeviceStorageMetrics> {
    let quotaBytes = 50 * 1024 * 1024 * 1024; // Default fallback 50GB
    let usedBytes = 0;

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota) quotaBytes = estimate.quota;
        if (estimate.usage) usedBytes = estimate.usage;
      } catch (e) {
        console.warn('Storage estimate failed:', e);
      }
    }

    const modelsTotalBytes = this.models
      .filter(m => m.isDownloaded)
      .reduce((sum, m) => sum + m.sizeBytes, 0);

    const audioCacheRaw = localStorage.getItem(STORAGE_KEYS.AUDIO_CACHE_SIZE);
    const audioCacheBytes = audioCacheRaw ? parseInt(audioCacheRaw, 10) : 4.8 * 1024 * 1024; // ~4.8 MB default buffer

    const appUsageBytes = modelsTotalBytes + audioCacheBytes;
    const totalUsed = Math.max(usedBytes, appUsageBytes);
    const freeBytes = Math.max(0, quotaBytes - totalUsed);
    const usagePercent = quotaBytes > 0 ? (totalUsed / quotaBytes) * 100 : 0;

    const hasSTT = this.models.some(m => m.category === 'stt' && m.isDownloaded);
    const hasLLM = this.models.some(m => m.category === 'llm' && m.isDownloaded);
    const hasTTS = this.models.some(m => m.category === 'tts' && m.isDownloaded);
    const isOfflineReady = hasSTT && hasLLM && hasTTS;

    return {
      usedBytes: totalUsed,
      quotaBytes,
      freeBytes,
      usagePercent,
      modelsTotalBytes,
      audioCacheBytes,
      formattedAppUsage: formatBytes(appUsageBytes),
      formattedDeviceQuota: formatBytes(quotaBytes),
      formattedFreeSpace: formatBytes(freeBytes),
      isOfflineReady,
    };
  }

  public async deleteModel(modelId: string): Promise<void> {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return;

    model.isDownloaded = false;
    model.downloadProgress = 0.0;
    model.lastUpdated = undefined;

    localStorage.setItem(
      `${STORAGE_KEYS.MODELS_PREFIX}${model.id}`,
      JSON.stringify({ isDownloaded: false })
    );

    // If browser cache storage exists, attempt to delete cached file
    if ('caches' in window) {
      try {
        const cache = await caches.open('edgetr-models-v1');
        await cache.delete(`/models/${model.fileName}`);
      } catch (e) {
        // ignore
      }
    }

    this.notify();
  }

  public async clearAllModels(): Promise<void> {
    for (const model of this.models) {
      model.isDownloaded = false;
      model.downloadProgress = 0.0;
      model.lastUpdated = undefined;
      localStorage.setItem(
        `${STORAGE_KEYS.MODELS_PREFIX}${model.id}`,
        JSON.stringify({ isDownloaded: false })
      );
    }

    if ('caches' in window) {
      try {
        await caches.delete('edgetr-models-v1');
      } catch (e) {}
    }

    localStorage.setItem(STORAGE_KEYS.LAST_CLEARED, new Date().toISOString());
    this.notify();
  }

  public async clearAudioAndCache(): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.AUDIO_CACHE_SIZE, '0');
    if ('caches' in window) {
      try {
        const cache = await caches.open('edgetr-audio-cache');
        const keys = await cache.keys();
        await Promise.all(keys.map(k => cache.delete(k)));
      } catch (e) {}
    }
    this.notify();
  }

  public async downloadModel(
    modelId: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return;

    model.downloadProgress = 0.05;
    this.notify();

    // Emulate realistic progressive edge download into client cache
    const totalSteps = 20;
    for (let step = 1; step <= totalSteps; step++) {
      await new Promise(res => setTimeout(res, 80));
      const progress = step / totalSteps;
      model.downloadProgress = progress;
      if (onProgress) onProgress(progress);
      this.notify();
    }

    model.isDownloaded = true;
    model.downloadProgress = 1.0;
    model.lastUpdated = new Date().toISOString();

    localStorage.setItem(
      `${STORAGE_KEYS.MODELS_PREFIX}${model.id}`,
      JSON.stringify({
        isDownloaded: true,
        lastUpdated: model.lastUpdated,
      })
    );

    this.notify();
  }

  public async downloadAllEssentials(
    onProgress?: (overallProgress: number, currentModel: string) => void
  ): Promise<void> {
    const essentials = this.models.filter(
      m => m.id === 'whisper_stt_base' || m.id === 'qwen_llm_05b' || m.id === 'piper_rdh_flemish'
    );

    for (let i = 0; i < essentials.length; i++) {
      const item = essentials[i];
      await this.downloadModel(item.id, (prog) => {
        const overall = (i + prog) / essentials.length;
        if (onProgress) onProgress(overall, item.name);
      });
    }
  }
}
