import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Check, CheckCheck, Package, User, X } from "lucide-react";
import { apiAuthService } from "../services/keyManagement/apiAuthService";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  payload: {
    buyer?: { name?: string; phone?: string; device_id?: string };
    product?: {
      name?: string;
      unit_price?: number;
      quantity?: number;
      total?: number;
    };
  };
  is_read: boolean;
  created_at: string;
}

const authHeaders = (): Record<string, string> => {
  const token =
    apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const [listRes, countRes] = await Promise.all([
          fetch("/api/v1/notifications", { headers: authHeaders() }),
          fetch("/api/v1/notifications/unread_count", {
            headers: authHeaders(),
          }),
        ]);
        if (listRes.ok) {
          const data = await listRes.json();
          setNotifications(data.notifications || []);
        }
        if (countRes.ok) {
          const countData = await countRes.json();
          setUnread(countData.count || 0);
        }
        setError(null);
      } catch (err) {
        console.error("Error loading notifications:", err);
        setError(t("notificationsLoadError", "Unable to load notifications."));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    loadNotifications(true);
    // Poll for new notifications every 30 seconds so a just-placed order shows up.
    const interval = setInterval(() => loadNotifications(false), 30_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/v1/notifications/${id}/read`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    await loadNotifications(false);
  };

  const markAllRead = async () => {
    await fetch("/api/v1/notifications/read-all", {
      method: "POST",
      headers: authHeaders(),
    });
    await loadNotifications(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-CM", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-CM", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="notification-bell"
        aria-label={t("notifications", "Notifications")}
        className="relative p-2 min-h-11 min-w-11 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">
              {t("notifications", "Notifications")}
            </h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  data-testid="mark-all-read"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t("markAllRead", "Mark all read")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close", "Close")}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {t("loading", "Loading...")}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {t("noNotifications", "No notifications yet.")}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  data-testid={`notification-item-${n.id}`}
                  className={`px-4 py-3 border-b border-gray-100 ${
                    n.is_read ? "bg-white" : "bg-blue-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span className="font-medium text-gray-900 text-sm truncate">
                          {n.title}
                        </span>
                      </div>
                      {n.payload?.product && (
                        <p className="text-sm text-gray-700 mt-1">
                          {n.payload.product.name} ×{" "}
                          {n.payload.product.quantity} ·{" "}
                          {formatPrice(n.payload.product.total ?? 0)}
                        </p>
                      )}
                      {n.payload?.buyer && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                          <User className="w-3 h-3 shrink-0" />
                          {n.payload.buyer.name || "Buyer"}
                          {n.payload.buyer.phone
                            ? ` · ${n.payload.buyer.phone}`
                            : ""}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        aria-label={t("markRead", "Mark as read")}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            {error && (
              <div className="px-4 py-2 text-center text-xs text-red-600">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
