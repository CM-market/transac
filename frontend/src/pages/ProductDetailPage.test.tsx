import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "../lib/i18n";
import { ProductDetailPage } from "./ProductDetailPage";
import { useCart } from "../contexts/CartContext";

vi.mock("../services/keyManagement/apiAuthService", () => ({
  apiAuthService: {
    getCurrentToken: vi.fn(() => "test-token"),
  },
}));

vi.mock("../contexts/CartContext", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../contexts/CartContext")>();
  return {
    ...actual,
    useCart: vi.fn(),
  };
});

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: "prod-1" })),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

const baseProduct = {
  id: "prod-1",
  store_id: "store-1",
  name: "Premium Widget",
  description: "A high-quality widget for your business.",
  price: 5000,
  quantity_available: 10,
  image_id: null,
  created_at: "2024-01-15T00:00:00.000Z",
};

const baseStore = {
  id: "store-1",
  name: "TechHub Cameroon",
  description: "Electronics and gadgets",
  location: "Douala, Cameroon",
  contact_whatsapp: "+237 123 456 789",
  is_verified: true,
  rating: 4.5,
};

const originalFetch = global.fetch;

function setupFetch({
  product = baseProduct,
  store = baseStore,
}: { product?: object | null; store?: object | null } = {}) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/stores/")) {
      if (store === null) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ store }),
      });
    }
    if (url.includes("/products/")) {
      if (product === null) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(product),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });
  });
}

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ProductDetailPage />
    </I18nextProvider>,
  );
}

describe("ProductDetailPage", () => {
  const addItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCart as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      items: [],
      addItem,
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clear: vi.fn(),
      totalCount: 0,
      totalPrice: 0,
    });
    setupFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows product name, description, price, quantity, and seller info", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: /premium widget/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/high-quality widget/i)).toBeInTheDocument();

    // Price formatted in XAF with fr-CM locale.
    expect(
      screen.getByText(/5[\s\u00a0\u202f]?000|5\.000/),
    ).toBeInTheDocument();

    expect(screen.getByTestId("product-quantity")).toHaveTextContent(
      "10 in stock",
    );

    // Seller info loads asynchronously via a second request — wait for it.
    await waitFor(() =>
      expect(screen.getByTestId("seller-name")).toHaveTextContent(
        "TechHub Cameroon",
      ),
    );
    expect(screen.getByTestId("seller-verified")).toBeInTheDocument();
    expect(screen.getByTestId("seller-rating")).toHaveTextContent("4.5");
    expect(screen.getByText("Douala, Cameroon")).toBeInTheDocument();
  });

  it("renders a WhatsApp link built from the seller contact", async () => {
    renderPage();
    const link = await waitFor(() => screen.getByTestId("whatsapp-link"));
    expect(link).toHaveAttribute("href", "https://wa.me/237123456789");
  });

  it("adds the product to the cart when Add to Cart is clicked", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /premium widget/i });

    fireEvent.click(screen.getByTestId("add-to-cart"));

    expect(addItem).toHaveBeenCalledTimes(1);
    expect(addItem).toHaveBeenCalledWith(
      {
        productId: "prod-1",
        storeId: "store-1",
        name: "Premium Widget",
        price: 5000,
      },
      1,
    );
    expect(screen.getByText("Added to cart!")).toBeInTheDocument();
  });

  it("adds the selected quantity to the cart", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /premium widget/i });

    const qty = screen.getByTestId("add-qty");
    fireEvent.change(qty, { target: { value: "3" } });
    fireEvent.click(screen.getByTestId("add-to-cart"));

    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "prod-1" }),
      3,
    );
  });

  it("shows a not found state for an unknown product", async () => {
    setupFetch({ product: null });
    renderPage();
    expect(await screen.findByText(/product not found/i)).toBeInTheDocument();
  });

  it("still renders product info when seller info fails to load", async () => {
    setupFetch({ store: null });
    renderPage();
    expect(
      await screen.findByRole("heading", { name: /premium widget/i }),
    ).toBeInTheDocument();
    // No WhatsApp link since no seller contact was loaded.
    expect(screen.queryByTestId("whatsapp-link")).toBeNull();
  });
});
