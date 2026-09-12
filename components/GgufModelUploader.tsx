/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { localGgufEngine, GgufEngineStatus } from '../lib/local-gguf-engine';
import { GgufMetadata, parseGgufHeader } from '../lib/gguf-parser';
import { useSettings } from '../lib/state';
import { POPULAR_FALLBACK_MODELS } from '../lib/ollama';

export default function GgufModelUploader() {
  const {
    llmProvider,
    setLlmProvider,
    ollamaModel,
    setOllamaModel,
    availableOllamaModels,
    isOllamaConnected,
    isOllamaLoading,
    refreshOllamaModels,
  } = useSettings();

  const [engineStatus, setEngineStatus] = useState<GgufEngineStatus>(localGgufEngine.getStatus());
  const [modelMeta, setModelMeta] = useState<GgufMetadata | null>(localGgufEngine.getMetadata());
  const [isDragging, setIsDragging] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStage, setLoadStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick test state
  const [testInput, setTestInput] = useState('Hello, how can I help you?');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [showTest, setShowTest] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = localGgufEngine.subscribe((status) => {
      setEngineStatus(status);
      setModelMeta(localGgufEngine.getMetadata());
    });
    localGgufEngine.tryRestoreFromStorage().catch(() => {});
    return () => unsubscribe();
  }, []);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gguf')) {
      setErrorMessage('Please select a .gguf model file.');
      return;
    }

    setErrorMessage(null);
    setLoadProgress(10);
    setLoadStage('Verifying header...');

    try {
      const meta = await parseGgufHeader(file);
      if (!meta.isValid) {
        setErrorMessage(meta.error || 'Invalid GGUF format.');
        setLoadProgress(0);
        return;
      }

      setModelMeta(meta);
      await localGgufEngine.loadModel(file, meta, true, (pct, stage) => {
        setLoadProgress(pct);
        setLoadStage(stage);
      });

      setLlmProvider('gguf');
      setLoadProgress(100);
      setLoadStage('Ready');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize model.');
      setLoadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUnload = async () => {
    await localGgufEngine.unloadModel(true);
    setModelMeta(null);
    setTestOutput('');
  };

  const handleTestTranslation = async () => {
    if (!testInput.trim() || isTesting) return;
    setIsTesting(true);
    setTestOutput('Translating...');
    try {
      const result = await localGgufEngine.generateTranslation({
        text: testInput.trim(),
        systemPrompt: 'Translate into natural Dutch. Output ONLY the translation.',
      });
      setTestOutput(result);
    } catch (err: any) {
      setTestOutput(`Error: ${err?.message || 'Failed'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Compact Segmented Switcher */}
      <div className="model-provider-switch">
        <button
          type="button"
          onClick={() => setLlmProvider('gguf')}
          className={`model-provider-btn ${llmProvider === 'gguf' ? 'active' : ''}`}
        >
          <span className="icon">memory</span>
          <span>Local GGUF</span>
        </button>

        <button
          type="button"
          onClick={() => setLlmProvider('ollama')}
          className={`model-provider-btn ${llmProvider === 'ollama' ? 'active' : ''}`}
        >
          <span className="icon">dns</span>
          <span>Ollama Server</span>
        </button>
      </div>

      {/* GGUF VIEW */}
      {llmProvider === 'gguf' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {modelMeta && engineStatus === 'ready' ? (
            <div className="settings-card" style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}>
              {/* Header with status and actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={modelMeta.fileName}>
                    {modelMeta.fileName}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="swap-btn"
                    style={{ padding: '2px 8px' }}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleUnload}
                    className="swap-btn"
                    style={{ color: '#f87171', padding: '2px 6px' }}
                    title="Unload model"
                  >
                    <span className="icon" style={{ fontSize: '14px' }}>close</span>
                  </button>
                </div>
              </div>

              {/* Compact 4-spec row */}
              <div className="model-specs-grid">
                <div className="model-spec-pill">
                  <span className="model-spec-label">Size</span>
                  <span className="model-spec-val">{formatSize(modelMeta.fileSize)}</span>
                </div>
                <div className="model-spec-pill">
                  <span className="model-spec-label">Quant</span>
                  <span className="model-spec-val" style={{ color: '#34d399' }}>{modelMeta.quantization}</span>
                </div>
                <div className="model-spec-pill">
                  <span className="model-spec-label">Arch</span>
                  <span className="model-spec-val" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{modelMeta.architecture}</span>
                </div>
                <div className="model-spec-pill">
                  <span className="model-spec-label">Context</span>
                  <span className="model-spec-val">{modelMeta.contextLength || 2048}</span>
                </div>
              </div>

              {/* Quick test toggle */}
              <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <button
                  type="button"
                  onClick={() => setShowTest(!showTest)}
                  style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  <span className="icon" style={{ fontSize: '14px' }}>{showTest ? 'expand_less' : 'expand_more'}</span>
                  <span>{showTest ? 'Hide test tool' : 'Test on-device translation'}</span>
                </button>

                {showTest && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={testInput}
                        onChange={e => setTestInput(e.target.value)}
                        placeholder="Type test sentence..."
                        style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#fff', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={handleTestTranslation}
                        disabled={isTesting || !testInput.trim()}
                        className="settings-done-btn"
                        style={{ padding: '4px 12px', fontSize: '11px' }}
                      >
                        {isTesting ? '...' : 'Run'}
                      </button>
                    </div>
                    {testOutput && (
                      <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#93c5fd', fontFamily: 'monospace' }}>
                        {testOutput}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Compact Upload Dropzone */
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="model-dropzone-box"
              style={isDragging ? { borderColor: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' } : {}}
            >
              <span className="icon" style={{ fontSize: '26px', color: '#60a5fa' }}>upload_file</span>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'block' }}>
                  Drop .gguf file or click to browse
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)' }}>
                  Runs 100% offline inside browser WASM
                </span>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".gguf"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />

          {/* Progress / Error */}
          {engineStatus === 'loading' && (
            <div style={{ padding: '10px 12px', background: 'rgba(30, 58, 138, 0.3)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#93c5fd' }}>
                <span>{loadStage || 'Loading weights...'}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{loadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${loadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s' }} />
              </div>
            </div>
          )}

          {errorMessage && (
            <div style={{ padding: '8px 12px', background: 'rgba(127, 29, 29, 0.3)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', fontSize: '11px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="icon" style={{ fontSize: '15px', color: '#ef4444' }}>error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Recommended Models Compact Row */}
          {!modelMeta && (
            <div className="settings-card" style={{ padding: '10px 12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.65)', display: 'block', marginBottom: '4px' }}>
                Recommended Lightweight Models:
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255, 255, 255, 0.55)', padding: '2px 0' }}>
                <span>• Qwen 2.5 0.5B Instruct</span>
                <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>~398 MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255, 255, 255, 0.55)', padding: '2px 0' }}>
                <span>• Llama 3.2 1B Instruct</span>
                <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>~750 MB</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OLLAMA VIEW */}
      {llmProvider === 'ollama' && (
        <div className="settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>Ollama Daemon</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                fontSize: '10px',
                borderRadius: '999px',
                fontWeight: 600,
                background: isOllamaConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: isOllamaConnected ? '#6ee7b7' : '#fcd34d'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOllamaConnected ? '#34d399' : '#f59e0b', display: 'inline-block' }} />
                {isOllamaLoading ? 'Checking...' : isOllamaConnected ? 'Online' : 'Offline'}
              </span>
              <button
                type="button"
                onClick={() => refreshOllamaModels()}
                disabled={isOllamaLoading}
                className="swap-btn"
                style={{ padding: '2px 6px' }}
                title="Refresh"
              >
                <span className="icon" style={{ fontSize: '14px' }}>sync</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>Select Model Tag</label>
            <select
              value={ollamaModel}
              onChange={e => {
                if (e.target.value === '__custom__') {
                  const custom = prompt('Model tag (e.g. qwen2.5:0.5b):', ollamaModel);
                  if (custom?.trim()) setOllamaModel(custom.trim());
                } else {
                  setOllamaModel(e.target.value);
                }
              }}
              className="settings-select-styled"
            >
              {availableOllamaModels.length > 0 ? (
                availableOllamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)
              ) : (
                POPULAR_FALLBACK_MODELS.map(m => <option key={m} value={m}>{m}</option>)
              )}
              <option value="__custom__">+ Custom model tag...</option>
            </select>
          </div>

          {!isOllamaConnected && (
            <div style={{ padding: '8px 10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', fontSize: '10px', color: '#fcd34d', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>Start daemon with CORS enabled:</span>
              <code style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', color: '#fde68a', userSelect: 'all' }}>
                OLLAMA_ORIGINS="*" ollama serve
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
