import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

import { cachedFetch, CacheMissError } from "../services/offline/offlineApi";
import { closeOfflineDb, clearApiCache } from "../services/offline/offlineDb";

function installFakeIdb(): void {
  const g = globalThis as unknown as Record<string, unknown>;
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

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(async () => {
  installFakeIdb();
  await clearApiCache();
});

afterEach(async () => {
  await closeOfflineDb();
});

describe("cachedFetch", () => {
  it("fetches from the network and warms the offline cache", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse({ stores: [{ id: "1" }] }));
    const result = await cachedFetch<{ stores: Array<{ id: string }> }>(
      "/api/v1/stores",
      undefined,
      {
        fetchFn,
        isOnline: true,
      },
    );
    expect(result.ok).toBe(true);
    expect(result.fromCache).toBe(false);
    expect(result.data.stores).toEqual([{ id: "1" }]);
    expect(fetchFn).toHaveBeenCalledWith("/api/v1/stores", undefined);
  });

  it("serves the cached payload from the network then again offline", async () => {
    // First call: online, succeeds, warms the cache.
    await cachedFetch("/api/v1/stores", undefined, {
      fetchFn: vi
        .fn()
        .mockResolvedValue(jsonResponse({ stores: [{ id: "1" }] })),
      isOnline: true,
    });
    // Second call: offline, fetch would fail, but the cache is served.
    const offline = await cachedFetch<{ stores: Array<{ id: string }> }>(
      "/api/v1/stores",
      undefined,
      {
        fetchFn: vi.fn().mockRejectedValue(new Error("network down")),
        isOnline: false,
      },
    );
    expect(offline.fromCache).toBe(true);
    expect(offline.ok).toBe(true);
    expect(offline.status).toBe(200);
    expect(offline.lastUpdated).toBeGreaterThan(0);
    expect(offline.data.stores).toEqual([{ id: "1" }]);
  });

  it("falls back to cache when the network call rejects while online", async () => {
    await cachedFetch("/api/v1/stores", undefined, {
      fetchFn: vi
        .fn()
        .mockResolvedValue(jsonResponse({ stores: [{ id: "cache-me" }] })),
      isOnline: true,
    });
    const result = await cachedFetch<{ stores: Array<{ id: string }> }>(
      "/api/v1/stores",
      undefined,
      {
        fetchFn: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
        isOnline: true,
      },
    );
    expect(result.fromCache).toBe(true);
    expect(result.data.stores).toEqual([{ id: "cache-me" }]);
  });

  it("throws CacheMissError when offline with no cached entry", async () => {
    await expect(
      cachedFetch("/api/v1/stores", undefined, {
        fetchFn: vi.fn().mockRejectedValue(new Error("offline")),
        isOnline: false,
      }),
    ).rejects.toBeInstanceOf(CacheMissError);
  });

  it("propagates network errors (not cached) when the cache is empty", async () => {
    const failure = new TypeError("network down");
    await expect(
      cachedFetch("/api/v1/stores", undefined, {
        fetchFn: vi.fn().mockRejectedValue(failure),
        isOnline: true,
      }),
    ).rejects.toBe(failure);
  });

  it("does not cache non-GET requests nor fall back for them", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 201));
    const result = await cachedFetch(
      "/api/v1/stores",
      { method: "POST", body: "{}" },
      { fetchFn, isOnline: true },
    );
    expect(result.ok).toBe(true);
    // The cache must remain empty for a POST, so an offline GET misses.
    await expect(
      cachedFetch("/api/v1/stores", undefined, { fetchFn, isOnline: false }),
    ).rejects.toBeInstanceOf(CacheMissError);
  });

  it("does not serve expired cache entries", async () => {
    const now = 10_000_000;
    await cachedFetch("/api/v1/stores", undefined, {
      fetchFn: vi.fn().mockResolvedValue(jsonResponse({ stores: [] })),
      isOnline: true,
      now,
      ttlMs: 100,
    });
    // Read well past the TTL while offline — the stale entry must be ignored.
    await expect(
      cachedFetch("/api/v1/stores", undefined, {
        fetchFn: vi.fn().mockRejectedValue(new Error("offline")),
        isOnline: false,
        now: now + 1000,
      }),
    ).rejects.toBeInstanceOf(CacheMissError);
  });

  it("reports the cached lastUpdated timestamp", async () => {
    const now = Date.now();
    await cachedFetch("/api/v1/products", undefined, {
      fetchFn: vi.fn().mockResolvedValue(jsonResponse({ products: [] })),
      isOnline: true,
      now,
    });
    const result = await cachedFetch("/api/v1/products", undefined, {
      fetchFn: vi.fn().mockRejectedValue(new Error("offline")),
      isOnline: false,
      now: now + 1000,
    });
    expect(result.fromCache).toBe(true);
    expect(result.lastUpdated).toBe(now);
  });
});
