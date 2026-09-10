
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { create } from 'zustand';
import { ConversationTurn } from './state';

// --- AUTH STORE ---
interface AuthState {
  session: any | null;
  user: { id: string; email: string } | null;
  isSuperAdmin: boolean;
  loading: boolean;
  loadingData: boolean;
  signOut: () => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

export const useAuth = create<AuthState>(() => ({
  session: { MOCKED: true },
  user: { id: 'local-user', email: 'local-user@example.com' },
  isSuperAdmin: true,
  loading: false,
  loadingData: false,
  signOut: () => {
    /* No operation */
  },
  signInWithPassword: async () => {
    return Promise.resolve();
  },
  signUp: async () => {
    return Promise.resolve();
  },
  sendPasswordResetEmail: async () => {
    return Promise.resolve();
  },
}));

// --- LOCAL STORAGE HELPERS FOR OFFLINE EDGE USAGE ---
const SETTINGS_KEY = 'edgetr_local_user_settings';
const CONVERSATIONS_KEY = 'edgetr_local_user_conversations';

export const updateUserSettings = async (
  userId: string,
  newSettings: Partial<{ systemPrompt: string; voice: string }>
) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = localStorage.getItem(`${SETTINGS_KEY}_${userId}`);
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem(
        `${SETTINGS_KEY}_${userId}`,
        JSON.stringify({ ...parsed, ...newSettings })
      );
    }
  } catch (e) {
    console.warn('Could not save user settings locally:', e);
  }
  return Promise.resolve();
};

export const updateUserConversations = async (
  userId: string,
  turns: ConversationTurn[]
) => {
  const lastTurn = turns[turns.length - 1];
  if (!lastTurn || !lastTurn.isFinal) return;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = localStorage.getItem(`${CONVERSATIONS_KEY}_${userId}`);
      const parsed: any[] = existing ? JSON.parse(existing) : [];
      parsed.push({
        user_id: userId,
        role: lastTurn.role,
        text: lastTurn.text,
        timestamp: lastTurn.timestamp
          ? new Date(lastTurn.timestamp).toISOString()
          : new Date().toISOString(),
      });
      // Keep last 100 turns in local buffer
      if (parsed.length > 100) parsed.shift();
      localStorage.setItem(
        `${CONVERSATIONS_KEY}_${userId}`,
        JSON.stringify(parsed)
      );
    }
  } catch (e) {
    console.warn('Could not save conversation turn locally:', e);
  }
};

export const clearUserConversations = async (userId: string) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`${CONVERSATIONS_KEY}_${userId}`);
    }
  } catch (e) {
    console.warn('Could not clear user conversations locally:', e);
  }
};

