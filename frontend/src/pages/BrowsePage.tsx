import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
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

interface SearchResponse {
  items: ProductSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Common product categories offered as filter options. */
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

/** Strip empty filter values so the request only carries real constraints. */
function buildQueryParams(filters: {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  location: string;
  page: number;
  pageSize: number;
}): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category.trim()) params.set("category", filters.category.trim());
  if (filters.minPrice.trim()) params.set("min_price", filters.minPrice.trim());
  if (filters.maxPrice.trim()) params.set("max_price", filters.maxPrice.trim());
  if (filters.location.trim()) params.set("location", filters.location.trim());
  params.set("page", String(filters.page));
  params.set("page_size", String(filters.pageSize));
  return params.toString();
}

export const BrowsePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Live filter inputs.
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState("");
  const [page, setPage] = useState(1);

  // Applied filters (debounced) that trigger the fetch.
  const [applied, setApplied] = useState({
    q: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    location: "",
    page: 1,
  });

  const pageSize = 12;

  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search input so results update as the buyer types.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setApplied((prev) => ({ ...prev, q: searchInput, page: 1 }));
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Reset to page 1 when a non-search filter changes.
  useEffect(() => {
    setPage(1);
  }, [category, minPrice, maxPrice, location]);

  useEffect(() => {
    setApplied((prev) => ({
      ...prev,
      category,
      minPrice,
      maxPrice,
      location,
      page,
    }));
  }, [category, minPrice, maxPrice, location, page]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = buildQueryParams({ ...applied, pageSize });
    try {
      const response = await fetch(`/api/v1/products/search?${query}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status}`);
      }
      const data = (await response.json()) as SearchResponse;
      setResult(data);
    } catch {
      setError(
        t("browseLoadError", "Unable to load products. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [applied, t]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults, applied]);

  const applyFilters = () => {
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setLocation("");
    setPage(1);
  };

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.total_pages ?? 0;

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
            {t("browseTitle", "Browse Products")}
          </h1>
          <div className="w-10" />
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder", "Search products...")}
            data-testid="search-input"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
            <SlidersHorizontal className="w-4 h-4" />
            {t("filterTitle", "Filters")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid="filter-category"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t("allCategories", "All categories")}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={t("filterMinPrice", "Min price (FCFA)")}
              data-testid="filter-min-price"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={t("filterMaxPrice", "Max price (FCFA)")}
              data-testid="filter-max-price"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("filterLocation", "Location")}
              data-testid="filter-location"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={applyFilters}
              data-testid="apply-filters"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
            >
              {t("applyFilters", "Apply")}
            </button>
            <button
              onClick={resetFilters}
              data-testid="reset-filters"
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium"
            >
              {t("resetFilters", "Reset")}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="mb-3 text-sm text-gray-600">
          {t("resultsSummary", "{{total}} product(s)", { total })}
        </div>

        {error && <div className="text-center text-red-600 py-8">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div
              data-testid="browse-loading"
              className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"
            />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            {t("noResults", "No products match your filters.")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((product) => (
              <button
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                data-testid="product-card"
                className="text-left bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-shadow"
              >
                <div className="mb-2 inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                  {product.category || t("allCategories", "All categories")}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              data-testid="prev-page"
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {t("previousPage", "Previous")}
            </button>
            <span className="text-sm text-gray-600">
              {t("pageLabel", "Page {{page}} of {{totalPages}}", {
                page,
                totalPages,
              })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              data-testid="next-page"
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {t("nextPage", "Next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowsePage;
