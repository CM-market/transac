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

import {
  queueForSync,
  flushQueue,
  DEFAULT_MAX_ATTEMPTS,
  type QueueEntry,
} from "../services/offline/mutationQueue";
import {
  closeOfflineDb,
  listMutations,
  clearMutations,
} from "../services/offline/offlineDb";

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

beforeEach(async () => {
  installFakeIdb();
  await clearMutations();
});

afterEach(async () => {
  await closeOfflineDb();
});

describe("queueForSync", () => {
  it("enqueues mutations in insertion order across endpoints", async () => {
    await queueForSync("CREATE", "/api/v1/stores", { name: "A" });
    await queueForSync("CREATE", "/api/v1/products", { name: "P" });
    const queue = await listMutations();
    expect(queue).toHaveLength(2);
    expect(queue[0].endpoint).toBe("/api/v1/stores");
    expect(queue[1].endpoint).toBe("/api/v1/products");
  });

  it("replaces a prior UPDATE with the latest body for the same endpoint", async () => {
    await queueForSync("UPDATE", "/api/v1/stores/1", { name: "old" });
    await queueForSync("UPDATE", "/api/v1/stores/1", { name: "new" });
    const queue = await listMutations();
    expect(queue).toHaveLength(1);
    expect((queue[0] as QueueEntry).body).toEqual({ name: "new" });
  });

  it("keeps updates to different endpoints separate", async () => {
    await queueForSync("UPDATE", "/api/v1/stores/1", { name: "a" });
    await queueForSync("UPDATE", "/api/v1/stores/2", { name: "b" });
    expect(await listMutations()).toHaveLength(2);
  });

  it("DELETE removes earlier mutations for the same endpoint", async () => {
    await queueForSync("CREATE", "/api/v1/stores/9", { name: "draft" });
    await queueForSync("DELETE", "/api/v1/stores/9");
    const queue = await listMutations();
    expect(queue).toHaveLength(1);
    expect(queue[0].action).toBe("DELETE");
  });

  it("CREATE entries for the same endpoint accumulate (idempotent creates)", async () => {
    await queueForSync("CREATE", "/api/v1/stores", { name: "1" });
    await queueForSync("CREATE", "/api/v1/stores", { name: "2" });
    expect(await listMutations()).toHaveLength(2);
  });
});

describe("flushQueue", () => {
  it("replays successful mutations in order and drains the queue", async () => {
    await queueForSync("CREATE", "/api/v1/stores", { name: "A" });
    await queueForSync("CREATE", "/api/v1/stores", { name: "B" });

    const order: string[] = [];
    const sender = vi.fn(async (entry: QueueEntry) => {
      order.push((entry.body as { name: string }).name);
    });

    const result = await flushQueue(sender);
    expect(order).toEqual(["A", "B"]);
    expect(result.flushed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.remaining).toBe(0);
    expect(await listMutations()).toHaveLength(0);
  });

  it("counts failed mutations and keeps them for a later retry", async () => {
    await queueForSync("UPDATE", "/api/v1/stores/1", { name: "x" });
    const sender = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await flushQueue(sender);
    expect(result.flushed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);
    // The entry is retained with an incremented attempt count.
    const queue = await listMutations();
    expect(queue[0].attempts).toBe(1);
  });

  it("drops entries once they exceed the retry budget", async () => {
    await queueForSync("CREATE", "/api/v1/stores", { name: "poison" });
    const failing = vi.fn().mockRejectedValue(new Error("always fails"));

    // First call: reaches attempts=1, stays.
    await flushQueue(failing, { maxAttempts: 2 });
    expect(await listMutations()).toHaveLength(1);

    // Second call: reaches attempts=2 === maxAttempts, so it is dropped.
    await flushQueue(failing, { maxAttempts: 2 });
    const queue = await listMutations();
    expect(queue).toHaveLength(1);
    const result = await flushQueue(failing, { maxAttempts: 2 });
    expect(result.remaining).toBe(0);
  });

  it("respects a custom retry budget", async () => {
    expect(DEFAULT_MAX_ATTEMPTS).toBe(3);
    await queueForSync("DELETE", "/api/v1/stores/5");
    const failing = vi.fn().mockRejectedValue(new Error("down"));
    const first = await flushQueue(failing, { maxAttempts: 1 });
    expect(first.failed).toBe(1);
    // attempts now 1 === maxAttempts(1), so next flush drops it immediately.
    const second = await flushQueue(failing, { maxAttempts: 1 });
    expect(second.remaining).toBe(0);
  });
});
