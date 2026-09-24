import React, { useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, Cloud, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { listMutations } from "../services/offline/offlineDb";
import { flushQueue } from "../services/offline/mutationQueue";
import { mutationSender } from "../services/offline/syncRunner";
import { apiAuthService } from "../services/keyManagement/apiAuthService";

type SyncState = "idle" | "syncing" | "synced";

/**
 * Top banner that surfaces offline / queued-sync state and flushes the offline
 * mutation queue the moment connectivity returns.
 *
 * Hidden when everything is clean (online with nothing queued); visible when
 * the app is offline or changes are waiting to sync.
 */
const OfflineStatusBar: React.FC = () => {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [sync, setSync] = useState<SyncState>("idle");
  const wasOnline = useRef(isOnline);

  const refreshCount = useCallback(async () => {
    try {
      setPendingCount((await listMutations()).length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // Keep the pending count fresh whenever connectivity changes.
  useEffect(() => {
    void refreshCount();
  }, [isOnline, refreshCount]);

  // When the app comes back online and there is work queued, flush it.
  useEffect(() => {
    const becameOnline = !wasOnline.current && isOnline;
    wasOnline.current = isOnline;
    if (!becameOnline || pendingCount === 0) {
      return;
    }
    let cancelled = false;
    const runSync = async () => {
      setSync("syncing");
      try {
        await flushQueue(
          mutationSender({ getToken: () => apiAuthService.getCurrentToken() }),
        );
        if (!cancelled) {
          setSync("synced");
          await refreshCount();
        }
      } catch {
        if (!cancelled) {
          await refreshCount();
        }
      } finally {
        if (!cancelled) {
          setSync("idle");
        }
      }
    };
    void runSync();
    return () => {
      cancelled = true;
    };
  }, [isOnline, pendingCount, refreshCount]);

  const hidden = isOnline && pendingCount === 0 && sync !== "syncing";

  if (hidden) {
    return null;
  }

  const OfflineIcon = isOnline ? Cloud : CloudOff;

  return (
    <div
      role="status"
      data-testid="offline-status-bar"
      className={`px-4 py-2 text-center text-sm font-medium text-white flex items-center justify-center gap-2 ${
        isOnline
          ? sync === "syncing"
            ? "bg-blue-600"
            : "bg-amber-600"
          : "bg-red-600"
      }`}
    >
      {sync === "syncing" ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <OfflineIcon className="w-4 h-4" />
      )}
      {!isOnline && (
        <span>You&apos;re offline — changes will sync when you reconnect</span>
      )}
      {isOnline && pendingCount > 0 && sync === "idle" && (
        <span>
          {pendingCount} change{pendingCount === 1 ? "" : "s"} waiting to sync
        </span>
      )}
      {isOnline && sync === "syncing" && <span>Syncing changes…</span>}
      {isOnline && pendingCount === 0 && sync === "synced" && (
        <span>Changes synced</span>
      )}
    </div>
  );
};

export default OfflineStatusBar;
