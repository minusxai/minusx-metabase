// src/utils/indexedDB.ts
import { openDB, DBSchema } from 'idb';

interface DB extends DBSchema {
  cache: {
    key: string;
    value: {
      data: any;
      createdAt: number;
    };
  };
}

const dbPromise = openDB<DB>('minusx-cache-db', 1, {
  upgrade(db) {
    db.createObjectStore('cache');
  },
});

export const setCache = async (key: string, value: any) => {
  const db = await dbPromise;
  await db.put('cache', { data: value, createdAt: Date.now() }, key);
};

export const getCache = async (key: string) => {
  const db = await dbPromise;
  const cachedItem = await db.get('cache', key);
  if (cachedItem) {
    return cachedItem;
  }
  return null;
};

export const deleteCache = async (key: string) => {
  const db = await dbPromise;
  await db.delete('cache', key);
};

export const resetCache = async () => {
  const db = await dbPromise;
  const tx = db.transaction('cache', 'readwrite');
  tx.objectStore('cache').clear();
  await tx.done;
};
