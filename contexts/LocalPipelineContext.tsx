import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import EventEmitter from 'eventemitter3';
import { useLogStore, useSettings } from '../lib/state';
import { useHistoryStore } from '../lib/history';
import { generateOllamaTranslation } from '../lib/ollama';
import { localGgufEngine } from '../lib/local-gguf-engine';
import { supertonicTts } from '../lib/supertonic-tts';

export interface LocalPipelineContextType {
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isTtsMuted: boolean;
  toggleTtsMute: () => void;
  isAiSpeaking: boolean;
  client: EventEmitter;
  setConfig: (config: any) => void;
  sendUserMessage: (text: string) => Promise<void>;
}

const LocalPipelineContext = createContext<LocalPipelineContextType | undefined>(undefined);

export const LocalPipelineProvider = ({ children }: { children: ReactNode }) => {
  const [connected, setConnected] = useState(false);
  const [isTtsMuted, setIsTtsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const isAiSpeakingRef = useRef(false);
  const connectedRef = useRef(false);
  const clientRef = useRef(new EventEmitter());
  const recognitionRef = useRef<any>(null);

  const { addTurn, updateLastTurn } = useLogStore();

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    const unsub = supertonicTts.onSpeakingChange((speaking) => {
      setIsAiSpeaking(speaking);
      isAiSpeakingRef.current = speaking;

      // When speaker starts outputting audio, pause/abort speech recognition so the mic does not hear the speaker
      if (speaking && recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      } else if (!speaking && connectedRef.current && recognitionRef.current) {
        // Speaker finished and acoustic echo cooldown cleared: resume listening to user
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    });
    return () => unsub();
  }, []);

  const toggleTtsMute = () => {
    setIsTtsMuted(prev => {
      const next = !prev;
      supertonicTts.setMuted(next);
      return next;
    });
  };

  const setConfig = (_config: any) => {
    // Local configuration handler
  };

  const sendUserMessage = async (userText: string) => {
    const clean = userText.trim();
    if (!clean) return;

    addTurn({
      role: 'user',
      text: clean,
      isFinal: true,
    });

    const { llmProvider, ollamaEndpoint, ollamaModel, systemPrompt, language1, language2 } = useSettings.getState();
    
    let modelNameLabel = ollamaModel;
    if (llmProvider === 'gguf') {
      const meta = localGgufEngine.getMetadata();
      modelNameLabel = meta?.fileName ? meta.fileName.replace('.gguf', '') : 'Local GGUF';
    }

    // Add placeholder agent turn while LLM generates translation
    addTurn({
      role: 'agent',
      text: `Translating with ${llmProvider === 'gguf' ? 'Local GGUF' : 'Ollama'} (${modelNameLabel})...`,
      translation: '...',
      isFinal: false,
    });

    try {
      let translation = '';

      if (llmProvider === 'gguf') {
        if (!localGgufEngine.isReady()) {
          const restored = await localGgufEngine.tryRestoreFromStorage();
          if (!restored || !localGgufEngine.isReady()) {
            throw new Error('No .gguf model is currently loaded. Please go to Settings > Model and upload your GGUF file.');
          }
        }

        translation = await localGgufEngine.generateTranslation({
          text: clean,
          systemPrompt,
        });
      } else {
        translation = await generateOllamaTranslation({
          endpoint: ollamaEndpoint,
          model: ollamaModel,
          systemPrompt,
          text: clean,
        });
      }

      updateLastTurn({
        role: 'agent',
        text: translation,
        translation: translation,
        isFinal: true,
      });

      useHistoryStore.getState().addHistoryItem({
        sourceText: clean,
        translatedText: translation,
        lang1: language1,
        lang2: language2,
      });

      // Play translated text with Supertonic 3 TTS
      await supertonicTts.speak(translation, language2);
    } catch (err: any) {
      console.warn('Translation error:', err);
      const notice = llmProvider === 'gguf'
        ? `[GGUF: ${err?.message || 'Model error'}] ${clean}`
        : `[Ollama offline - run 'OLLAMA_ORIGINS="*" ollama serve'] ${clean}`;

      updateLastTurn({
        role: 'agent',
        text: notice,
        translation: clean,
        isFinal: true,
      });

      // Still speak with Supertonic 3
      await supertonicTts.speak(clean, language2);
    }
  };

  const connect = async () => {
    setConnected(true);
    clientRef.current.emit('open');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'nl-BE';

      recognition.onresult = (event: any) => {
        // Block speaker echo from being registered as user speech
        if (isAiSpeakingRef.current || supertonicTts.isPlaying()) {
          return;
        }

        let transcript = '';
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }

        if (isFinal && transcript.trim()) {
          if (isAiSpeakingRef.current || supertonicTts.isPlaying()) {
            return;
          }
          sendUserMessage(transcript);
        }
      };

      recognition.onerror = () => {
        // Recognition error handled gracefully
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('SpeechRecognition error or already active:', e);
      }
    }
  };

  const disconnect = async () => {
    setConnected(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    supertonicTts.stop();
    setIsAiSpeaking(false);
    clientRef.current.emit('close');
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      supertonicTts.stop();
    };
  }, []);

  return (
    <LocalPipelineContext.Provider
      value={{
        connected,
        connect,
        disconnect,
        isTtsMuted,
        toggleTtsMute,
        isAiSpeaking,
        client: clientRef.current,
        setConfig,
        sendUserMessage,
      }}
    >
      {children}
    </LocalPipelineContext.Provider>
  );
};

export const useLocalPipeline = () => {
  const context = useContext(LocalPipelineContext);
  if (!context) {
    throw new Error('useLocalPipeline must be used within a LocalPipelineProvider');
  }
  return context;
};
