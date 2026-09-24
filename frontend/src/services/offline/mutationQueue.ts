/**
 * Offline mutation queue for the Transac PWA.
 *
 * Seller actions that cannot reach the server (create/update store, add
 * product, delete, ...) are queued in the `queue` IndexedDB store instead of
 * failing silently. When the connection returns the queue is replayed in
 * insertion order against a caller-supplied network sender.
 *
 * Design notes:
 *  - `queueOnlineAction`/`queueOfflineAction` both enqueue a mutation; callers
 *    choose which path to take based on connectivity, but the only "smart"
 *    difference is that online actions are sent immediately while offline
 *    actions are deferred. `queueForSync` is the single entry point below.
 *  - A "latest intent" dedupe collapses earlier queued mutations for the same
 *    endpoint so a user editing a store repeatedly while offline only pays the
 *    final write back.
 *  - `flushQueue` replays with a retry budget; entries exceeding the budget are
 *    dropped rather than poisoning the queue forever.
 */

import {
  enqueueMutation,
  removeMutation,
  updateMutation,
  listMutations,
  type QueueEntry,
} from "./offlineDb";

export type { QueueAction } from "./offlineDb";
export type { QueueEntry } from "./offlineDb";

/** The function the app supplies to perform one queued mutation against the API. */
export type MutationSender = (entry: QueueEntry) => Promise<void>;

/** Number of mutations still in the queue after a flush. */
export interface FlushResult {
  flushed: number;
  failed: number;
  /** Mutations still in the queue after the flush (successful ones removed, over-budget dropped). */
  remaining: number;
}

/** Default number of attempts before a queued mutation is dropped. */
export const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Queue a mutation for later sync.
 *
 * Dedupe policy (latest intent wins):
 *  - `UPDATE`: any prior CREATE/UPDATE for the same endpoint is removed and
 *    replaced by this new body (the user's final edit supersedes earlier ones).
 *  - `DELETE`: every earlier mutation for the same endpoint is removed, since a
 *    delete makes the create/update meaningless.
 *  - `CREATE`: appended normally.
 *
 * @returns the id of the queued entry.
 */
export async function queueForSync(
  action: "CREATE" | "UPDATE" | "DELETE",
  endpoint: string,
  body?: unknown,
): Promise<number> {
  if (action === "UPDATE" || action === "DELETE") {
    // Keep only the latest intent for this endpoint.
    const prior = await listMutations();
    for (const entry of prior) {
      if (entry.endpoint === endpoint && entry.id !== undefined) {
        await removeMutation(entry.id);
      }
    }
  }
  return enqueueMutation({ action, endpoint, body });
}

/**
 * Replay every queued mutation in insertion order.
 *
 * Each replay uses the caller's `sender` to hit the network. Mutations that
 * succeed are removed; mutations that throw are kept and their `attempts`
 * counter is incremented. Entries that reach `maxAttempts` attempts are dropped
 * to avoid a permanently poisoned queue.
 */
export async function flushQueue(
  sender: MutationSender,
  options: { maxAttempts?: number } = {},
): Promise<FlushResult> {
  const { maxAttempts = DEFAULT_MAX_ATTEMPTS } = options;
  const queue = await listMutations();
  let flushed = 0;
  let failed = 0;

  for (const entry of queue) {
    if (entry.id === undefined) {
      continue;
    }
    if (entry.attempts >= maxAttempts) {
      await removeMutation(entry.id);
      continue;
    }
    try {
      await sender(entry);
      await removeMutation(entry.id);
      flushed += 1;
    } catch {
      await updateMutation(entry.id, { attempts: entry.attempts + 1 });
      failed += 1;
    }
  }

  const remaining = (await listMutations()).length;
  return { flushed, failed, remaining };
}
