import { render, screen, fireEvent } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "../lib/i18n";
import { BuyerDashboard } from "./BuyerDashboard";

vi.mock("../services/keyManagement/apiAuthService", () => ({
  apiAuthService: {
    getCurrentToken: vi.fn(() => "test-token"),
  },
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

function product(id: string, name: string, price: number, category: string) {
  return {
    id,
    store_id: "store-1",
    name,
    description: `Description for ${name}`,
    category,
    price,
    quantity_available: 5,
    image_id: null,
    created_at: "2024-01-15T00:00:00.000Z",
  };
}

function store(id: string, name: string, totalProducts = 3) {
  return {
    id,
    name,
    description: `Store ${name}`,
    logo_url: null,
    location: "Douala",
    contact_phone: null,
    contact_email: null,
    contact_whatsapp: null,
    owner_device_id: null,
    is_verified: true,
    rating: 4.5,
    total_products: totalProducts,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  };
}

const allProducts = [
  product("p1", "Organic Rice", 2500, "Food"),
  product("p2", "Solar Panel", 85000, "Electronics"),
  product("p3", "Cement Bag", 4800, "Construction"),
  product("p4", "Bamboo Chair", 12000, "Furniture"),
];

const allStores = [store("s1", "Douala Traders"), store("s2", "Yaounde Goods")];

// Fake that routes the dashboard's two requests to the right fixtures.
function setupFetch(options?: {
  products?: ReturnType<typeof product>[];
  stores?: ReturnType<typeof store>[];
}) {
  const products = options?.products ?? allProducts;
  const stores = options?.stores ?? allStores;

  const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
    const path = String(url).split("?")[0];
    if (path.endsWith("/api/v1/stores")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ stores }),
      });
    }
    if (path.endsWith("/api/v1/products/search")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: products,
            total: products.length,
            page: 1,
            page_size: 100,
            total_pages: 1,
          }),
      });
    }
    return Promise.resolve({ ok: false, status: 404, json: () => {} });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderDashboard() {
  return render(
    <I18nextProvider i18n={i18n}>
      <BuyerDashboard />
    </I18nextProvider>,
  );
}

const originalFetch = global.fetch;

describe("BuyerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders stores and products on load", async () => {
    renderDashboard();
    // Stores appear.
    expect(await screen.findByText("Douala Traders")).toBeInTheDocument();
    expect(screen.getByText("Yaounde Goods")).toBeInTheDocument();
    // Products appear.
    expect(screen.getByText("Organic Rice")).toBeInTheDocument();
    expect(screen.getByText("Solar Panel")).toBeInTheDocument();
    expect(screen.getByText("Cement Bag")).toBeInTheDocument();
    // Featured categories appear (as clickable chips).
    expect(screen.getByTestId("category-Food")).toBeInTheDocument();
    expect(screen.getByTestId("category-Electronics")).toBeInTheDocument();
  });

  it("filters products when a category chip is clicked", async () => {
    const fetchMock = setupFetch();
    renderDashboard();
    await screen.findByText("Organic Rice");

    fireEvent.click(screen.getByTestId("category-Electronics"));

    expect(screen.getByText("Solar Panel")).toBeInTheDocument();
    expect(screen.queryByText("Organic Rice")).toBeNull();
    expect(screen.queryByText("Cement Bag")).toBeNull();
    // No extra network request is made for a client-side category filter.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows an empty state when no products match the selected category", async () => {
    setupFetch();
    renderDashboard();
    await screen.findByText("Organic Rice");

    fireEvent.click(screen.getByTestId("category-Automotive"));

    expect(
      await screen.findByText("No products match your filters."),
    ).toBeInTheDocument();
  });

  it("navigates to the product detail page when a card is clicked", async () => {
    setupFetch();
    renderDashboard();
    const card = await screen.findByText("Organic Rice");
    fireEvent.click(card);
    expect(navigate).toHaveBeenCalledWith("/product/p1");
  });

  it("shows a loading state while the dashboard is loading", async () => {
    setupFetch();
    renderDashboard();
    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();
  });
});
