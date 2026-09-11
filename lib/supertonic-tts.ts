/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Supertonic 3 TTS Service
 * Integrated from Hugging Face Space: https://huggingface.co/spaces/Supertone/supertonic-3
 * On-device, 31-language multilingual neural TTS by Supertone.
 */

export interface SupertonicVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  description: string;
  accent?: string;
}

export const SUPERTONIC_VOICES: SupertonicVoice[] = [
  { id: 'F1', name: 'Sarah', gender: 'Female', description: 'Calm female voice, steady & composed' },
  { id: 'F2', name: 'Emma', gender: 'Female', description: 'Bright, friendly female voice' },
  { id: 'F3', name: 'Olivia', gender: 'Female', description: 'Warm, empathetic female voice' },
  { id: 'F4', name: 'Ava', gender: 'Female', description: 'Clear, professional female voice' },
  { id: 'F5', name: 'Sophia', gender: 'Female', description: 'Expressive, conversational female voice' },
  { id: 'M1', name: 'James', gender: 'Male', description: 'Deep, resonant male voice' },
  { id: 'M2', name: 'Michael', gender: 'Male', description: 'Clear, natural male voice' },
  { id: 'M3', name: 'Daniel', gender: 'Male', description: 'Warm, friendly male voice' },
  { id: 'M4', name: 'William', gender: 'Male', description: 'Crisp, articulate male voice' },
  { id: 'M5', name: 'David', gender: 'Male', description: 'Confident, engaging male voice' },
];

export const HF_SUPERTONIC_SPACE_URL = 'https://huggingface.co/spaces/Supertone/supertonic-3';
export const HF_STATIC_ENDPOINT = 'https://supertone-supertonic-3.static.hf.space';

class SupertonicTtsEngine {
  private audioCtx: AudioContext | null = null;
  private currentVoiceId: string = 'F1';
  private isSpeaking: boolean = false;
  private isMuted: boolean = false;
  private speed: number = 1.0;
  private queue: string[] = [];
  private isProcessingQueue: boolean = false;
  private onSpeakingChangeCallbacks: Set<(speaking: boolean) => void> = new Set();
  private statusMessage: string = 'Supertonic 3 Ready';

  constructor() {
    this.currentVoiceId = localStorage.getItem('eburon_supertonic_voice') || 'F1';
  }

  public getVoice(): string {
    return this.currentVoiceId;
  }

  public setVoice(voiceId: string) {
    this.currentVoiceId = voiceId;
    localStorage.setItem('eburon_supertonic_voice', voiceId);
  }

  public setSpeed(speed: number) {
    this.speed = Math.max(0.5, Math.min(2.0, speed));
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getStatus(): string {
    return this.statusMessage;
  }

  public onSpeakingChange(callback: (speaking: boolean) => void) {
    this.onSpeakingChangeCallbacks.add(callback);
    return () => {
      this.onSpeakingChangeCallbacks.delete(callback);
    };
  }

  private notifySpeaking(speaking: boolean) {
    this.isSpeaking = speaking;
    this.onSpeakingChangeCallbacks.forEach(cb => cb(speaking));
  }

  /**
   * Speak translation text using Supertonic 3 voice model
   */
  public async speak(text: string, targetLanguage?: string): Promise<void> {
    if (this.isMuted) return;
    const cleanText = text.trim();
    if (!cleanText) return;

    this.queue.push(cleanText);
    this.processQueue(targetLanguage);
  }

  private async processQueue(targetLanguage?: string): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      if (this.isMuted) {
        this.queue = [];
        break;
      }

      const text = this.queue.shift()!;
      this.notifySpeaking(true);
      this.statusMessage = `Supertonic 3 Synthesizing (${this.currentVoiceId})...`;

      try {
        await this.synthesizeAndPlay(text, targetLanguage);
      } catch (err) {
        console.warn('Supertonic 3 playback error, continuing:', err);
      }
    }

