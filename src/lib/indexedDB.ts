/**
 * IndexedDB Permanent Storage Utility for TradeForge Journal
 * Handles high-capacity permanent storage for trades, high-res screenshots, plans, and reviews.
 */

const DB_NAME = 'TradeForgeJournalDB';
const DB_VERSION = 2;

export const STORES = {
  TRADES: 'trades',
  PLANS: 'plans',
  ACCOUNTS: 'accounts',
  DAILY_REVIEWS: 'daily_reviews',
  WEEKLY_REVIEWS: 'weekly_reviews',
  JOURNAL_RULES: 'journal_rules',
  SETUPS: 'setups',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export function initIDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB is not supported in this environment.');
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function getAllIDB<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await initIDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result as T[]) || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`Failed to fetch items from IndexedDB [${storeName}]:`, error);
    return [];
  }
}

export async function saveIDB<T extends { id: string }>(storeName: StoreName, item: T): Promise<void> {
  try {
    const db = await initIDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to save item to IndexedDB [${storeName}]:`, error);
  }
}

export async function saveAllIDB<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  try {
    const db = await initIDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // This utility is used to persist a complete collection snapshot. Clear the
      // old snapshot first so deleted or replaced items cannot reappear after a
      // reload (a particularly painful failure mode for an imported journal).
      store.clear();
      items.forEach((item) => {
        store.put(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error(`Failed to save items batch to IndexedDB [${storeName}]:`, error);
  }
}

export async function deleteIDB(storeName: StoreName, id: string): Promise<void> {
  try {
    const db = await initIDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to delete item from IndexedDB [${storeName}]:`, error);
  }
}

export async function clearIDB(storeName: StoreName): Promise<void> {
  try {
    const db = await initIDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to clear IndexedDB store [${storeName}]:`, error);
  }
}
