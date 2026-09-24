import { describe, it, expect, vi, afterEach } from "vitest";
import {
  methodForAction,
  buildMutationRequest,
  mutationSender,
} from "../services/offline/syncRunner";
import type { QueueEntry } from "../services/offline/offlineDb";

function entry(action: QueueEntry["action"], body?: unknown): QueueEntry {
  return {
    action,
    endpoint: "/api/v1/stores/1",
    body,
    createdAt: 1,
    attempts: 0,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("methodForAction", () => {
  it("maps CREATE to POST, UPDATE to PATCH, DELETE to DELETE", () => {
    expect(methodForAction("CREATE")).toBe("POST");
    expect(methodForAction("UPDATE")).toBe("PATCH");
    expect(methodForAction("DELETE")).toBe("DELETE");
  });
});

describe("buildMutationRequest", () => {
  it("serializes a CREATE body as JSON with content-type", () => {
    const init = buildMutationRequest(entry("CREATE", { name: "Shop" }));
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ name: "Shop" }));
  });

  it("attaches the bearer token when an auth provider returns one", () => {
    const init = buildMutationRequest(entry("UPDATE", { name: "x" }), {
      getToken: () => "abc123",
    });
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer abc123",
    );
  });

  it("omits Authorization when there is no token", () => {
    const init = buildMutationRequest(entry("UPDATE", { name: "x" }), {
      getToken: () => null,
    });
    expect(
      (init.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it("DELETE sends no body", () => {
    const init = buildMutationRequest(entry("DELETE"));
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });
});

describe("mutationSender", () => {
  it("replays the mutation via fetch and resolves on 2xx", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const send = mutationSender();
    await expect(send(entry("DELETE", undefined))).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/stores/1");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });

  it("throws on a non-2xx response so the queue retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );
    const send = mutationSender();
    await expect(send(entry("CREATE", { name: "x" }))).rejects.toThrow(
      "Sync failed",
    );
  });
});
