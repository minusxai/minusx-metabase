// src/utils/indexedDB.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface DB extends DBSchema {
  cache: {
    key: string;
    value: {
      data: any;
      createdAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<DB>> | null = null;

const getDB = async (): Promise<IDBPDatabase<DB>> => {
  if (!dbPromise) {
    dbPromise = openDB<DB>('minusx-cache-db', 1, {
      upgrade(db) {
        db.createObjectStore('cache');
      },
    });
  }
  
  try {
    return await dbPromise;
  } catch (error: any) {
    // Connection failed, reset and retry once
    dbPromise = null;
    dbPromise = openDB<DB>('minusx-cache-db', 1, {
      upgrade(db) {
        db.createObjectStore('cache');
      },
    });
    return await dbPromise;
  }
};

export const setCache = async (key: string, value: any) => {
  try {
    const db = await getDB();
    await db.put('cache', { data: value, createdAt: Date.now() }, key);
  } catch (error) {
    // Silently fail - cache write is not critical
  }
};

export const getCache = async (key: string) => {
  try {
    const db = await getDB();
    const cachedItem = await db.get('cache', key);
    if (cachedItem) {
      return cachedItem;
    }
    return null;
  } catch (error) {
    // Treat any DB error as cache miss
    return null;
  }
};

export const deleteCache = async (key: string) => {
  try {
    const db = await getDB();
    await db.delete('cache', key);
  } catch (error) {
    // Silently fail - cache delete is not critical
  }
};

export const resetCache = async () => {
  try {
    const db = await getDB();
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').clear();
    await tx.done;
  } catch (error) {
    // Silently fail - cache reset is not critical
  }
};
