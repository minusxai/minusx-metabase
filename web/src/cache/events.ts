import { openDB } from 'idb';

const dbPromise = openDB('event-storage', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('events')) {
      db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
    }
  },
});

type Event = {
    type: string;
    payload?: object;
};

export async function saveEvent(event: Event) {
  const db = await dbPromise;
  await db.add('events', { event, timestamp: Date.now() });
}

type Callback = (events: Event[]) => Promise<boolean>;

export async function sendBatch(callback: Callback) {
    const db = await dbPromise;
    const events = await db.getAll('events');
  
    if (events.length === 0) {
      return; // No events to send
    }
  
    const success = await callback(events);
  
    if (success) {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      await Promise.all(events.map(event => store.delete(event.id)));
    }
  }
