import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Store,
  Plus,
  Package,
  Share2,
  Settings,
  BarChart3,
  Users,
  Star,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  Edit,
  Trash2,
} from "lucide-react";
import ConnectionStatus from "./ConnectionStatus";
import { OfflineIndicator, useOfflineStatus } from "./OfflineIndicator";
import { useOfflineData, useOfflineMutation } from "../hooks/useOfflineData";
import StoreCreationModal, { StoreFormData } from "./StoreCreationModal";
import StoreEditModal, { StoreEditData } from "./StoreEditModal";
import StoreViewModal from "./StoreViewModal";
import ProductCreationModal, { ProductFormData } from "./ProductCreationModal";
import { useToast } from "./ToastContainer";

// Simplified mock data
const mockStores = [
  {
    id: "1",
    name: "TechHub Cameroon",
    description: "Electronics and gadgets for businesses",
    location: "Douala, Cameroon",
    contact_phone: "+237 123 456 789",
    contact_email: "info@techhub.cm",
    contact_whatsapp: "+237 123 456 789",
    is_verified: true,
    rating: 4.8,
    total_products: 156,
    created_at: "2024-01-15",
    color: "bg-emerald-500",
  },
];

// Define interfaces
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity_available: number;
  store_id: string;
  image_id?: string;
  created_at: string;
}

interface Store {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  location?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_whatsapp?: string;
  is_verified: boolean;
  rating?: number;
  total_products?: number;
  created_at: string;
  // Optional UI color used only for mock/demo or UI badges
  color?: string;
}

const mockProducts = [
  {
    id: "1",
    name: "Samsung Galaxy S24",
    description: "Latest Samsung flagship smartphone",
    price: 450000,
    quantity_available: 25,
    store_id: "1",
    created_at: "2024-03-01",
    image_id: "sample-image-1",
  },
  {
    id: "2",
    name: "MacBook Pro M3",
    description: "Professional laptop with M3 chip",
    price: 850000,
    quantity_available: 10,
    store_id: "1",
    created_at: "2024-03-05",
    image_id: "sample-image-2",
  },
  {
    id: "3",
    name: "iPhone 15 Pro",
    description: "Premium iPhone with Pro features",
    price: 650000,
    quantity_available: 0,
    store_id: "1",
    created_at: "2024-03-10",
  },
];

interface SellerDashboardProps {
  onBack?: () => void;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { isOnline, isOffline } = useOfflineStatus();
  
  const [activeTab, setActiveTab] = useState<
    "overview" | "stores" | "products" | "images"
  >("overview");
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [showEditStore, setShowEditStore] = useState(false);
  const [showViewStore, setShowViewStore] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [imageSearchTerm, setImageSearchTerm] = useState("");

  // Use offline-aware data fetching
  const {
    data: storesData,
    loading,
    error,
    fromCache: storesFromCache,
    refetch: refetchStores
  } = useOfflineData<{stores: Store[]}>('/api/v1/stores', {
    cacheFirst: true,
    staleWhileRevalidate: true,
    refetchOnReconnect: true
  });

  const stores = storesData?.stores || mockStores;

  const {
    data: productsData,
    loading: productsLoading,
    fromCache: productsFromCache,
    refetch: refetchProducts
  } = useOfflineData<{products: Product[]}>('/api/v1/products', {
    cacheFirst: true,
    staleWhileRevalidate: true
  });

