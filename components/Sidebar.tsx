/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useSettings, useUI } from '../lib/state';
import { useHistoryStore } from '../lib/history';
import { AVAILABLE_LANGUAGES } from '../lib/constants';
import { SUPERTONIC_VOICES, supertonicTts } from '../lib/supertonic-tts';
import GgufModelUploader from './GgufModelUploader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Sidebar() {
  const { isSidebarOpen, closeSidebar } = useUI();
  const {
    language1, language2, autoDetect, customLanguages, medicalMode,
    activeSettingsTab, setActiveSettingsTab,
    supertonicVoice, supertonicSpeed,
    setLanguage1, setLanguage2, setAutoDetect, setMedicalMode,
    setSupertonicVoice, setSupertonicSpeed, refreshOllamaModels
  } = useSettings();

  const { history, clearHistory } = useHistoryStore();
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  useEffect(() => {
    refreshOllamaModels();
  }, [refreshOllamaModels]);

  const handleSwapLanguages = () => {
    if (autoDetect) return;
    const temp = language1;
    setLanguage1(language2);
    setLanguage2(temp);
  };

  const handleExport = () => {
    if (history.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(15);
    doc.text('Translation History', 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 27);

    const tableData = history.map(item => [
      new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      item.sourceText,
      item.translatedText
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Time', 'Source Text', 'Translation']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 80 },
        2: { cellWidth: 80 }
      }
    });

    doc.save('translations.pdf');
  };

  const handlePreviewVoice = async () => {
    if (isPlayingSample) return;
    setIsPlayingSample(true);
    const samplePhrase = language1.toLowerCase().includes('dutch') || language1.toLowerCase().includes('nederlands')
      ? 'Hallo, dit is een test van de stem.'
      : 'Hello, this is a test of the voice.';
    await supertonicTts.speak(samplePhrase, language1);
    setIsPlayingSample(false);
  };

  interface TabItem {
    id: 'general' | 'model' | 'voice' | 'history';
    label: string;
    icon: string;
    badge?: number;
  }

  const tabs: TabItem[] = [
    { id: 'general', label: 'General', icon: 'tune' },
    { id: 'model', label: 'Model', icon: 'memory' },
    { id: 'voice', label: 'Voice', icon: 'record_voice_over' },
    { id: 'history', label: 'History', icon: 'history', badge: history.length },
  ];

  const allLanguages = [...AVAILABLE_LANGUAGES.filter(l => l.value !== 'auto'), ...customLanguages];

  return (
    <>
      {/* Mobile Dimmed Backdrop Overlay */}
      <div
        className={`settings-backdrop ${isSidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Settings Drawer */}
      <aside
        className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Application Settings"
      >
        {/* Top App Bar with Done Button */}
        <div className="settings-top-bar">
          <div className="settings-top-title">
            <span className="icon">settings</span>
            <span>Settings</span>
          </div>

          <button
            type="button"
            onClick={closeSidebar}
            className="settings-done-btn"
          >
            Done
          </button>
        </div>

        {/* Segmented Tab Navigation Dock */}
        <div className="settings-tabs-wrapper">
          <nav className="settings-tabs-nav" aria-label="Settings categories">
            {tabs.map(tab => {
              const isActive = activeSettingsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSettingsTab(tab.id)}
                  className={`settings-tab-btn ${isActive ? 'active' : ''}`}
                  title={tab.label}
                >
                  <span className="icon">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="settings-tab-badge">{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Scrollable Body Content */}
        <div className="settings-body">
          {/* GENERAL TAB */}
          {activeSettingsTab === 'general' && (
            <>
              {/* Language Pairing Card */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <span>Language Pairing</span>
                  <button
                    type="button"
                    onClick={handleSwapLanguages}
                    disabled={autoDetect}
                    className="swap-btn"
                    title="Swap languages"
                  >
                    <span className="icon">sync_alt</span>
                    <span>Swap</span>
                  </button>
                </div>

                <div className="language-pair-container">
                  <div className="language-field">
                    <span className="language-field-label">Staff (You)</span>
                    <select
                      value={language1}
                      onChange={e => setLanguage1(e.target.value)}
                      className="settings-select-styled"
                    >
                      {allLanguages.map(lang => (
                        <option key={lang.value} value={lang.value}>{lang.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="language-field">
                    <span className="language-field-label">Guest (Visitor)</span>
                    <select
                      value={language2}
                      onChange={e => setLanguage2(e.target.value)}
                      disabled={autoDetect}
                      className="settings-select-styled"
                    >
                      {allLanguages.map(lang => (
                        <option key={lang.value} value={lang.value}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Preferences Toggles Card */}
              <div className="settings-card">
                <div className="toggle-setting-row">
                  <div className="toggle-setting-info">
                    <span className="toggle-setting-title">Auto-Detect Guest Language</span>
                    <span className="toggle-setting-desc">Detects visitor speech language automatically</span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoDetect}
                    onClick={() => setAutoDetect(!autoDetect)}
                    className={`ios-toggle-switch ${autoDetect ? 'active' : ''}`}
                    aria-label="Toggle auto detect language"
                  >
                    <span className="ios-toggle-thumb" />
                  </button>
                </div>

                <div className="toggle-setting-row">
                  <div className="toggle-setting-info">
                    <span className="toggle-setting-title">Medical Terminology Mode</span>
                    <span className="toggle-setting-desc">Optimizes model prompts for clinical accuracy</span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={medicalMode}
                    onClick={() => setMedicalMode(!medicalMode)}
                    className={`ios-toggle-switch ${medicalMode ? 'active' : ''}`}
                    aria-label="Toggle medical terminology mode"
                  >
                    <span className="ios-toggle-thumb" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* MODEL TAB */}
          {activeSettingsTab === 'model' && (
            <GgufModelUploader />
          )}

          {/* VOICE TAB */}
          {activeSettingsTab === 'voice' && (
            <>
              <div className="settings-card">
                <div className="settings-card-header">
                  <span>Speech Synthesis</span>
                  <button
                    type="button"
                    onClick={handlePreviewVoice}
                    disabled={isPlayingSample}
                    className="voice-test-btn"
                  >
                    <span className="icon">{isPlayingSample ? 'volume_up' : 'play_arrow'}</span>
                    <span>{isPlayingSample ? 'Playing...' : 'Test Voice'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="language-field">
                    <span className="language-field-label">Supertonic 3 Voice Profile</span>
                    <select
                      value={supertonicVoice}
                      onChange={e => setSupertonicVoice(e.target.value)}
                      className="settings-select-styled"
                    >
                      {SUPERTONIC_VOICES.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.id} · {v.name} ({v.gender})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="language-field" style={{ paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                      <span>Playback Speed</span>
                      <span style={{ color: '#60a5fa', fontWeight: 600, fontFamily: 'monospace' }}>
                        {supertonicSpeed.toFixed(1)}x
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.7"
                      max="1.4"
                      step="0.1"
                      value={supertonicSpeed}
                      onChange={e => setSupertonicSpeed(parseFloat(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', margin: '4px 0' }}
                    />

                    <div className="voice-presets-row">
                      {[0.8, 1.0, 1.2].map(speed => (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => setSupertonicSpeed(speed)}
                          className={`voice-preset-btn ${Math.abs(supertonicSpeed - speed) < 0.05 ? 'active' : ''}`}
                        >
                          {speed.toFixed(1)}x {speed === 1.0 ? '(Normal)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Acoustic Shield Status */}
              <div className="echo-shield-badge">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  <span style={{ fontWeight: 600 }}>Acoustic Echo Shield Active</span>
                </div>
                <span style={{ opacity: 0.8, fontSize: '10px' }}>Mic muted during speaker</span>
              </div>
            </>
          )}

          {/* HISTORY TAB */}
          {activeSettingsTab === 'history' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                  Recorded Sessions ({history.length})
                </span>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={history.length === 0}
                    className="swap-btn"
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', padding: '4px 8px' }}
                  >
                    <span className="icon" style={{ fontSize: '13px' }}>download</span>
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearHistory}
                    disabled={history.length === 0}
                    className="swap-btn"
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#f87171', padding: '4px 8px' }}
                  >
                    <span className="icon" style={{ fontSize: '13px' }}>delete</span>
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.length > 0 ? (
                  history.map(item => (
                    <div key={item.id} className="history-turn-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>
                        <span style={{ fontFamily: 'monospace' }}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ color: '#93c5fd', fontWeight: 600 }}>
                          {item.lang1} → {item.lang2}
                        </span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {item.sourceText}
                      </div>
                      <div style={{ color: '#93c5fd', fontWeight: 500, paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {item.translatedText}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                    <span className="icon" style={{ fontSize: '28px', display: 'block', marginBottom: '6px' }}>history</span>
                    <span>No recorded translations yet</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
