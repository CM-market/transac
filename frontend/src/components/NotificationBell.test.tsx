import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "../lib/i18n";
import NotificationBell from "./NotificationBell";

vi.mock("../services/keyManagement/apiAuthService", () => ({
  apiAuthService: {
    getCurrentToken: vi.fn(() => "test-token"),
  },
}));

const notification = {
  id: "notif-1",
  title: "New order",
  message: "Alice ordered 2 x Widgets.",
  payload: {
    buyer: { name: "Alice Buyer", phone: "+237612345678" },
    product: { name: "Widget", unit_price: 1000, quantity: 2, total: 2000 },
  },
  is_read: false,
  created_at: "2025-01-15T10:00:00.000Z",
};

const originalFetch = global.fetch;

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        const method = (init?.method || "GET").toUpperCase();
        if (url.includes("/unread_count")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ count: 1 }),
          });
        }
        if (url.includes("/read-all") && method === "POST") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ updated: 1 }),
          });
        }
        if (url.includes("/read") && method === "PATCH") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ updated: true }),
          });
        }
        // default: notifications list
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ notifications: [notification] }),
        });
      });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const renderBell = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <NotificationBell />
      </I18nextProvider>,
    );

  it("shows the unread badge and lists notifications with buyer + product details", async () => {
    renderBell();
    // Unread badge should appear.
    await waitFor(() => {
      expect(screen.getByTestId("notification-unread-badge")).toHaveTextContent(
        "1",
      );
    });

    // Open the panel.
    fireEvent.click(screen.getByTestId("notification-bell"));
    await screen.findByTestId("notification-panel");

    // Buyer + product details are shown.
    expect(screen.getByText("Alice Buyer")).toBeInTheDocument();
    expect(screen.getByText("+237612345678")).toBeInTheDocument();
    expect(screen.getByText(/Widget/i)).toBeInTheDocument();
  });

  it("marks a notification as read", async () => {
    renderBell();
    await waitFor(() => {
      expect(
        screen.getByTestId("notification-unread-badge"),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("notification-bell"));
    const item = await screen.findByTestId("notification-panel");

    const markButtons = item.querySelectorAll(
      'button[aria-label="Mark as read"]',
    );
    fireEvent.click(markButtons[0]);

    // A PATCH to mark read should be issued.
    await waitFor(() => {
      const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
      const patchCall = fetchMock.mock.calls.find(
        (call: unknown[]) => String(call[1]?.method).toUpperCase() === "PATCH",
      );
      expect(patchCall).toBeTruthy();
    });
  });

  it("shows an empty state when there are no notifications", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/unread_count")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ notifications: [] }),
      });
    });
    renderBell();
    fireEvent.click(screen.getByTestId("notification-bell"));
    await screen.findByTestId("notification-panel");
    expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
  });
});