  const products = productsData?.products || mockProducts;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-CM", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-CM");
  };

  // Use offline mutation for creating stores
  const createStoreMutation = useOfflineMutation('/api/v1/stores', 'POST', {
    onSuccess: () => {
      showToast({
        type: "success",
        title: "Store Created",
        message: isOffline ? "Store will be created when you're back online" : "Store created successfully",
      });
      refetchStores();
    },
    onError: (error) => {
      showToast({
        type: "error",
        title: "Error",
        message: error,
      });
    }
  });

  // Create product mutation
  const createProductMutation = useOfflineMutation('/api/v1/products', 'POST', {
    onSuccess: () => {
      showToast({
        type: "success",
        title: "Product Created",
        message: isOffline ? "Product will be created when you're back online" : "Product created successfully",
      });
      refetchProducts();
    },
    onError: (error) => {
      showToast({
        type: "error",
        title: "Error",
        message: error,
      });
    }
  });

  // Helper function to generate image URL from image_id
  const getImageUrl = (imageId?: string) => {
    if (!imageId) return null;
    // For now, let's try to use the S3 key directly if it looks like one
    // Otherwise use the UUID mapping
    if (imageId.includes("products/")) {
      // This looks like an S3 key, use it directly
      return `/api/v1/media/${encodeURIComponent(imageId)}`;
    }
    // This is a UUID, use the mapping endpoint
    return `/api/v1/media/${imageId}`;
  };

  // Helper function to get product image or fallback
  const getProductImageElement = (
    product: Product,
    size: "small" | "medium" = "small",
  ) => {
    const imageUrl = getImageUrl(product.image_id);
    const sizeClasses = size === "small" ? "w-12 h-12" : "w-16 h-16";
    const iconSize = size === "small" ? "w-6 h-6" : "w-8 h-8";

    if (imageUrl) {
      return (
        <div className="relative group">
          <img
            src={imageUrl}
            alt={product.name}
            className={`${sizeClasses} rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => window.open(imageUrl, "_blank")}
            onError={(e) => {
              // Fallback to icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div
            className={`${sizeClasses} bg-gray-200 rounded-lg flex items-center justify-center hidden`}
          >
            <Package className={`${iconSize} text-gray-500`} />
          </div>
          {/* Overlay icon for click indication */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-opacity">
            <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      );
    }

    return (
      <div
        className={`${sizeClasses} bg-gray-200 rounded-lg flex items-center justify-center`}
      >
        <Package className={`${iconSize} text-gray-500`} />
      </div>
    );
  };

  const handleShareStore = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (store && store.contact_whatsapp) {
      // Extract phone number (remove + and any spaces/dashes)
      const phoneNumber = store.contact_whatsapp.replace(/[+\s-]/g, "");
      const shareUrl = `https://transac.site/store/${storeId}`;
      const whatsappMessage = `Check out my store '${store.name}' on Transac: ${shareUrl}`;
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const handleViewStore = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (store) {
      setSelectedStore(store);
      setShowViewStore(true);
    }
  };

  const handleEditStore = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (store) {
      setSelectedStore(store);
      setShowEditStore(true);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (
      store &&
      confirm(
        `Are you sure you want to delete "${store.name}"? This action cannot be undone.`,
      )
    ) {
      try {
        const response = await fetch(`/api/v1/stores/${storeId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete store: ${response.status}`);
        }

        showToast({
          type: "success",
          title: "Store Deleted",
          message: `"${store.name}" has been deleted successfully.`,
        });

        // Refresh the stores list
        await refetchStores();
      } catch (error) {
        console.error("Error deleting store:", error);
        showToast({
          type: "error",
          title: "Delete Failed",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  };

  const handleCreateStore = async (storeData: StoreFormData) => {
    try {
      console.log("Creating store:", storeData);

      // Make API call to create store
      const response = await fetch("/api/v1/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: storeData.name,
          description: storeData.description || null,
          logo_url: storeData.logo_url || null,
          location: storeData.location,
          contact_whatsapp: storeData.contact_whatsapp,
          owner_device_id: null, // Will be set by backend based on authentication
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create store: ${response.status} ${errorText}`,
        );
      }

      const result = await response.json();
      console.log("Store created successfully:", result);

      // Show success message
      showToast({
        type: "success",
        title: "Store Created",
        message: `"${storeData.name}" has been created successfully!`,
      });

      // Refresh the stores list to show the new store
      await refetchStores();
    } catch (error) {
      console.error("Error creating store:", error);
      showToast({
        type: "error",
        title: "Creation Failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  const handleUpdateStore = async (storeData: StoreEditData) => {
    try {
      const response = await fetch(`/api/v1/stores/${storeData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: storeData.name,
          description: storeData.description || null,
          logo_url: storeData.logo_url || null,
          location: storeData.location,
          contact_whatsapp: storeData.contact_whatsapp,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update store: ${response.status} ${errorText}`,
        );
      }

      showToast({
        type: "success",
        title: "Store Updated",
        message: `"${storeData.name}" has been updated successfully!`,
      });

      // Refresh the stores list
      await refetchStores();
      setShowEditStore(false);
      setSelectedStore(null);
    } catch (error) {
      console.error("Error updating store:", error);
      showToast({
        type: "error",
        title: "Update Failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      throw error;
    }
  };

  const handleAddProduct = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (store) {
      setSelectedStore(store);
      setShowCreateProduct(true);
    }
  };

  const handleCreateProduct = async (productData: ProductFormData) => {
    try {
      console.log("Creating product:", productData);

      // First, create the product without images
      const productPayload = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        quantity_available: productData.quantity_available,
        store_id: productData.store_id,
      };

      const response = await fetch("/api/v1/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create product: ${response.status} ${errorText}`,
        );
      }

      const result = await response.json();
      console.log("Product created successfully:", result);

      // If images were selected, upload them
      if (productData.images && productData.images.length > 0) {
        try {
          await uploadProductImages(result.product.id, productData.images);
          console.log("Images uploaded successfully");
        } catch (imageError) {
          console.error("Error uploading images:", imageError);
          // Don't fail the whole operation if image upload fails
          showToast({
            type: "warning",
            title: "Product Created",
            message: `"${productData.name}" was created but some images failed to upload.`,
          });
        }
      }

      // Show success message
      showToast({
        type: "success",
        title: "Product Created",
        message: `"${productData.name}" has been added to ${selectedStore?.name}!`,
      });

      // Close the product modal and refresh products list
      setShowCreateProduct(false);

      // Refresh the products list for the product's store
      await refetchProducts();
    } catch (error) {
      console.error("Error creating product:", error);
      showToast({
        type: "error",
        title: "Creation Failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      throw error;
    }
  };

  const uploadProductImages = async (productId: string, images: File[]) => {
    for (let i = 0; i < images.length; i++) {
      const formData = new FormData();
      formData.append("file", images[i]);

      const response = await fetch(`/api/v1/products/${productId}/media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload image ${i + 1}`);
      }

      const result = await response.json();
      console.log("Image upload result:", result);

      // The result contains image_url which can be used directly
      // This will be handled by the product refresh
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Store className="w-8 h-8 text-emerald-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {t("sellerDashboard", "Seller Dashboard")}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <OfflineIndicator />
              <ConnectionStatus />
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t("back", "Back")}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              {t("overview", "Overview")}
            </button>
            <button
              onClick={() => setActiveTab("stores")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "stores"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Store className="w-4 h-4 inline mr-2" />
              {t("myStores", "My Stores")}
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "products"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              {t("products", "Products")}
            </button>
            <button
              onClick={() => setActiveTab("images")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "images"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <svg
                className="w-4 h-4 inline mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {t("images", "Images")}
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Store className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {t("totalStores", "Total Stores")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stores.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {t("totalProducts", "Total Products")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {products.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {t("totalImages", "Total Images")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {products.filter((p) => p.image_id).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {t("avgRating", "Avg Rating")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">4.8</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {t("totalViews", "Total Views")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">1,234</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t("quickActions", "Quick Actions")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowCreateStore(true)}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-6 h-6 text-emerald-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {t("createStore", "Create Store")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t("createStoreDesc", "Set up a new store")}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stores Tab */}
        {activeTab === "stores" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("myStores", "My Stores")}
              </h2>
              <button
                onClick={() => setShowCreateStore(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t("createStore", "Create Store")}</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {t("loadingStores", "Loading stores...")}
                </p>
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("noStores", "No stores yet")}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t(
                    "noStoresDesc",
                    "Create your first store to start selling",
                  )}
                </p>
                <button
                  onClick={() => setShowCreateStore(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {t("createFirstStore", "Create Your First Store")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="bg-white rounded-lg shadow border border-gray-200"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-12 h-12 ${store.color || "bg-emerald-500"} rounded-lg flex items-center justify-center`}
                          >
                            <Store className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                              {store.name}
                              {store.is_verified && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {t("verified", "Verified")}
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {store.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditStore(store.id)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Edit Store"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStore(store.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Delete Store"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {store.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {store.location}
                          </div>
                        )}
                        {store.contact_whatsapp && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            {store.contact_whatsapp}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                            <span className="text-sm font-medium">
                              {store.rating}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {store.total_products} {t("products", "products")}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {t("created", "Created")}{" "}
                          {formatDate(store.created_at)}
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleShareStore(store.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>{t("share", "Share")}</span>
                        </button>
                        <button
                          onClick={() => handleViewStore(store.id)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>{t("view", "View")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("products", "Products")}
              </h2>
              <button
                onClick={() => {
                  if (stores.length === 0) {
                    showToast({
                      type: "warning",
                      title: "No Stores",
                      message:
                        "Please create a store first before adding products.",
                    });
                  } else if (stores.length === 1) {
                    // If only one store, use it directly
                    handleAddProduct(stores[0].id);
                  } else {
                    // Multiple stores - show selection (for now, just use first store)
                    // TODO: Implement store selection modal
                    handleAddProduct(stores[0].id);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t("addProduct", "Add Product")}</span>
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {t("productList", "Product List")}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("product", "Product")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("store", "Store")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("price", "Price")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("stock", "Stock")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("created", "Created")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("actions", "Actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productsLoading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          {t("loadingProducts", "Loading products...")}
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          {t(
                            "noProducts",
                            "No products found. Create your first product!",
                          )}
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="mr-4">
                                {getProductImageElement(product, "medium")}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {product.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {product.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {/* Find store name by store_id */}
                            {stores.find((s) => s.id === product.store_id)
                              ?.name || "Unknown Store"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(product.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                product.quantity_available > 0
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {product.quantity_available > 0
                                ? `${product.quantity_available} ${t("inStock", "in stock")}`
                                : t("outOfStock", "Out of stock")}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(product.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Images Tab */}
        {activeTab === "images" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("allImages", "All Images")}
              </h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t("searchImages", "Search images...")}
                    value={imageSearchTerm}
                    onChange={(e) => setImageSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                  <svg
                    className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <div className="text-sm text-gray-500">
                  {
                    products.filter(
                      (p) =>
                        p.image_id &&
                        (imageSearchTerm === "" ||
                          p.name
                            .toLowerCase()
                            .includes(imageSearchTerm.toLowerCase()) ||
                          (p.description &&
                            p.description
                              .toLowerCase()
                              .includes(imageSearchTerm.toLowerCase()))),
                    ).length
                  }{" "}
                  {t("imagesFound", "images found")}
                </div>
              </div>
            </div>

            {productsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">
                  {t("loadingImages", "Loading images...")}
                </div>
              </div>
            ) : products.filter((p) => p.image_id).length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {t("noImages", "No images uploaded")}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t(
                    "noImagesDesc",
                    "Upload some product images to see them here.",
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {products
                  .filter(
                    (product) =>
                      product.image_id &&
                      (imageSearchTerm === "" ||
                        product.name
                          .toLowerCase()
                          .includes(imageSearchTerm.toLowerCase()) ||
                        (product.description &&
                          product.description
                            .toLowerCase()
                            .includes(imageSearchTerm.toLowerCase()))),
                  )
                  .map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-square relative">
                        <img
                          src={
                            getImageUrl(product.image_id) ||
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzVMMTI1IDEwMEgxMTJWMTI1SDg4VjEwMEg3NUwxMDAgNzVaIiBmaWxsPSIjOUI5QkEwIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LXNpemU9IjEyIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+Cjwvc3ZnPg=="
                          }
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzVMMTI1IDEwMEgxMTJWMTI1SDg4VjEwMEg3NUwxMDAgNzVaIiBmaWxsPSIjOUI5QkEwIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LXNpemU9IjEyIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+Cjwvc3ZnPg==";
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => {
                              const imageUrl = getImageUrl(product.image_id);
                              if (imageUrl) window.open(imageUrl, "_blank");
                            }}
                            className="opacity-0 hover:opacity-100 transition-opacity bg-white rounded-full p-2 shadow-lg"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-medium text-emerald-600">
                            {formatPrice(product.price)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {stores.find((s) => s.id === product.store_id)
                              ?.name || "Unknown Store"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>{formatDate(product.created_at)}</span>
                          <span className="flex items-center">
                            <Package className="w-3 h-3 mr-1" />
                            {product.quantity_available}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Store Creation Modal */}
      <StoreCreationModal
        isOpen={showCreateStore}
        onClose={() => setShowCreateStore(false)}
        onSubmit={handleCreateStore}
      />

      {/* Store Edit Modal */}
      <StoreEditModal
        isOpen={showEditStore}
        onClose={() => {
          setShowEditStore(false);
          setSelectedStore(null);
        }}
        onSubmit={handleUpdateStore}
        store={
          selectedStore
            ? {
                id: selectedStore.id,
                name: selectedStore.name,
                description: selectedStore.description || "",
                logo_url: selectedStore.logo_url || "",
                location: selectedStore.location || "",
                contact_whatsapp: selectedStore.contact_whatsapp || "",
              }
            : null
        }
      />

      {/* Store View Modal */}
      <StoreViewModal
        isOpen={showViewStore}
        onClose={() => {
          setShowViewStore(false);
          setSelectedStore(null);
        }}
        store={selectedStore}
        onAddProduct={handleAddProduct}
      />

      {/* Product Creation Modal */}
      <ProductCreationModal
        isOpen={showCreateProduct}
        onClose={() => {
          setShowCreateProduct(false);
          setSelectedStore(null);
        }}
        onSubmit={handleCreateProduct}
        storeId={selectedStore?.id || ""}
        storeName={selectedStore?.name || ""}
      />
    </div>
  );
};

export default SellerDashboard;
