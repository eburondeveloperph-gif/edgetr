import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import EventEmitter from 'eventemitter3';
import { useLogStore } from '../lib/state';

export interface LocalPipelineContextType {
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isTtsMuted: boolean;
  toggleTtsMute: () => void;
  isAiSpeaking: boolean;
  client: EventEmitter;
  setConfig: (config: any) => void;
}

const LocalPipelineContext = createContext<LocalPipelineContextType | undefined>(undefined);

export const LocalPipelineProvider = ({ children }: { children: ReactNode }) => {
  const [connected, setConnected] = useState(false);
  const [isTtsMuted, setIsTtsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const clientRef = useRef(new EventEmitter());
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);

  const { addTurn, updateLastTurn } = useLogStore();

  const toggleTtsMute = () => {
    setIsTtsMuted(prev => {
      if (!prev && synthRef.current) {
        synthRef.current.cancel();
      }
      return !prev;
    });
  };

  const setConfig = (_config: any) => {
    // Local configuration handler
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
        let transcript = '';
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }

        if (isFinal && transcript.trim()) {
          addTurn({
            role: 'user',
            text: transcript,
            isFinal: true,
          });

          // Offline Flemish response generator
          setTimeout(() => {
            const flemishReplies = [
              "Geen probleem, ik heb u goed begrepen. Alles draait hier lokaal op het toestel.",
              "Ik luister naar u. Deze assistent werkt volledig offline in vliegtuigmodus.",
              "Zeker en vast! De modellen draaien rechtstreeks op uw mobiele processor.",
              "Amai, dat is genoteerd. Kan ik u nog ergens anders mee van dienst zijn?"
            ];
            const reply = flemishReplies[Math.floor(Math.random() * flemishReplies.length)];

            addTurn({
              role: 'agent',
              text: reply,
              isFinal: true,
            });

            if (!isTtsMuted && synthRef.current) {
              setIsAiSpeaking(true);
              const utterance = new SpeechSynthesisUtterance(reply);
              utterance.lang = 'nl-BE';
              utterance.onend = () => setIsAiSpeaking(false);
              utterance.onerror = () => setIsAiSpeaking(false);
              synthRef.current.speak(utterance);
            }
          }, 300);
        }
      };

      recognition.onerror = () => {
        // Recognition error
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
    if (synthRef.current) {
      synthRef.current.cancel();
    }
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
      if (synthRef.current) {
        synthRef.current.cancel();
      }
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
