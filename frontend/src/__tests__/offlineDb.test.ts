import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  IDBFactory,
  IDBKeyRange as FakeIDBKeyRange,
  IDBRequest as FakeIDBRequest,
  IDBDatabase as FakeIDBDatabase,
  IDBTransaction as FakeIDBTransaction,
  IDBOpenDBRequest as FakeIDBOpenDBRequest,
  IDBObjectStore as FakeIDBObjectStore,
  IDBIndex as FakeIDBIndex,
  IDBCursor as FakeIDBCursor,
} from "fake-indexeddb";

import {
  normalizeKey,
  isExpired,
  isQueuedMutation,
  getOfflineDb,
  closeOfflineDb,
  deleteOfflineDb,
  setApiCache,
  getApiCache,
  deleteApiCache,
  clearApiCache,
  listApiCache,
  setImageCache,
  getImageCache,
  deleteImageCache,
  clearImageCache,
  enqueueMutation,
  listMutations,
  removeMutation,
  updateMutation,
  hasPendingMutations,
  clearMutations,
  DEFAULT_API_TTL_MS,
  type ApiCacheEntry,
  type QueueEntry,
} from "../services/offline/offlineDb";

/**
 * fake-indexeddb provides an in-memory IndexedDB that works inside jsdom. The
 * `idb` wrapper reads the `indexedDB`, `IDBKeyRange`, `IDBRequest`, etc.
 * globals at call time, so we install the fake implementations on
 * `globalThis` (which aliases the jsdom window) before opening the offline DB.
 */
function installFakeIdb(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  // A fresh factory per test isolates the in-memory database between tests.
  g.indexedDB = new IDBFactory();
  g.IDBKeyRange = FakeIDBKeyRange;
  g.IDBRequest = FakeIDBRequest;
  g.IDBDatabase = FakeIDBDatabase;
  g.IDBTransaction = FakeIDBTransaction;
  g.IDBOpenDBRequest = FakeIDBOpenDBRequest;
  g.IDBObjectStore = FakeIDBObjectStore;
  g.IDBIndex = FakeIDBIndex;
  g.IDBCursor = FakeIDBCursor;
}

beforeEach(async () => {
  installFakeIdb();
});

afterEach(async () => {
  await closeOfflineDb();
});

describe("offlineDb pure helpers", () => {
  it("normalizeKey strips trailing slashes", () => {
    expect(normalizeKey("/api/stores/")).toBe("/api/stores");
    expect(normalizeKey("/api/stores")).toBe("/api/stores");
    expect(normalizeKey("/api/stores?page=2")).toBe("/api/stores?page=2");
  });

  it("normalizeKey preserves query strings", () => {
    expect(normalizeKey("/api/products?limit=10")).toBe(
      "/api/products?limit=10",
    );
  });

  it("isExpired compares expiresAt against now", () => {
    expect(isExpired(1000, 2000)).toBe(true);
    expect(isExpired(2000, 1000)).toBe(false);
    expect(isExpired(1000, 1000)).toBe(true);
  });

  it("isQueuedMutation accepts every supported action", () => {
    expect(isQueuedMutation({ action: "CREATE" } as QueueEntry)).toBe(true);
    expect(isQueuedMutation({ action: "UPDATE" } as QueueEntry)).toBe(true);
    expect(isQueuedMutation({ action: "DELETE" } as QueueEntry)).toBe(true);
  });
});

describe("offlineDb api cache", () => {
  it("round-trips a cached GET response", async () => {
    await setApiCache("/api/stores", { stores: [{ id: "1" }] });
    const hit = await getApiCache("/api/stores/");
    expect(hit).not.toBeNull();
    expect(hit?.data).toEqual({ stores: [{ id: "1" }] });
  });

  it("returns null for a missing key", async () => {
    await expect(getApiCache("/api/nope")).resolves.toBeNull();
  });

  it("returns null once an entry expires", async () => {
    const now = 10_000_000;
    await setApiCache("/api/stores", { ok: true }, { ttlMs: 100, now });
    const fresh = await getApiCache("/api/stores", { now: now + 50 });
    expect(fresh).not.toBeNull();
    const stale = await getApiCache("/api/stores", { now: now + 101 });
    expect(stale).toBeNull();
  });

  it("deleteApiCache removes a specific entry", async () => {
    await setApiCache("/api/a", { a: 1 });
    await setApiCache("/api/b", { b: 2 });
    await deleteApiCache("/api/a/");
    await expect(getApiCache("/api/a")).resolves.toBeNull();
    await expect(getApiCache("/api/b")).resolves.not.toBeNull();
  });

  it("clearApiCache empties the store", async () => {
    await setApiCache("/api/a", { a: 1 });
    await setApiCache("/api/b", { b: 2 });
    await clearApiCache();
    await expect(listApiCache()).resolves.toHaveLength(0);
  });

  it("listApiCache only returns non-expired entries", async () => {
    const now = 5_000_000;
    await setApiCache("/api/keep", { ok: true }, { ttlMs: 1000, now });
    await setApiCache("/api/drop", { ok: true }, { ttlMs: -1000, now });
    const list = await listApiCache({ now });
    const keys = (list as ApiCacheEntry[]).map((e) => e.url);
    expect(keys).toContain("/api/keep");
    expect(keys).not.toContain("/api/drop");
  });

  it("stores entries with the default TTL", async () => {
    await setApiCache("/api/stores", []);
    const entry = (await getApiCache("/api/stores")) as ApiCacheEntry;
    expect(entry.expiresAt).toBe(entry.cachedAt + DEFAULT_API_TTL_MS);
  });
});

