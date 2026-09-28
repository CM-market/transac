import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Package,
  ShoppingCart,
  Star,
} from "lucide-react";
import { apiAuthService } from "../services/keyManagement/apiAuthService";
import { useCart } from "../contexts/CartContext";
import LoadingSpinner from "../components/LoadingSpinner";

interface ProductDetail {
  id: string;
  store_id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity_available: number;
  image_id?: string | null;
  created_at: string;
}

interface StoreLite {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  location?: string;
  contact_whatsapp?: string;
  is_verified?: boolean;
  rating?: number;
}

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

/** Build a wa.me redirect URL from a raw WhatsApp contact string. */
function buildWhatsAppUrl(contact: string): string {
  const digits = contact.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export const ProductDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [store, setStore] = useState<StoreLite | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/products/${id}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        setError(
          response.status === 404
            ? t("productNotFound", "Product not found.")
            : t("productLoadError", "Unable to load this product."),
        );
        setProduct(null);
        return;
      }
      const data = (await response.json()) as ProductDetail;
      setProduct(data);
    } catch {
      setError(t("productLoadError", "Unable to load this product."));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const fetchStore = useCallback(async () => {
    if (!product?.store_id) return;
    try {
      const response = await fetch(`/api/v1/stores/${product.store_id}`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const storeData = data?.store as StoreLite | undefined;
        if (storeData) {
          setStore(storeData);
        }
      }
    } catch {
      // Seller info is best-effort; the product detail still renders without it.
      setStore(null);
    }
  }, [product]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (product) {
      fetchStore();
    }
  }, [product, fetchStore]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        productId: product.id,
        storeId: product.store_id,
        name: product.name,
        price: product.price,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <LoadingSpinner message={t("loadingProduct", "Loading product...")} />
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error || t("productNotFound", "Product not found.")}
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium inline-flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("goBack", "Go back")}</span>
          </button>
        </div>
      </div>
    );
  }

  const whatsappUrl = store?.contact_whatsapp
    ? buildWhatsAppUrl(store.contact_whatsapp)
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("goBack", "Go back")}</span>
        </button>

        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-3xl shadow-2xl overflow-hidden max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Product image */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200">
              {product.image_id ? (
                <img
                  src={`/api/images/${product.image_id}`}
                  alt={product.name}
                  className="w-full h-full object-cover min-h-64"
                />
              ) : (
                <div className="h-64 md:h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="p-6 md:p-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {product.name}
              </h1>

              {product.description && (
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {product.description}
                </p>
              )}

              <p className="text-3xl font-bold text-blue-700 mb-2">
                {formatPrice(product.price)}
              </p>
              <p className="text-sm mb-6" data-testid="product-quantity">
                {product.quantity_available > 0
                  ? t("inStock", "{{count}} in stock", {
                      count: product.quantity_available,
                    })
                  : t("outOfStock", "Out of stock")}
              </p>

              {/* Quantity + Add to Cart */}
              <div className="flex items-center gap-3 mb-6">
                <label htmlFor="qty" className="text-sm text-gray-600">
                  {t("quantity", "Quantity")}
                </label>
                <input
                  id="qty"
                  type="number"
                  min={1}
                  max={product.quantity_available}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.max(
                        1,
                        Math.min(
                          product.quantity_available,
                          Number(e.target.value) || 1,
                        ),
                      ),
                    )
                  }
                  data-testid="add-qty"
                  aria-label={t("quantity", "Quantity")}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddToCart}
                  disabled={product.quantity_available <= 0}
                  data-testid="add-to-cart"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>
                    {added
                      ? t("addedToCart", "Added to cart!")
                      : t("addToCart", "Add to Cart")}
                  </span>
                </button>
              </div>

              {/* Seller info */}
              <div className="border-t border-gray-200 pt-4">
                <h2 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                  <span>{t("sellerInfo", "Seller")}</span>
                  {store?.is_verified && (
                    <span
                      data-testid="seller-verified"
                      className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full"
                    >
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span>{t("verified", "Verified")}</span>
                    </span>
                  )}
                </h2>
                <p
                  className="text-gray-800 font-medium"
                  data-testid="seller-name"
                >
                  {store?.name || product.store_id}
                </p>
                {store?.location && (
                  <p className="text-sm text-gray-600 flex items-center space-x-1 mt-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{store.location}</span>
                  </p>
                )}
                {typeof store?.rating === "number" && (
                  <p
                    className="text-sm text-gray-600 flex items-center space-x-1 mt-1"
                    data-testid="seller-rating"
                  >
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>{store.rating}</span>
                  </p>
                )}
                {store?.contact_whatsapp && whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="whatsapp-link"
                    className="mt-3 inline-flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {t("contactSeller", "Contact seller on WhatsApp")}
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
