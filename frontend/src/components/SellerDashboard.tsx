import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Store,
  Plus,
  Package,
  Share2,
  Settings,
  BarChart3,
  Star,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
} from "lucide-react";
import ConnectionStatus from "./ConnectionStatus";
import StoreCreationModal, { StoreFormData } from "./StoreCreationModal";
import StoreEditModal, { StoreEditData } from "./StoreEditModal";
import StoreViewModal from "./StoreViewModal";
import ProductCreationModal, { ProductFormData } from "./ProductCreationModal";
import { useToast } from "./ToastContainer";
import { apiAuthService } from "../services/keyManagement/apiAuthService";

// Simplified mock data
const mockStores = [
  {
    id: "1",
    name: "TechHub Cameroon",
    description: "Electronics and gadgets for businesses",
    location: "Douala, Cameroon",
    contact_phone: "+237 123 456 789",
    contact_email: "info@techhub.cm",
    is_verified: true,
    rating: 4.8,
    total_products: 156,
    created_at: "2024-01-15",
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
  },
  {
    id: "2",
    name: "MacBook Pro M3",
    description: "Professional laptop with M3 chip",
    price: 850000,
    quantity_available: 10,
    store_id: "1",
    created_at: "2024-03-05",
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "stores" | "products"
  >("overview");
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [showEditStore, setShowEditStore] = useState(false);
  const [showViewStore, setShowViewStore] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch products for a specific store (seller flow)
  const fetchProducts = async (explicitStoreId?: string) => {
    try {
      setProductsLoading(true);

      // Determine the store id to query
      let storeId: string | undefined = explicitStoreId;
      if (!storeId && selectedStore) storeId = selectedStore.id;
      if (!storeId && stores.length === 1) storeId = stores[0].id;

      if (!storeId) {
        // Ambiguous: multiple or zero stores and none selected
        console.warn(
          "Cannot fetch products: store_id is required in seller flow",
        );
        showToast({
          type: "warning",
          title: "Select a Store",
          message: "Please select a store to view its products.",
        });
        setProducts([]);
        return;
      }

      const token =
        apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
      const response = await fetch(
        `/api/v1/products?store_id=${encodeURIComponent(storeId)}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        },
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else if (response.status === 401) {
        console.log("User not authenticated for products, using mock data");
        setProducts(mockProducts.filter((p) => p.store_id === storeId));
      } else {
        console.error("Failed to fetch products");
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);

      const token =
        apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
      const response = await fetch("/api/v1/stores", {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });
      if (!response.ok) {
        // For 401 errors, silently fall back to mock data (user not authenticated)
        if (response.status === 401) {
          console.log("User not authenticated, using mock data");
          setStores(mockStores);
          return;
        }
        throw new Error(`Failed to fetch stores: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched stores:", data);

      // The API might return { stores: [...] } or just [...]
      const storesList = data.stores || data || [];
      setStores(storesList);
    } catch (error) {
      console.error("Error fetching stores:", error);
      // Silently fall back to mock data instead of showing error
      console.log("Falling back to mock data");
      setStores(mockStores);
    } finally {
      setLoading(false);
    }
  };

  // Initial load: fetch stores; products will be fetched once a store is known
  useEffect(() => {
    fetchStores();
  }, []);

  // Whenever stores or selected store change, and the Products tab is active, fetch products for the active store
  useEffect(() => {
    if (activeTab === "products") {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, stores, selectedStore]);

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

  const handleCopyStoreLink = async (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (!store) return;
    const shareUrl = `https://transac.site/store/${storeId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast({
        type: "success",
        title: t("linkCopied", "Link Copied"),
        message: t(
          "linkCopiedMessage",
          "Your store link has been copied to the clipboard.",
        ),
      });
    } catch (error) {
      console.error("Failed to copy store link:", error);
      showToast({
        type: "error",
        title: t("copyFailed", "Copy Failed"),
        message: t(
          "copyFailedMessage",
          "Could not copy the link. Please try again.",
        ),
      });
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
        const token =
          apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
        const response = await fetch(`/api/v1/stores/${storeId}`, {
          method: "DELETE",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
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
        await fetchStores();
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
      const token =
        apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
      const response = await fetch("/api/v1/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: storeData.name,
          description: storeData.description || null,
          logo_url: storeData.logo_url || null,
          location: storeData.location || null,
          contact_phone: storeData.contact_phone || null,
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
      await fetchStores();
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
      const token =
        apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
      const response = await fetch(`/api/v1/stores/${storeData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      await fetchStores();
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
      await fetchProducts(productData.store_id);
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

      const token =
        apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
      const response = await fetch(`/api/v1/products/${productId}/media`, {
        method: "POST",
        body: formData,
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
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
          <div className="flex flex-wrap items-center justify-between gap-3 min-h-16 py-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <Store className="w-8 h-8 shrink-0 text-emerald-600" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                {t("sellerDashboard", "Seller Dashboard")}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <ConnectionStatus />
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 min-h-11 flex items-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
          <nav className="-mb-px flex gap-6 sm:gap-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap shrink-0 ${
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
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap shrink-0 ${
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
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap shrink-0 ${
                activeTab === "products"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              {t("products", "Products")}
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                          onClick={() => handleCopyStoreLink(store.id)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                          title={t("copyLink", "Copy Link")}
                        >
                          <Copy className="w-4 h-4" />
                          <span>{t("copyLink", "Copy Link")}</span>
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
