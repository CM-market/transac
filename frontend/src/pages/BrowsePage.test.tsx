import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "../lib/i18n";
import { BrowsePage } from "./BrowsePage";

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

function searchResponse(
  items: ReturnType<typeof product>[],
  overrides: Partial<{
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> = {},
) {
  return {
    items,
    total: overrides.total ?? items.length,
    page: overrides.page ?? 1,
    page_size: overrides.page_size ?? 12,
    total_pages: overrides.total_pages ?? 1,
  };
}

const allProducts = [
  product("p1", "Organic Rice", 2500, "Food"),
  product("p2", "Solar Panel", 85000, "Electronics"),
  product("p3", "Cement Bag", 4800, "Construction"),
];

// Simple fake that inspects the request URL and returns an appropriate subset,
// mirroring server-side filtering for the fields we test.
function setupFetch(initialItems = allProducts) {
  const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
    const params = new URLSearchParams(String(url).split("?")[1] ?? "");
    const q = params.get("q") ?? "";
    const category = params.get("category") ?? "";
    const minPrice = params.get("min_price");
    const maxPrice = params.get("max_price");
    const location = params.get("location") ?? "";
    const page = Number(params.get("page") ?? 1);
    const pageSize = Number(params.get("page_size") ?? 12);

    const filtered = initialItems.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (category && p.category !== category) return false;
      if (minPrice && p.price < Number(minPrice)) return false;
      if (maxPrice && p.price > Number(maxPrice)) return false;
      if (location && location !== "Douala") return false;
      return true;
    });

    // Paginate.
    const start = (page - 1) * pageSize;
    const slice = filtered.slice(start, start + pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve(
          searchResponse(slice, {
            total: filtered.length,
            page,
            page_size: pageSize,
            total_pages: totalPages,
          }),
        ),
    });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <BrowsePage />
    </I18nextProvider>,
  );
}

const originalFetch = global.fetch;

describe("BrowsePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders products from the catalog on load", async () => {
    renderPage();
    expect(await screen.findByText("Organic Rice")).toBeInTheDocument();
    expect(screen.getByText("Solar Panel")).toBeInTheDocument();
    expect(screen.getByText("Cement Bag")).toBeInTheDocument();
    expect(screen.getByText("3 product(s)")).toBeInTheDocument();
  });

  it("updates results dynamically when a category filter changes", async () => {
    const fetchMock = setupFetch();
    renderPage();
    await screen.findByText("Organic Rice");

    fireEvent.change(screen.getByTestId("filter-category"), {
      target: { value: "Electronics" },
    });
    fireEvent.click(screen.getByTestId("apply-filters"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("category=Electronics"),
        expect.anything(),
      );
    });
    expect(await screen.findByText("Solar Panel")).toBeInTheDocument();
    expect(screen.queryByText("Organic Rice")).toBeNull();
  });

  it("updates results when price filters change", async () => {
    const fetchMock = setupFetch();
    renderPage();
    await screen.findByText("Organic Rice");

    fireEvent.change(screen.getByTestId("filter-min-price"), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByTestId("apply-filters"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("min_price=10000"),
        expect.anything(),
      );
    });
    expect(await screen.findByText("Solar Panel")).toBeInTheDocument();
    expect(screen.queryByText("Organic Rice")).toBeNull();
  });

  it("updates results when a location filter changes", async () => {
    const fetchMock = setupFetch();
    renderPage();
    await screen.findByText("Organic Rice");

    fireEvent.change(screen.getByTestId("filter-location"), {
      target: { value: "Douala" },
    });
    fireEvent.click(screen.getByTestId("apply-filters"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("location=Douala"),
        expect.anything(),
      );
    });
  });

  it("triggers a search when the user types in the search bar", async () => {
    const fetchMock = setupFetch();
    renderPage();
    await screen.findByText("Organic Rice");

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "maize" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("q=maize"),
        expect.anything(),
      );
    });
  });

  it("shows an empty state when no products match", async () => {
    setupFetch([]);
    renderPage();
    expect(
      await screen.findByText("No products match your filters."),
    ).toBeInTheDocument();
  });

  it("navigates to the product detail page when a card is clicked", async () => {
    setupFetch();
    renderPage();
    const card = await screen.findByText("Organic Rice");
    fireEvent.click(card);
    expect(navigate).toHaveBeenCalledWith("/product/p1");
  });

  it("paginates through results when there are multiple pages", async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      product(`p${i}`, `Item ${i}`, 1000 + i, "Food"),
    );
    const fetchMock = setupFetch(many);
    renderPage();

    await screen.findByText("Item 0");
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("next-page"));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
        expect.anything(),
      );
    });
    expect(await screen.findByText("Item 12")).toBeInTheDocument();
  });

  it("resets all filters to clear the current query", async () => {
    const fetchMock = setupFetch();
    renderPage();
    await screen.findByText("Organic Rice");

    fireEvent.change(screen.getByTestId("filter-category"), {
      target: { value: "Electronics" },
    });
    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "panel" },
    });
    fireEvent.click(screen.getByTestId("reset-filters"));

    expect(screen.getByTestId("filter-category")).toHaveValue("");
    expect(screen.getByTestId("search-input")).toHaveValue("");

    await waitFor(() => {
      // After reset, a fetch without category/q constraints is issued.
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      const url = String(lastCall[0]);
      expect(url).not.toContain("category=");
      expect(url).not.toContain("q=");
    });
  });
});
