/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  LocalStorageManager,
  ModelStorageItem,
  DeviceStorageMetrics,
  formatBytes,
} from '../lib/localStorageManager';
import { useUI } from '../lib/state';

export default function StorageManagerModal() {
  const { isStorageOpen, closeStorage } = useUI();
  const storageManager = LocalStorageManager.getInstance();

  const [models, setModels] = useState<ModelStorageItem[]>([]);
  const [metrics, setMetrics] = useState<DeviceStorageMetrics | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'models' | 'cache'>('all');

  const refreshMetrics = async () => {
    const data = await storageManager.getStorageMetrics();
    setMetrics(data);
  };

  useEffect(() => {
    const unsub = storageManager.subscribe((items) => {
      setModels(items);
      refreshMetrics();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isStorageOpen) {
      refreshMetrics();
    }
  }, [isStorageOpen]);

  if (!isStorageOpen) return null;

  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      await storageManager.clearAllModels();
      await storageManager.clearAudioAndCache();
      setShowClearConfirm(false);
      await refreshMetrics();
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleClearAudioCache = async () => {
    await storageManager.clearAudioAndCache();
    await refreshMetrics();
  };

  const handleDeleteModel = async (id: string) => {
    await storageManager.deleteModel(id);
    await refreshMetrics();
  };

  const handleDownloadModel = async (id: string) => {
    setDownloadingId(id);
    try {
      await storageManager.downloadModel(id);
      await refreshMetrics();
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    setIsBulkDownloading(true);
    try {
      await storageManager.downloadAllEssentials((prog, current) => {
        setBulkStatus(`${current} (${Math.round(prog * 100)}%)`);
      });
      await refreshMetrics();
    } finally {
      setIsBulkDownloading(false);
      setBulkStatus('');
    }
  };

  const filteredModels = models.filter((m) => {
    if (activeTab === 'models') return m.category !== 'vad' && m.category !== 'cache';
    if (activeTab === 'cache') return m.category === 'vad' || m.category === 'cache';
    return true;
  });

  const getCategoryBadge = (category: ModelStorageItem['category']) => {
    switch (category) {
      case 'stt':
        return { label: 'STT (Spraakherkenning)', color: '#1f94ff', bg: 'rgba(31, 148, 255, 0.15)' };
      case 'llm':
        return { label: 'LLM (Taalmodel)', color: '#98beff', bg: 'rgba(152, 190, 255, 0.15)' };
      case 'tts':
        return { label: 'TTS (Vlaamse Stem)', color: '#0d9c53', bg: 'rgba(13, 156, 83, 0.15)' };
      case 'vad':
        return { label: 'VAD (Stemactiviteit)', color: '#ff9c7a', bg: 'rgba(255, 156, 122, 0.15)' };
      default:
        return { label: 'Opslag', color: '#c3c6c7', bg: 'rgba(195, 198, 199, 0.15)' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#13151a] border border-[#217bfe]/30 rounded-2xl shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#1c1f26]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2e96ff]/20 text-[#448dff] border border-[#2e96ff]/40">
              <span className="icon text-2xl">sd_storage</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Lokaal Opslagbeheer (Edge Device)
                </h2>
                {metrics?.isOfflineReady ? (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#0d9c53]/20 text-[#0d9c53] border border-[#0d9c53]/40 flex items-center gap-1">
                    <span className="icon text-xs">airplanemode_active</span>
                    Offline Gereed
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                    <span className="icon text-xs">cloud_download</span>
                    Niet Volledig
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Beheer lokale AI-modellen en maak schijfruimte vrij op uw toestel
              </p>
            </div>
          </div>

          <button
            onClick={closeStorage}
            className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Sluiten"
            aria-label="Sluiten"
          >
            <span className="icon text-xl">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Storage Overview Card */}
          <div className="p-5 rounded-xl bg-[#1c1f26] border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Gebruikte Opslag door EdgeTR
                </span>
                <div className="text-2xl font-bold text-white mt-0.5">
                  {metrics?.formattedAppUsage || '0 MB'}
                  <span className="text-xs font-normal text-white/50 ml-2">
                    van {metrics?.formattedDeviceQuota || 'Apparaat Quota'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all flex items-center gap-1.5"
                >
                  <span className="icon text-sm">delete_sweep</span>
                  Wis Alle Modellen & Maak Ruimte Vrij
                </button>
                <button
                  onClick={handleClearAudioCache}
                  className="px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all flex items-center gap-1.5"
                  title="Wis tijdelijke audio-opnames"
                >
                  <span className="icon text-sm">cleaning_services</span>
                  Wis Audio Cache ({formatBytes(metrics?.audioCacheBytes || 0)})
                </button>
              </div>
            </div>

            {/* Storage Distribution Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                {/* STT Segment */}
                <div
                  style={{ width: '12%' }}
                  className="bg-[#1f94ff] h-full transition-all"
                  title="Whisper STT (~60MB)"
                />
                {/* LLM Segment */}
                <div
                  style={{ width: '70%' }}
                  className="bg-[#98beff] h-full transition-all"
                  title="Qwen 2.5 LLM (~398MB)"
                />
                {/* TTS Segment */}
                <div
                  style={{ width: '15%' }}
                  className="bg-[#0d9c53] h-full transition-all"
                  title="Piper Flemish TTS (~65MB)"
                />
                {/* Cache & VAD Segment */}
                <div
                  style={{ width: '3%' }}
                  className="bg-[#ff9c7a] h-full transition-all"
                  title="VAD & Audio Cache (~7MB)"
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-white/60 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1f94ff]" />
                  <span>STT (60 MB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#98beff]" />
                  <span>LLM (398 MB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0d9c53]" />
                  <span>Piper TTS (65 MB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff9c7a]" />
                  <span>VAD & Cache (~7 MB)</span>
                </div>
                <div className="ml-auto text-white/40">
                  Vrije schijfruimte: {metrics?.formattedFreeSpace || 'Onbekend'}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Download Banner if not ready */}
          {!metrics?.isOfflineReady && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#1f94ff]/20 to-[#0f3557]/40 border border-[#1f94ff]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span className="icon text-base text-[#448dff]">download</span>
                  Volledige Offline Modellen Bundel Downloaden
                </div>
                <p className="text-xs text-white/70">
                  Download Whisper, Qwen 2.5 en Piper Vlaams in één klik voor offline gebruik in vliegtuigmodus (~470 MB).
                </p>
                {bulkStatus && (
                  <p className="text-xs text-[#80c1ff] font-medium pt-1">
                    Download bezig: {bulkStatus}
                  </p>
                )}
              </div>
              <button
                onClick={handleDownloadAll}
                disabled={isBulkDownloading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1f94ff] hover:bg-[#2e96ff] disabled:opacity-50 rounded-lg shadow transition-all whitespace-nowrap flex items-center gap-1.5"
              >
                {isBulkDownloading ? (
                  <>
                    <span className="icon animate-spin text-sm">refresh</span>
                    Downloaden...
                  </>
                ) : (
                  <>
                    <span className="icon text-sm">cloud_download</span>
                    Download Alles (~470 MB)
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab Filter */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#1f94ff] text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Alle Componenten ({models.length})
              </button>
              <button
                onClick={() => setActiveTab('models')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'models'
                    ? 'bg-[#1f94ff] text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                AI Modellen
              </button>
              <button
                onClick={() => setActiveTab('cache')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'cache'
                    ? 'bg-[#1f94ff] text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                VAD & Audio Cache
              </button>
            </div>
            <span className="text-xs text-white/50">
              {models.filter((m) => m.isDownloaded).length} van {models.length} opgeslagen
            </span>
          </div>

          {/* Model Items List */}
          <div className="space-y-3">
            {filteredModels.map((model) => {
              const badge = getCategoryBadge(model.category);
              const isDownloading =
                downloadingId === model.id ||
                (model.downloadProgress > 0 && model.downloadProgress < 1.0);

              return (
                <div
                  key={model.id}
                  className={`p-4 rounded-xl border transition-all ${
                    model.isDownloaded
                      ? 'bg-[#161920] border-[#0d9c53]/30 hover:border-[#0d9c53]/50'
                      : 'bg-[#161920]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{model.name}</h4>
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold rounded-md uppercase"
                          style={{ color: badge.color, backgroundColor: badge.bg }}
                        >
                          {badge.label}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono text-white/60 bg-white/5 rounded">
                          {model.formattedSize}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 max-w-xl">{model.description}</p>
                      <div className="text-[11px] font-mono text-white/40 pt-0.5">
                        Bestandsnaam: {model.fileName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isDownloading ? (
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1f94ff] transition-all"
                              style={{ width: `${Math.round(model.downloadProgress * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#80c1ff] font-medium">
                            {Math.round(model.downloadProgress * 100)}%
                          </span>
                        </div>
                      ) : model.isDownloaded ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#0d9c53] font-medium flex items-center gap-1">
                            <span className="icon text-sm">check_circle</span>
                            Gedownload
                          </span>
                          <button
                            onClick={() => handleDeleteModel(model.id)}
                            className="px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-all flex items-center gap-1"
                            title="Verwijder bestand en maak schijfruimte vrij"
                          >
                            <span className="icon text-xs">delete</span>
                            Wis
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDownloadModel(model.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1f94ff] hover:bg-[#2e96ff] rounded-lg transition-all flex items-center gap-1"
                        >
                          <span className="icon text-xs">download</span>
                          Download ({model.formattedSize})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#1c1f26]/80 text-xs text-white/50">
          <div className="flex items-center gap-1.5">
            <span className="icon text-sm text-[#448dff]">security</span>
            <span>Modellen blijven 100% lokaal in het browser/apparaat-cachegeheugen bewaard.</span>
          </div>
          <button
            onClick={closeStorage}
            className="px-4 py-2 font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Sluiten
          </button>
        </div>

        {/* Clear All Confirmation Dialog */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md p-6 bg-[#1a1c22] border border-red-500/40 rounded-2xl shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30">
                  <span className="icon text-2xl">warning</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Alle Lokale Modellen Wissen?
                </h3>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Dit zal alle gedownloade AI-modellen (Whisper, Qwen, Piper Flemish) en tijdelijke audiocache van dit apparaat verwijderen. U wint direct{' '}
                <strong className="text-white font-semibold">
                  {metrics?.formattedAppUsage || '~525 MB'}
                </strong>{' '}
                aan vrije schijfruimte terug.
              </p>
              <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                Let op: U heeft daarna een internetverbinding nodig om de modellen opnieuw te downloaden voor offline gebruik.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={isClearingAll}
                  className="px-4 py-2 text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={isClearingAll}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isClearingAll ? (
                    <>
                      <span className="icon animate-spin text-sm">refresh</span>
                      Schijfruimte vrijmaken...
                    </>
                  ) : (
                    <>
                      <span className="icon text-sm">delete_forever</span>
                      Ja, Wis Alles & Maak Ruimte Vrij
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
