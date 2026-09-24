/**
 * Offline-aware API read layer for the Transac PWA.
 *
 * The app's marketplace screens fetch data with direct `fetch("/api/v1/...")`
 * calls. This module wraps those `GET` reads with an offline fallback powered by
 * the IndexedDB store from `./offlineDb`:
 *
 *  1. While online, every successful `GET` response is written to the offline
 *     cache so it is available later.
 *  2. When offline (or a network request fails), the last-known cached response
 *     is served instead of the request failing.
 *
 * `cachedFetch` is kept dependency-injectable (`fetchFn`, `isOnline`, `now`) so
 * it can be unit-tested without a live network or browser.
 */

import { setApiCache, getApiCache } from "./offlineDb";

/** Default TTL for a cached API response (12 hours). */
export const DEFAULT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/** Result shape returned to callers. */
export interface CachedFetchResult<T> {
  /** Parsed response payload (from network or cache). */
  data: T;
  /** True when the payload was served from the offline cache. */
  fromCache: boolean;
  /** Epoch ms the payload was written (0 when freshly fetched from network). */
  lastUpdated: number;
  /** HTTP status (200 when served from cache). */
  status: number;
  /** True for a 2xx response or a cache hit. */
  ok: boolean;
}

/** Injectable knobs so the function is fully testable. */
export interface CachedFetchOptions {
  /** Override the default stale-while-offline TTL. */
  ttlMs?: number;
  /** Set to false to bypass the cache (fresh reads). Defaults to true. */
  useCache?: boolean;
  /** Inject a wall clock for deterministic expiry tests. */
  now?: number;
  /** Inject a fetch implementation (defaults to `globalThis.fetch`). */
  fetchFn?: typeof fetch;
  /** Inject the online state (defaults to `navigator.onLine`). */
  isOnline?: boolean;
}

/** Thrown when a request fails and no cache entry is available. */
export class CacheMissError extends Error {
  constructor(url: string) {
    super(`Offline: no cached response for ${url}`);
    this.name = "CacheMissError";
  }
}

function detectOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/**
 * Fetch a JSON `GET` resource with an offline fallback.
 *
 * Non-GET methods are passed straight through to the network without caching.
 */
export async function cachedFetch<T>(
  url: string,
  init?: RequestInit,
  options: CachedFetchOptions = {},
): Promise<CachedFetchResult<T>> {
  const {
    ttlMs = DEFAULT_CACHE_TTL_MS,
    useCache = true,
    now,
    fetchFn = typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined,
    isOnline = detectOnline(),
  } = options;

  const method = (init?.method ?? "GET").toUpperCase();
  // Only cache idempotent GET reads; writes go through the mutation queue.
  const cacheable = method === "GET";

  // Offline: serve from the cache without attempting the network.
  if (!isOnline && useCache && cacheable) {
    const hit = await getApiCache<T>(url, { now });
    if (hit) {
      return {
        data: hit.data,
        fromCache: true,
        lastUpdated: hit.cachedAt,
        status: 200,
        ok: true,
      };
    }
    throw new CacheMissError(url);
  }

  if (!fetchFn) {
    throw new Error("No fetch implementation available");
  }

  try {
    const response = await fetchFn(url, init);
    const data = (await response.json()) as T;

    if (response.ok && useCache && cacheable) {
      await setApiCache(url, data, { ttlMs, now });
    }

    return {
      data,
      fromCache: false,
      lastUpdated: 0,
      status: response.status,
      ok: response.ok,
    };
  } catch (error) {
    // Network failure: fall back to the cache when available.
    if (useCache && cacheable) {
      const hit = await getApiCache<T>(url, { now });
      if (hit) {
        return {
          data: hit.data,
          fromCache: true,
          lastUpdated: hit.cachedAt,
          status: 200,
          ok: true,
        };
      }
    }
    throw error;
  }
}

/** Alias for callers that prefer a GET-focused name. */
export { cachedFetch as offlineGet };