describe("offlineDb image cache", () => {
  it("round-trips a cached image blob", async () => {
    const blob = new Blob(["img-bytes"], { type: "image/png" });
    await setImageCache("/img/logo.png", blob);
    const hit = await getImageCache("/img/logo.png");
    expect(hit).not.toBeNull();
    expect(hit?.blob.size).toBe(blob.size);
    expect(hit?.blob.type).toBe("image/png");
  });

  it("returns null for a missing image", async () => {
    await expect(getImageCache("/img/missing.png")).resolves.toBeNull();
  });

  it("returns null once an image expires", async () => {
    const now = 2_000_000;
    await setImageCache("/img/old.png", new Blob(["x"]), { ttlMs: 50, now });
    await expect(
      getImageCache("/img/old.png", { now: now + 25 }),
    ).resolves.not.toBeNull();
    await expect(
      getImageCache("/img/old.png", { now: now + 51 }),
    ).resolves.toBeNull();
  });

  it("deleteImageCache and clearImageCache work", async () => {
    await setImageCache("/img/a.png", new Blob(["a"]));
    await setImageCache("/img/b.png", new Blob(["b"]));
    await deleteImageCache("/img/a.png/");
    await expect(getImageCache("/img/a.png")).resolves.toBeNull();
    await expect(getImageCache("/img/b.png")).resolves.not.toBeNull();
    await clearImageCache();
    await expect(getImageCache("/img/b.png")).resolves.toBeNull();
  });
});

describe("offlineDb mutation queue", () => {
  it("enqueues mutations in insertion order", async () => {
    await enqueueMutation({
      action: "CREATE",
      endpoint: "/api/stores",
      body: { name: "A" },
    });
    await enqueueMutation({
      action: "UPDATE",
      endpoint: "/api/stores/2",
      body: { name: "B" },
    });
    const queue = await listMutations();
    expect(queue).toHaveLength(2);
    expect(queue[0].action).toBe("CREATE");
    expect(queue[0].body).toEqual({ name: "A" });
    expect(queue[1].action).toBe("UPDATE");
    expect((queue[0].id as number) < (queue[1].id as number)).toBe(true);
  });

  it("removeMutation deletes a single queued entry", async () => {
    const id = await enqueueMutation({
      action: "DELETE",
      endpoint: "/api/stores/3",
    });
    await removeMutation(id);
    await expect(hasPendingMutations()).resolves.toBe(false);
  });

  it("updateMutation sets the retry counter", async () => {
    const id = await enqueueMutation({
      action: "CREATE",
      endpoint: "/api/stores",
    });
    await updateMutation(id, { attempts: 3 });
    const queue = await listMutations();
    expect(queue[0].attempts).toBe(3);
  });

  it("hasPendingMutations reflects the queue state", async () => {
    await expect(hasPendingMutations()).resolves.toBe(false);
    await enqueueMutation({ action: "CREATE", endpoint: "/api/stores" });
    await expect(hasPendingMutations()).resolves.toBe(true);
    await clearMutations();
    await expect(hasPendingMutations()).resolves.toBe(false);
  });

  it("enqueued entries carry timestamps and zero attempts", async () => {
    await enqueueMutation({ action: "DELETE", endpoint: "/api/stores/9" });
    const queue = await listMutations();
    expect(queue[0].createdAt).toBeGreaterThan(0);
    expect(queue[0].attempts).toBe(0);
  });
});

describe("offlineDb schema bootstrap", () => {
  it("exposes a usable database with the expected stores", async () => {
    const db = await getOfflineDb();
    expect(db.objectStoreNames.contains("api")).toBe(true);
    expect(db.objectStoreNames.contains("images")).toBe(true);
    expect(db.objectStoreNames.contains("queue")).toBe(true);
  });

  it("deleteOfflineDb resets the database", async () => {
    await setApiCache("/api/stores", { ok: true });
    await deleteOfflineDb();
    await expect(getApiCache("/api/stores")).resolves.toBeNull();
  });
});
