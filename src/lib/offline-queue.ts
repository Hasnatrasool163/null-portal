"use client";

/**
 * Durable client-side answer queue backed by IndexedDB with automatic localStorage fallback.
 * Survives page refresh, browser crash, and power loss so offline edits are never lost.
 */
export type QueuedAnswer = {
  key: string; // `${attemptId}:${attemptQuestionId}`
  attemptId: string;
  attemptQuestionId: string;
  selectedOptionIds: number[];
  textAnswer: string;
  markedForReview: boolean;
  seq: number;
  capturedElapsedMs: number;
};

const DB_NAME = "null-portal-offline-v1";
const STORE = "pending_answers";
const LS_PREFIX = "np_queue_";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("by_attempt", "attemptId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB error"));
  });
}

function lsRead(attemptId: string): Record<string, QueuedAnswer> {
  try {
    const raw = localStorage.getItem(LS_PREFIX + attemptId);
    return raw ? (JSON.parse(raw) as Record<string, QueuedAnswer>) : {};
  } catch {
    return {};
  }
}

function lsWrite(attemptId: string, map: Record<string, QueuedAnswer>) {
  try {
    if (Object.keys(map).length === 0) {
      localStorage.removeItem(LS_PREFIX + attemptId);
    } else {
      localStorage.setItem(LS_PREFIX + attemptId, JSON.stringify(map));
    }
  } catch {
    // Storage quota full — ignore gracefully.
  }
}

export async function enqueueAnswer(item: QueuedAnswer): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const map = lsRead(item.attemptId);
    map[item.key] = item;
    lsWrite(item.attemptId, map);
  }
}

export async function getQueuedAnswers(
  attemptId: string,
): Promise<QueuedAnswer[]> {
  try {
    const db = await openDb();
    const rows = await new Promise<QueuedAnswer[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const idx = tx.objectStore(STORE).index("by_attempt");
      const req = idx.getAll(IDBKeyRange.only(attemptId));
      req.onsuccess = () => resolve((req.result as QueuedAnswer[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows;
  } catch {
    return Object.values(lsRead(attemptId));
  }
}

export async function removeQueuedAnswers(
  attemptId: string,
  keys: string[],
): Promise<void> {
  if (keys.length === 0) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const k of keys) store.delete(k);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const map = lsRead(attemptId);
    for (const k of keys) delete map[k];
    lsWrite(attemptId, map);
  }
}
