/**
 * Offline storage layer for the Transac PWA.
 *
 * A thin, typed IndexedDB wrapper (built on `idb`) that persists three kinds of
 * data so the app can keep working when the network drops:
 *
 *  - `api`:    cached GET responses keyed by normalized URL, with a freshness
 *              timestamp and per-entry TTL so stale reads can be detected.
 *  - `images`: cached image blobs keyed by URL so previously viewed images keep
 *              rendering offline.
 *  - `queue`:  offline mutation queue entries (create/update/delete) that are
 *              flushed to the server once connectivity returns.
 *
 * The pure helpers (`normalizeKey`, `isExpired`, `isQueuedMutation`) are kept
 * side-effect free so they can be unit-tested without a browser database.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/** An `api` store record. */
export interface ApiCacheEntry<T = unknown> {
  /** Normalized request URL used as the store key. */
  url: string;
  /** The cached response payload. */
  data: T;
  /** Epoch milliseconds when the entry was written. */
  cachedAt: number;
  /** Epoch milliseconds this cache entry remains valid for. */
  expiresAt: number;
}

/** An `images` store record (raw bytes stored; `Blob` reconstructed on read). */
export interface ImageCacheEntry {
  /** Image URL used as the store key. */
  url: string;
  /** The cached image blob (reconstructed from stored bytes). */
  blob: Blob;
  /** Epoch milliseconds when the entry was written. */
  cachedAt: number;
  /** Epoch milliseconds this cache entry remains valid for. */
  expiresAt: number;
}

/** Raw image record persisted in IndexedDB (Blobs are not reliably cloneable). */
interface StoredImage {
  url: string;
  data: ArrayBuffer;
  mimeType: string;
  cachedAt: number;
  expiresAt: number;
}

/** Supported offline write actions. */
export type QueueAction = "CREATE" | "UPDATE" | "DELETE";

/** An offline mutation queue record. */
export interface QueueEntry {
  /** Auto-incrementing record id (assigned by IndexedDB). */
  id?: number;
  /** The mutation to replay once back online. */
  action: QueueAction;
  /** The API endpoint the mutation targets. */
  endpoint: string;
  /** The request body for the mutation (omitted for DELETE). */
  body?: unknown;
  /** Epoch milliseconds when the entry was queued. */
  createdAt: number;
  /** Number of failed flush attempts so far (for retry limiting). */
  attempts: number;
}

interface OfflineSchema extends DBSchema {
  api: {
    key: string;
    value: ApiCacheEntry;
  };
  images: {
    key: string;
    value: StoredImage;
  };
  queue: {
    key: number;
    value: QueueEntry;
  };
}

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

export const OFFLINE_DB_NAME = "transac-offline";
export const OFFLINE_DB_VERSION = 1;

/** Default TTL for generic API responses (12 hours). */
export const DEFAULT_API_TTL_MS = 12 * 60 * 60 * 1000;
/** Default TTL for cached images (30 days). */
export const DEFAULT_IMAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Pure helpers (unit-testable without IndexedDB)                             */
/* -------------------------------------------------------------------------- */

/**
 * Normalize a request URL into a stable cache key. Query strings are preserved
 * because different query parameters legitimately produce different payloads
 * (e.g. pagination), but the trailing forward slash is stripped so
 * `/api/stores/` and `/api/stores` collide.
 */
export function normalizeKey(url: string): string {
  return url.replace(/\/+$/, "");
}

/** True when `expiresAt` is in the past relative to `now`. */
export function isExpired(
  expiresAt: number,
  now: number = Date.now(),
): boolean {
  return expiresAt <= now;
}

/** True when the entry is an idempotent mutation that must be replayed. */
export function isQueuedMutation(entry: QueueEntry): boolean {
  return (
    entry.action === "CREATE" ||
    entry.action === "UPDATE" ||
    entry.action === "DELETE"
  );
}

/* -------------------------------------------------------------------------- */
/* Database bootstrap                                                         */
/* -------------------------------------------------------------------------- */

let dbPromise: Promise<IDBPDatabase<OfflineSchema>> | null = null;

/** Open (once) and return the shared offline IndexedDB handle. */
export function getOfflineDb(): Promise<IDBPDatabase<OfflineSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineSchema>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("api")) {
          db.createObjectStore("api", { keyPath: "url" });
        }
        if (!db.objectStoreNames.contains("images")) {
          db.createObjectStore("images", { keyPath: "url" });
        }
        if (!db.objectStoreNames.contains("queue")) {
          db.createObjectStore("queue", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    });
  }
  return dbPromise;
}

/** Close the shared handle and clear the cached promise (used in tests). */
export async function closeOfflineDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