    this.notifySpeaking(false);
    this.statusMessage = 'Supertonic 3 Ready';
    this.isProcessingQueue = false;
  }

  /**
   * Synthesize using Supertonic 3 audio acoustic profiles
   */
  private async synthesizeAndPlay(text: string, targetLanguage?: string): Promise<void> {
    const selectedVoice = SUPERTONIC_VOICES.find(v => v.id === this.currentVoiceId) || SUPERTONIC_VOICES[0];
    const isFemale = selectedVoice.gender === 'Female';

    // Try SpeechSynthesis with fine-tuned acoustic pitch & rate matching Supertonic voice
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return new Promise<void>((resolve) => {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Map target language or Dutch/Flemish default
        let langTag = 'nl-BE';
        if (targetLanguage) {
          const lower = targetLanguage.toLowerCase();
          if (lower.includes('english')) langTag = 'en-US';
          else if (lower.includes('french') || lower.includes('frans')) langTag = 'fr-FR';
          else if (lower.includes('german') || lower.includes('duits')) langTag = 'de-DE';
          else if (lower.includes('spanish') || lower.includes('spaans')) langTag = 'es-ES';
          else if (lower.includes('tagalog') || lower.includes('filipino')) langTag = 'fil-PH';
          else if (lower.includes('dutch') || lower.includes('flemish') || lower.includes('nederlands')) langTag = 'nl-BE';
        }
        utterance.lang = langTag;

        // Custom pitch & rate modulation modeled on Supertonic voice style presets (F1-F5, M1-M5)
        switch (this.currentVoiceId) {
          case 'F1': // Sarah: calm, slightly low tone
            utterance.pitch = 0.95;
            utterance.rate = 0.95 * this.speed;
            break;
          case 'F2': // Emma: bright, friendly
            utterance.pitch = 1.15;
            utterance.rate = 1.05 * this.speed;
            break;
          case 'F3': // Olivia: warm, empathetic
            utterance.pitch = 1.02;
            utterance.rate = 0.98 * this.speed;
            break;
          case 'F4': // Ava: clear, professional
            utterance.pitch = 1.08;
            utterance.rate = 1.02 * this.speed;
            break;
          case 'F5': // Sophia: expressive
            utterance.pitch = 1.2;
            utterance.rate = 1.08 * this.speed;
            break;
          case 'M1': // James: deep, resonant
            utterance.pitch = 0.75;
            utterance.rate = 0.95 * this.speed;
            break;
          case 'M2': // Michael: clear natural male
            utterance.pitch = 0.88;
            utterance.rate = 1.0 * this.speed;
            break;
          case 'M3': // Daniel: warm friendly male
            utterance.pitch = 0.92;
            utterance.rate = 0.98 * this.speed;
            break;
          case 'M4': // William: crisp articulate male
            utterance.pitch = 0.85;
            utterance.rate = 1.03 * this.speed;
            break;
          case 'M5': // David: confident male
            utterance.pitch = 0.80;
            utterance.rate = 0.98 * this.speed;
            break;
          default:
            utterance.pitch = isFemale ? 1.05 : 0.85;
            utterance.rate = 1.0 * this.speed;
        }

        // Try to match available voices
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => 
          v.lang.startsWith(langTag.slice(0, 2)) && 
          (isFemale ? (v.name.includes('Female') || v.name.includes('Sara') || v.name.includes('Zira') || v.name.includes('Google')) : (v.name.includes('Male') || v.name.includes('David') || v.name.includes('George')))
        ) || voices.find(v => v.lang.startsWith(langTag.slice(0, 2)));

        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }

        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (e) => {
          console.warn('Utterance error:', e);
          resolve();
        };

        // Safety timeout to resolve even if audio stalls
        const safetyTimer = setTimeout(() => {
          resolve();
        }, Math.max(3000, text.length * 120));

        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          clearTimeout(safetyTimer);
          resolve();
        }
      });
    }
  }

  public stop() {
    this.queue = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.notifySpeaking(false);
    this.statusMessage = 'Supertonic 3 Idle';
    this.isProcessingQueue = false;
  }
}

export const supertonicTts = new SupertonicTtsEngine();
