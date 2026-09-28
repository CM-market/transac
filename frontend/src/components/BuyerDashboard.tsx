import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Search, Store, TrendingUp, Grid3x3 } from "lucide-react";
import { apiAuthService } from "../services/keyManagement/apiAuthService";

interface ProductSummary {
  id: string;
  store_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price: number;
  quantity_available: number;
  image_id?: string | null;
  created_at: string;
}

interface StoreSummary {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  location?: string | null;
  is_verified: boolean;
  rating?: number | null;
  total_products: number;
}

interface SearchResponse {
  items: ProductSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface StoresResponse {
  stores: StoreSummary[];
}

/** Product categories surfaced as clickable featured chips. */
const CATEGORIES = [
  "Food",
  "Electronics",
  "Construction",
  "Fashion",
  "Furniture",
  "Automotive",
  "Pharmacy",
  "Other",
];

const authHeaders = (): Record<string, string> => {
  const token =
    apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
  }).format(price);
}

export const BuyerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // All products on the dashboard (filtered client-side by category).
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  // The featured list the buyer is currently filtering by ("" = show all).
  const [activeCategory, setActiveCategory] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced search term; live search box still surfaces below the grid.
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAppliedSearch(searchInput);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load stores and the full product catalog for the dashboard in parallel.
      const [storeRes, productRes] = await Promise.all([
        fetch(`/api/v1/stores`, { headers: authHeaders() }),
        fetch(`/api/v1/products/search?page_size=100`, {
          headers: authHeaders(),
        }),
      ]);

      if (!storeRes.ok || !productRes.ok) {
        throw new Error(
          `Dashboard request failed: stores=${storeRes.status} products=${productRes.status}`,
        );
      }

      const storesData = (await storeRes.json()) as StoresResponse;
      const productsData = (await productRes.json()) as SearchResponse;

      setStores(storesData.stores ?? []);
      setProducts(productsData.items ?? []);
    } catch {
      setError(
        t(
          "dashboardLoadError",
          "Unable to load the dashboard. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Apply the active category chip (client-side filter over the loaded catalog).
  const handleCategoryClick = (category: string) => {
    setActiveCategory((prev) => (prev === category ? "" : category));
  };

  let visibleProducts = products;
  if (activeCategory) {
    visibleProducts = visibleProducts.filter(
      (p) => p.category === activeCategory,
    );
  }
  if (appliedSearch.trim()) {
    const q = appliedSearch.trim().toLowerCase();
    visibleProducts = visibleProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }

  const trendingProducts = [...visibleProducts]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("backButton", "Back")}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("dashboardTitle", "Dashboard")}
          </h1>
          <div className="w-10" />
        </div>

        {error && <div className="text-center text-red-600 py-8">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div
              data-testid="dashboard-loading"
              className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"
            />
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchPlaceholder", "Search products...")}
                data-testid="dashboard-search"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
              />
            </div>

            {/* Featured categories */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Grid3x3 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {t("featuredCategories", "Featured Categories")}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => {
                  const isActive = activeCategory === category;
                  const count = products.filter(
                    (p) => p.category === category,
                  ).length;
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      data-testid={`category-${category}`}
                      aria-pressed={isActive}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border touch-manipulation transition-colors ${
                        isActive
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400"
                      }`}
                    >
                      {category}
                      {count > 0 && (
                        <span
                          className={`ml-1.5 text-xs ${
                            isActive ? "text-emerald-100" : "text-gray-400"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Stores */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Store className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {t("storesTitle", "Stores")}
                </h2>
              </div>
              {stores.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t("noStores", "No stores yet.")}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {stores.map((store) => (
                    <div
                      key={store.id}
                      data-testid="store-card"
                      className="bg-white border border-gray-200 rounded-2xl p-4"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold flex-shrink-0">
                          {store.logo_url ? (
                            <img
                              src={store.logo_url}
                              alt={store.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            store.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {store.name}
                          </h3>
                          {store.location && (
                            <p className="text-xs text-gray-500 truncate">
                              {store.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          {t("productsCount", "{{count}} products", {
                            count: store.total_products,
                          })}
                        </span>
                        {store.is_verified && (
                          <span className="inline-block px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            {t("verified", "Verified")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Trending products */}
            <section className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {t("trendingTitle", "Trending Products")}
                </h2>
                {activeCategory && (
                  <span className="text-sm text-gray-500">
                    · {activeCategory}
                  </span>
                )}
              </div>

              <div className="mb-3 text-sm text-gray-600">
                {t("resultsSummary", "{{total}} product(s)", {
                  total: visibleProducts.length,
                })}
              </div>

              {visibleProducts.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  {t("noResults", "No products match your filters.")}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {trendingProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => navigate(`/product/${product.id}`)}
                      data-testid="product-card"
                      className="text-left bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-shadow touch-manipulation"
                    >
                      <div className="mb-2 inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        {product.category ||
                          t("allCategories", "All categories")}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                          {product.description}
                        </p>
                      )}
                      <div className="font-bold text-emerald-700">
                        {formatPrice(product.price)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
