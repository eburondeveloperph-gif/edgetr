/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useUI, useSettings } from '../lib/state';
import { localGgufEngine, GgufEngineStatus } from '../lib/local-gguf-engine';

export default function Header() {
  const { toggleSidebar, openSidebar } = useUI();
  const {
    llmProvider,
    ollamaModel,
    isOllamaConnected,
    supertonicVoice,
    setActiveSettingsTab,
  } = useSettings();

  const [ggufStatus, setGgufStatus] = useState<GgufEngineStatus>(localGgufEngine.getStatus());
  const [ggufFileName, setGgufFileName] = useState<string>(
    localGgufEngine.getMetadata()?.fileName || ''
  );

  useEffect(() => {
    const unsub = localGgufEngine.subscribe((status) => {
      setGgufStatus(status);
      const meta = localGgufEngine.getMetadata();
      setGgufFileName(meta?.fileName || '');
    });
    return () => unsub();
  }, []);

  const openModelSettings = () => {
    setActiveSettingsTab('model');
    openSidebar();
  };

  const openVoiceSettings = () => {
    setActiveSettingsTab('voice');
    openSidebar();
  };

  return (
    <header>
      <div className="header-left">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 pr-1 text-white font-semibold text-sm tracking-tight">
            <span className="icon text-[#448dff] text-lg">translate</span>
            <span className="hidden sm:inline">Voice Translator</span>
          </div>

          {/* Model Status Button */}
          {llmProvider === 'gguf' ? (
            <button
              onClick={openModelSettings}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${
                ggufStatus === 'ready'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : ggufStatus === 'loading'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Click to manage GGUF model in Settings"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  ggufStatus === 'ready'
                    ? 'bg-emerald-400 animate-pulse'
                    : ggufStatus === 'loading'
                    ? 'bg-blue-400'
                    : 'bg-amber-400'
                }`}
              />
              <span className="icon text-xs">memory</span>
              <span className="truncate max-w-[140px] sm:max-w-[180px]">
                {ggufStatus === 'ready' && ggufFileName
                  ? ggufFileName.replace('.gguf', '')
                  : ggufStatus === 'loading'
                  ? 'Loading GGUF...'
                  : 'Upload .gguf'}
              </span>
            </button>
          ) : (
            <button
              onClick={openModelSettings}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${
                isOllamaConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Click to manage Ollama model in Settings"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOllamaConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="icon text-xs">dns</span>
              <span>Ollama: {ollamaModel.replace(':latest', '')}</span>
            </button>
          )}

          {/* Supertonic Voice Button */}
          <button
            onClick={openVoiceSettings}
            className="hidden sm:flex text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 items-center gap-1.5 hover:bg-blue-500/30 transition-colors"
            title="Click to configure Supertonic 3 TTS in Settings"
          >
            <span className="icon text-xs">record_voice_over</span>
            <span>Supertonic 3 ({supertonicVoice})</span>
          </button>
        </div>
      </div>

      <div className="header-right flex items-center gap-2">
        <button
          className="settings-button p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5"
          onClick={toggleSidebar}
          aria-label="Settings"
          title="Settings & Models"
        >
          <span className="icon text-xl">tune</span>
          <span className="text-xs font-medium hidden sm:inline text-white/70">Settings</span>
        </button>
      </div>
    </header>
  );
}
