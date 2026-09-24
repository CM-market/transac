import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "../lib/i18n";
import StoreViewModal from "./StoreViewModal";

// The component reads an auth token from apiAuthService when building its
// request headers. We mock the whole module so the test stays isolated from
// the generated openapi-rq codegen chain.
vi.mock("../services/keyManagement/apiAuthService", () => ({
  apiAuthService: {
    getCurrentToken: vi.fn(() => "test-token"),
  },
}));

const baseStore = {
  id: "store-1",
  name: "TechHub Cameroon",
  description: "Electronics and gadgets",
  location: "Douala, Cameroon",
  contact_whatsapp: "+237 123 456 789",
  is_verified: true,
  rating: 4.5,
  created_at: "2024-01-15T00:00:00.000Z",
};

const originalFetch = global.fetch;

describe("StoreViewModal", () => {
  const onClose = vi.fn();
  const onAddProduct = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/reviews") || url.includes("/reviews")) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ review: { id: "r1" } }),
        });
      }
      if (url.includes("/stores/store-1")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ store: { ...baseStore } }),
        });
      }
      // default: products list
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ products: [] }),
      });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const renderModal = async (store = baseStore) => {
    const result = render(
      <I18nextProvider i18n={i18n}>
        <StoreViewModal
          isOpen
          onClose={onClose}
          store={store}
          onAddProduct={onAddProduct}
        />
      </I18nextProvider>,
    );
    // The component fires product/rating fetches on mount; let them settle so
    // state updates are wrapped in act() and leave no stray act warnings.
    await screen.findByText(store.name);
    return result;
  };

  it("displays a verified badge when the store is verified", async () => {
    await renderModal();
    expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    expect(screen.getByText(/Verified/i)).toBeInTheDocument();
  });

  it("does not display a verified badge for an unverified store", async () => {
    await renderModal({ ...baseStore, is_verified: false });
    expect(screen.queryByTestId("verified-badge")).not.toBeInTheDocument();
  });

  it("shows the aggregate rating", async () => {
    await renderModal();
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("submits a review and confirms submission", async () => {
    await renderModal();

    // Select 5 stars.
    fireEvent.click(screen.getByRole("button", { name: "5 star" }));
    // Type a comment.
    fireEvent.change(screen.getByPlaceholderText(/Share your experience/i), {
      target: { value: "Great store!" },
    });
    // Submit.
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

    await waitFor(() => {
      expect(screen.getByTestId("review-message")).toBeInTheDocument();
    });

    // The fetch call to create the review should have been issued.
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const reviewCall = fetchMock.mock.calls.find((call: unknown[]) =>
      String(call[0]).includes("/reviews"),
    );
    expect(reviewCall).toBeTruthy();
    const [, init] = reviewCall;
    const body = JSON.parse(init.body);
    expect(body.rating).toBe(5);
    expect(body.comment).toBe("Great store!");
  });

  it("requires a rating before submitting", async () => {
    await renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

    await waitFor(() => {
      expect(screen.getByTestId("review-error")).toBeInTheDocument();
    });
  });

  it("returns null when closed", () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <StoreViewModal
          isOpen={false}
          onClose={onClose}
          store={baseStore}
          onAddProduct={onAddProduct}
        />
      </I18nextProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
