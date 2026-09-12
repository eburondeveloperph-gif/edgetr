/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GgufMetadata } from './gguf-parser';

const DB_NAME = 'EburonTranslatorDB';
const STORE_NAME = 'gguf_models';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open database.'));
  });
}

export interface StoredGgufRecord {
  id: string;
  file: Blob | File;
  metadata: GgufMetadata;
  savedAt: number;
}

export async function saveGgufModelToStorage(file: Blob | File, metadata: GgufMetadata): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: StoredGgufRecord = {
      id: 'active_model',
      file,
      metadata,
      savedAt: Date.now(),
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to save GGUF model in storage.'));
  });
}

export async function loadGgufModelFromStorage(): Promise<StoredGgufRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('active_model');

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function clearGgufModelFromStorage(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete('active_model');

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to delete model from storage.'));
    });
  } catch {
    // Ignore error if DB doesn't exist
  }
}
