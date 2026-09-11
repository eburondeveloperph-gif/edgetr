/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect } from 'react';
import { useSettings, useUI } from '../lib/state';
import c from 'classnames';
import { useLocalPipeline } from '../contexts/LocalPipelineContext';
import { useHistoryStore } from '../lib/history';
import { AVAILABLE_LANGUAGES } from '../lib/constants';
import { SUPERTONIC_VOICES } from '../lib/supertonic-tts';
import { POPULAR_FALLBACK_MODELS } from '../lib/ollama';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const {
    language1, language2, autoDetect, customLanguages, medicalMode,
    ollamaModel, availableOllamaModels, isOllamaConnected, isOllamaLoading,
    supertonicVoice, supertonicSpeed,
    setLanguage1, setLanguage2, setAutoDetect, setMedicalMode,
    setOllamaModel, setSupertonicVoice, setSupertonicSpeed, refreshOllamaModels
  } = useSettings();
  const { connected } = useLocalPipeline();
  const { history, clearHistory } = useHistoryStore();

  useEffect(() => {
    refreshOllamaModels();
  }, [refreshOllamaModels]);

  const handleExport = () => {
    if (history.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Translation History', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 28);

    const tableData = history.map(item => [
      new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      item.sourceText,
      item.translatedText
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['Time', 'Source', 'Translation']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [68, 141, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 80 },
        2: { cellWidth: 80 }
      }
    });

    doc.save('translations.pdf');
  };

  return (
    <aside className={c('sidebar', { open: isSidebarOpen })}>
      <div className="sidebar-header">
        <h3>Settings</h3>
        <button onClick={toggleSidebar} className="close-button" aria-label="Close">
          <span className="icon">close</span>
        </button>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-section">
          <fieldset disabled={connected}>
            {/* Ollama Model */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  Model
                </label>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded font-medium ${
                      isOllamaConnected
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOllamaConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    {isOllamaLoading ? 'Checking...' : isOllamaConnected ? 'Online' : 'Offline'}
                  </span>
                  <button
                    type="button"
                    onClick={() => refreshOllamaModels()}
                    disabled={isOllamaLoading}
                    className="p-1 text-white/60 hover:text-white rounded transition-colors"
                    title="Refresh"
                  >
                    <span className={`icon text-xs leading-none ${isOllamaLoading ? 'animate-spin' : ''}`}>sync</span>
                  </button>
                </div>
              </div>

              <select
                value={ollamaModel}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    const custom = prompt('Model tag:', ollamaModel);
                    if (custom?.trim()) setOllamaModel(custom.trim());
                  } else {
                    setOllamaModel(e.target.value);
                  }
                }}
              >
                {availableOllamaModels.length > 0 ? (
                  availableOllamaModels.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  POPULAR_FALLBACK_MODELS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                )}
                <option value="__custom__">+ Custom model...</option>
              </select>

              {!isOllamaConnected && (
                <code className="text-[10px] text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 font-mono select-all">
                  OLLAMA_ORIGINS="*" ollama serve
                </code>
              )}
            </div>

            {/* Voice */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Voice
              </label>
              <select
                value={supertonicVoice}
                onChange={e => setSupertonicVoice(e.target.value)}
              >
                {SUPERTONIC_VOICES.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.id} · {v.name} ({v.gender})
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-between mt-1 text-xs text-white/60">
                <span>Speed: {supertonicSpeed.toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.1"
                  value={supertonicSpeed}
                  onChange={e => setSupertonicSpeed(parseFloat(e.target.value))}
                  className="w-24 accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Staff Language */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Staff Language
              </label>
              <select
                value={language1}
                onChange={e => setLanguage1(e.target.value)}
              >
                {[...AVAILABLE_LANGUAGES.filter(l => l.value !== 'auto'), ...customLanguages].map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Guest Language */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  Guest Language
                </label>
                <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDetect}
                    onChange={e => setAutoDetect(e.target.checked)}
                    className="w-3.5 h-3.5 accent-blue-500"
                  />
                  <span>Auto-detect</span>
                </label>
              </div>

              <select
                value={language2}
                onChange={e => setLanguage2(e.target.value)}
                disabled={autoDetect}
              >
                {[...AVAILABLE_LANGUAGES.filter(l => l.value !== 'auto'), ...customLanguages].map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/30 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setMedicalMode(false)}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                    !medicalMode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setMedicalMode(true)}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                    medicalMode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Medical
                </button>
              </div>
            </div>
          </fieldset>

          <button
            onClick={toggleSidebar}
            className="save-settings-button mt-4"
            disabled={connected}
          >
            Done
          </button>
        </div>

        {/* Translation History */}
        <div className="sidebar-section history-section border-t border-white/10 pt-4">
          <div className="sidebar-section-title-wrapper">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">
              History
            </h4>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="export-history-button"
                disabled={history.length === 0}
                aria-label="Export history"
                title="Export history"
              >
                <span className="icon text-sm">download</span>
              </button>
              <button
                onClick={clearHistory}
                className="clear-history-button"
                disabled={history.length === 0}
                aria-label="Clear history"
                title="Clear history"
              >
                <span className="icon text-sm">delete_sweep</span>
              </button>
            </div>
          </div>

          <div className="history-list mt-2">
            {history.length > 0 ? (
              history.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-item-header">
                    <span className="history-item-time">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="history-item-langs">
                      {item.lang1} → {item.lang2}
                    </span>
                  </div>
                  <div className="text-xs text-white/80 my-0.5">
                    {item.sourceText}
                  </div>
                  <div className="text-xs text-blue-300 font-medium">
                    {item.translatedText}
                  </div>
                </div>
              ))
            ) : (
              <p className="history-empty-placeholder">
                No history yet
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}