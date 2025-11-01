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
} from "lucide-react";

interface StoreLite {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  location?: string;
  contact_whatsapp?: string;
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

const StoreViewModal: React.FC<StoreViewModalProps> = ({
  isOpen,
  onClose,
  store,
  onAddProduct,
}) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStoreProducts = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/products?store_id=${store.id}`);
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

  useEffect(() => {
    if (store && isOpen) {
      fetchStoreProducts();
    }
  }, [store, isOpen, fetchStoreProducts]);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Store className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {store.name}
              </h2>
              <p className="text-sm text-gray-600">{store.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
            {store.rating && (
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">{store.rating}</span>
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

        {/* Products Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
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