/** Delete the whole offline database (used for resets/testing). */
export async function deleteOfflineDb(): Promise<void> {
  await closeOfflineDb();
  if (typeof indexedDB !== "undefined") {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(OFFLINE_DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  }
}

/* -------------------------------------------------------------------------- */
/* API response cache                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Persist a GET response in the `api` store.
 *
 * Only `GET` responses are expected here — callers must not cache unsafe
 * methods. Callers are responsible for choosing an appropriate TTL.
 */
export async function setApiCache<T>(
  url: string,
  data: T,
  options: { ttlMs?: number; now?: number } = {},
): Promise<void> {
  const db = await getOfflineDb();
  const now = options.now ?? Date.now();
  const ttl = options.ttlMs ?? DEFAULT_API_TTL_MS;
  await db.put("api", {
    url: normalizeKey(url),
    data,
    cachedAt: now,
    expiresAt: now + ttl,
  } as ApiCacheEntry);
}

/** Read a cached API response, or `null` when absent or expired. */
export async function getApiCache<T>(
  url: string,
  options: { now?: number } = {},
): Promise<ApiCacheEntry<T> | null> {
  const db = await getOfflineDb();
  const key = normalizeKey(url);
  const entry = await db.get("api", key);
  if (!entry) {
    return null;
  }
  if (isExpired(entry.expiresAt, options.now)) {
    // Lazily drop the stale entry to avoid unbounded growth.
    void db.delete("api", key);
    return null;
  }
  return entry as unknown as ApiCacheEntry<T>;
}

/** Remove a specific cached API response. */
export async function deleteApiCache(url: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete("api", normalizeKey(url));
}

/** Remove all cached API responses. */
export async function clearApiCache(): Promise<void> {
  const db = await getOfflineDb();
  await db.clear("api");
}

/** List every non-expired cached API response. */
export async function listApiCache(
  options: { now?: number } = {},
): Promise<ApiCacheEntry[]> {
  const db = await getOfflineDb();
  const all = await db.getAll("api");
  const now = options.now ?? Date.now();
  return all.filter(
    (entry) => !isExpired(entry.expiresAt, now),
  ) as ApiCacheEntry[];
}

/* -------------------------------------------------------------------------- */
/* Image cache                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Convert a Blob to an ArrayBuffer in a way that works across browsers, Node
 * and jsdom (jsdom's Blob lacks `arrayBuffer()`; the Fetch `Response` path also
 * misbehaves there), so we fall back to a FileReader when the fast path is
 * unavailable.
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsArrayBuffer(blob);
  });
}

/** Persist an image blob in the `images` store. Bytes are stored so Blobs survive.
 *
 * @returns the byte length stored (for callers that log cache size). */
export async function setImageCache(
  url: string,
  blob: Blob,
  options: { ttlMs?: number; now?: number } = {},
): Promise<number> {
  const db = await getOfflineDb();
  const now = options.now ?? Date.now();
  const ttl = options.ttlMs ?? DEFAULT_IMAGE_TTL_MS;
  const data = await blobToArrayBuffer(blob);
  await db.put("images", {
    url: normalizeKey(url),
    data,
    mimeType: blob.type || "application/octet-stream",
    cachedAt: now,
    expiresAt: now + ttl,
  } as StoredImage);
  return data.byteLength;
}

/** Read a cached image entry, or `null` when absent or expired. */
export async function getImageCache(
  url: string,
  options: { now?: number } = {},
): Promise<ImageCacheEntry | null> {
  const db = await getOfflineDb();
  const key = normalizeKey(url);
  const record = await db.get("images", key);
  if (!record) {
    return null;
  }
  if (isExpired(record.expiresAt, options.now)) {
    void db.delete("images", key);
    return null;
  }
  return {
    url: record.url,
    blob: new Blob([record.data], { type: record.mimeType }),
    cachedAt: record.cachedAt,
    expiresAt: record.expiresAt,
  };
}

/** Remove a specific cached image. */
export async function deleteImageCache(url: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete("images", normalizeKey(url));
}

/** Remove all cached images. */
export async function clearImageCache(): Promise<void> {
  const db = await getOfflineDb();
  await db.clear("images");
}

/* -------------------------------------------------------------------------- */
/* Offline mutation queue                                                     */
/* -------------------------------------------------------------------------- */

/** Enqueue an offline mutation to replay once back online. */
export async function enqueueMutation(
  entry: Omit<QueueEntry, "id" | "createdAt" | "attempts">,
): Promise<number> {
  const db = await getOfflineDb();
  const record: QueueEntry = {
    ...entry,
    createdAt: Date.now(),
    attempts: 0,
  };
  return db.add("queue", record);
}

/** Return every queued mutation in insertion order. */
export async function listMutations(): Promise<QueueEntry[]> {
  const db = await getOfflineDb();
  return db.getAll("queue");
}

/** Remove a queued mutation by id (after a successful flush). */
export async function removeMutation(id: number): Promise<void> {
  const db = await getOfflineDb();
  await db.delete("queue", id);
}

/** Increment the retry counter of a mutation and update its body. */
export async function updateMutation(
  id: number,
  patch: Partial<QueueEntry>,
): Promise<void> {
  const db = await getOfflineDb();
  const existing = await db.get("queue", id);
  if (existing) {
    await db.put("queue", { ...existing, ...patch });
  }
}

/** True when there are queued mutations waiting to be flushed. */
export async function hasPendingMutations(): Promise<boolean> {
  const db = await getOfflineDb();
  const count = await db.count("queue");
  return count > 0;
}

/** Remove all queued mutations. */
export async function clearMutations(): Promise<void> {
  const db = await getOfflineDb();
  await db.clear("queue");
}
