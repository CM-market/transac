/**
 * Maps queued offline mutations back to real HTTP requests so `flushQueue`
 * can push them to the server once connectivity returns.
 *
 * `buildMutationRequest` is a pure function (and therefore unit-testable); the
 * `mutationSender` factory wires it to the global `fetch`.
 */

import type { QueueEntry } from "./offlineDb";

/** Provides an optional bearer token for authenticated endpoints. */
export interface AuthProvider {
  getToken: () => string | null;
}

/** The HTTP method used for each queue action. */
export function methodForAction(
  action: QueueEntry["action"],
): "POST" | "PATCH" | "DELETE" {
  switch (action) {
    case "CREATE":
      return "POST";
    case "UPDATE":
      return "PATCH";
    case "DELETE":
      return "DELETE";
  }
}

/**
 * Build a `RequestInit` for a queued mutation. DELETE requests carry no body;
 * CREATE/UPDATE requests serialize the queued body as JSON.
 */
export function buildMutationRequest(
  entry: QueueEntry,
  auth?: AuthProvider,
): RequestInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = auth?.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = { method: methodForAction(entry.action), headers };
  if (entry.action !== "DELETE" && entry.body !== undefined) {
    init.body = JSON.stringify(entry.body);
  }
  return init;
}

/**
 * Build a `MutationSender` (the type `flushQueue` expects) that replays a
 * queued mutation against `endpoint` using the real network. Throws when the
 * server responds with a non-2xx status so `flushQueue` can count the failure
 * and retry later.
 */
export function mutationSender(auth?: AuthProvider) {
  return async (entry: QueueEntry): Promise<void> => {
    const response = await fetch(
      entry.endpoint,
      buildMutationRequest(entry, auth),
    );
    if (!response.ok) {
      throw new Error(`Sync failed for ${entry.endpoint}: ${response.status}`);
    }
  };
}
