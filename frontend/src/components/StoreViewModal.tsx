import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Store,
  MapPin,
  MessageCircle,
  Plus,
  Package,
  Star,
  Calendar,
  BadgeCheck,
  Send,
} from "lucide-react";
import { apiAuthService } from "../services/keyManagement/apiAuthService";

interface StoreLite {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  location?: string;
  contact_whatsapp?: string;
  is_verified?: boolean;
  rating?: number;
  created_at: string;
}

interface ProductLite {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity_available: number;
  created_at: string;
}

interface StoreViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreLite | null;
  onAddProduct: (storeId: string) => void;
}

const authHeaders = (): Record<string, string> => {
  const token =
    apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const StoreViewModal: React.FC<StoreViewModalProps> = ({
  isOpen,
  onClose,
  store,
  onAddProduct,
}) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentRating, setCurrentRating] = useState<number | undefined>(
    store?.rating,
  );
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string>("");
  const [reviewMessage, setReviewMessage] = useState<string>("");

  useEffect(() => {
    if (store) {
      setCurrentRating(store.rating);
      setReviewError("");
      setReviewMessage("");
    }
  }, [store]);

  const fetchStoreProducts = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/products?store_id=${store.id}`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setProducts((data.products || data || []) as ProductLite[]);
      }
    } catch (error) {
      console.error("Error fetching store products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [store]);

  // Refetch the store to get the latest aggregated rating.
  const fetchStoreRating = useCallback(async () => {
    if (!store) return;
    try {
      const response = await fetch(`/api/v1/stores/${store.id}`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const latest = data?.store as StoreLite | undefined;
        if (latest && typeof latest.rating === "number") {
          setCurrentRating(latest.rating);
        }
      }
    } catch (error) {
      console.error("Error fetching store rating:", error);
    }
  }, [store]);

  useEffect(() => {
    if (store && isOpen) {
      fetchStoreProducts();
      fetchStoreRating();
    }
  }, [store, isOpen, fetchStoreProducts, fetchStoreRating]);

  const submitReview = async () => {
    if (!store) return;
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError(t("reviewRatingError", "Please select a rating (1-5)."));
      return;
    }
    setSubmittingReview(true);
    setReviewError("");
    setReviewMessage("");
    try {
      const response = await fetch(`/api/v1/stores/${store.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      if (response.ok) {
        setReviewMessage(
          t("reviewSubmitted", "Thanks! Your review has been submitted."),
        );
        setReviewComment("");
        setReviewRating(0);
        // Refresh the aggregate rating shown to the buyer.
        await fetchStoreRating();
      } else {
        const text = await response.text();
        setReviewError(
          text ||
            t("reviewFailed", "Unable to submit review. Please try again."),
        );
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      setReviewError(
        t("reviewFailed", "Unable to submit review. Please try again."),
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-CM");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-CM", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!isOpen || !store) return null;

  const showRating = typeof currentRating === "number";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-4xl w-full max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Store className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {store.name}
                </h2>
                {store.is_verified && (
                  <span
                    data-testid="verified-badge"
                    className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span>{t("verified", "Verified")}</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{store.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-11 min-w-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Store Information */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location */}
            {store.location && (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{store.location}</span>
              </div>
            )}

            {/* WhatsApp */}
            {store.contact_whatsapp && (
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {store.contact_whatsapp}
                </span>
              </div>
            )}

            {/* Rating */}
            {showRating && (
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">{currentRating}</span>
              </div>
            )}

            {/* Created Date */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {t("created", "Created")} {formatDate(store.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Review Submission */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            {t("rateStore", "Rate this store")}
          </h3>
          <div className="flex items-center space-x-1 mb-3">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} star`}
                onClick={() => setReviewRating(value)}
                className="p-1"
              >
                <Star
                  className={`w-6 h-6 ${
                    value <= reviewRating
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder={t(
              "reviewPlaceholder",
              "Share your experience (optional)",
            )}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          {reviewError && (
            <p className="text-sm text-red-600 mb-2" data-testid="review-error">
              {reviewError}
            </p>
          )}
          {reviewMessage && (
            <p
              className="text-sm text-emerald-600 mb-2"
              data-testid="review-message"
            >
              {reviewMessage}
            </p>
          )}
          <button
            onClick={submitReview}
            disabled={submittingReview}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>
              {submittingReview
                ? t("submitting", "Submitting...")
                : t("submitReview", "Submit Review")}
            </span>
          </button>
        </div>

        {/* Products Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h3 className="text-lg font-medium text-gray-900">
              {t("products", "Products")} ({products.length})
            </h3>
            <button
              onClick={() => onAddProduct(store.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t("addProduct", "Add Product")}</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">
                {t("loadingProducts", "Loading products...")}
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {t("noProducts", "No products yet")}
              </h4>
              <p className="text-gray-600 mb-4">
                {t("noProductsDesc", "Start adding products to your store")}
              </p>
              <button
                onClick={() => onAddProduct(store.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {t("addFirstProduct", "Add Your First Product")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {product.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {product.quantity_available > 0
                        ? `${product.quantity_available} in stock`
                        : "Out of stock"}
                    </span>
                    <span>{formatDate(product.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreViewModal;
