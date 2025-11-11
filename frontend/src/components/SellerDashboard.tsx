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
import { toast } from "sonner";
// import ConnectionStatus from "./ConnectionStatus";
import StoreCreationModal, { StoreFormData } from "./StoreCreationModal";
import StoreEditModal, { StoreEditData } from "./StoreEditModal";
import StoreViewModal from "./StoreViewModal";
import ProductCreationModal, { ProductFormData } from "./ProductCreationModal";
import StoreList from "./dashboard/StoreList";
import ProductList from "./dashboard/ProductList";
import { apiAuthService } from "../services/keyManagement/apiAuthService";
import { ProductsService, StoresService } from "../openapi-rq/requests";
import type { ProductModel, StoreModel } from "../openapi-rq/requests";
import StatsGrid from "./dashboard/StatsGrid";

// Define interfaces
type Product = ProductModel;

interface Store extends StoreModel {
  // Optional UI color used only for mock/demo or UI badges
  color?: string;
}

interface SellerDashboardProps {
  onBack?: () => void;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"stores" | "products">("stores");
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
  const [imageSearchTerm, setImageSearchTerm] = useState("");

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
        toast.warning("Select a Store", {
          description: "Please select a store to view its products.",
        });
        setProducts([]);
        return;
      }

      const data = await ProductsService.getProducts({
        // @ts-expect-error The generated client incorrectly types storeId as a number.
        storeId: storeId,
      });
      const productsList = (data || []) as Product[];
      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]); // Or handle error state appropriately
      toast.error("Failed to fetch products", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await StoresService.getStores();
      console.log("Fetched stores:", data);

      // The API might return { stores: [...] } or just [...]
      const storesList = (data.stores || data || []) as Store[];
      setStores(storesList);
    } catch (error) {
      console.error("Error fetching stores:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch stores",
      );
      setStores([]);
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
    const imageUrl = getImageUrl(product.image_ids?.[0]);
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

  const handleShareStore = async (storeId: string) => {
    try {
      const response = await StoresService.getStoresByIdShare({ id: storeId });
      if (response.whatsapp_share_url) {
        window.open(response.whatsapp_share_url, "_blank");
        toast.success("Sharing Link Opened", {
          description: "Your store sharing link has been opened in a new tab.",
        });
      } else {
        throw new Error("No WhatsApp share URL found.");
      }
    } catch (error) {
      console.error("Error generating share link:", error);
      toast.error("Sharing Failed", {
        description:
          "Could not generate a share link for your store at this time.",
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
        await StoresService.deleteStoresById({ id: storeId });

        toast.success("Store Deleted", {
          description: `"${store.name}" has been deleted successfully.`,
        });

        // Refresh the stores list
        await fetchStores();
      } catch (error) {
        console.error("Error deleting store:", error);
        toast.error("Delete Failed", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  };

  const handleCreateStore = async (storeData: StoreFormData) => {
    try {
      console.log("Creating store:", storeData);

      const result = await StoresService.postStores({
        requestBody: {
          name: storeData.name,
          description: storeData.description,
          location: storeData.location,
          contact_phone: storeData.contact_phone,
        },
      });

      console.log("Store created successfully:", result);

      // Show success message
      toast.success("Store Created", {
        description: `"${storeData.name}" has been created successfully!`,
      });

      // Refresh the stores list to show the new store
      await fetchStores();
    } catch (error) {
      console.error("Error creating store:", error);
      toast.error("Creation Failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  const handleUpdateStore = async (storeData: StoreEditData) => {
    try {
      await StoresService.putStoresById({
        id: storeData.id,
        requestBody: {
          name: storeData.name,
          description: storeData.description,
          location: storeData.location,
          contact_phone: storeData.contact_phone,
        },
      });

      toast.success("Store Updated", {
        description: `"${storeData.name}" has been updated successfully!`,
      });

      // Refresh the stores list
      await fetchStores();
      setShowEditStore(false);
      setSelectedStore(null);
    } catch (error) {
      console.error("Error updating store:", error);
      toast.error("Update Failed", {
        description:
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

      const result = await ProductsService.postProducts({
        requestBody: {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          quantity_available: productData.quantity_available,
          category: productData.category,
          return_policy: productData.return_policy,
          image_ids: [], // Images are uploaded in the next step
        },
      });

      console.log("Product created successfully:", result);

      // If images were selected, upload them
      if (productData.images && productData.images.length > 0) {
        try {
          await uploadProductImages(result.id, productData.images);
          console.log("Images uploaded successfully");
        } catch (imageError) {
          console.error("Error uploading images:", imageError);
          toast.warning("Product Created", {
            description: `"${productData.name}" was created but some images failed to upload.`,
          });
        }
      }

      toast.success("Product Created", {
        description: `"${productData.name}" has been added to your store!`,
      });

      setShowCreateProduct(false);
      await fetchProducts(productData.store_id);
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Creation Failed", {
        description:
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Store className="w-8 h-8 text-emerald-500" />
              <h1 className="text-2xl font-bold">
                {t("sellerDashboard", "Seller Dashboard")}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {t("back", "Back")}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("stores")}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "stores"
                      ? "bg-emerald-500 text-white"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Store className="w-5 h-5 mr-3" />
                  <span>{t("myStores", "My Stores")}</span>
                </button>
                <button
                  onClick={() => setActiveTab("products")}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "products"
                      ? "bg-emerald-500 text-white"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Package className="w-5 h-5 mr-3" />
                  <span>{t("products", "Products")}</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <StatsGrid
              storeCount={stores.length}
              productCount={products.length}
            />
            {activeTab === "stores" && (
              <StoreList
                stores={stores}
                loading={loading}
                onShowCreateStore={() => setShowCreateStore(true)}
                onEditStore={handleEditStore}
                onDeleteStore={handleDeleteStore}
                onShareStore={handleShareStore}
                onViewStore={handleViewStore}
                formatDate={formatDate}
              />
            )}

            {activeTab === "products" && (
              <ProductList
                products={products}
                stores={stores}
                loading={productsLoading}
                onAddProduct={() => {
                  if (stores.length === 0) {
                    toast.warning("No Stores", {
                      description:
                        "Please create a store first before adding products.",
                    });
                  } else if (stores.length === 1) {
                    handleAddProduct(stores[0].id);
                  } else {
                    // TODO: Implement store selection modal
                    handleAddProduct(stores[0].id);
                  }
                }}
                formatPrice={formatPrice}
                formatDate={formatDate}
                getProductImageElement={getProductImageElement}
              />
            )}
          </div>
        </div>
      </main>

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
                location: selectedStore.location || "",
                contact_phone: selectedStore.contact_phone || "",
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
