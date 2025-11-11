import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, Package, MoreVertical } from "lucide-react";
import type { ProductModel, StoreModel } from "../../openapi-rq/requests";

type Product = ProductModel;
interface Store extends StoreModel {
  color?: string;
}

interface ProductListProps {
  products: Product[];
  stores: Store[];
  loading: boolean;
  onAddProduct: () => void;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  getProductImageElement: (
    product: Product,
    size?: "small" | "medium",
  ) => React.ReactElement;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  stores,
  loading,
  onAddProduct,
  formatPrice,
  formatDate,
  getProductImageElement,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("products", "Products")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t(
                "productsDescription",
                "Manage all products across your stores.",
              )}
            </p>
          </div>
          <button
            onClick={onAddProduct}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-transform transform hover:scale-105 flex items-center justify-center space-x-2 shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>{t("addProduct", "Add Product")}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t("product", "Product")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t("store", "Store")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t("price", "Price")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t("stock", "Stock")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t("created", "Created")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t("actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                  {t("loadingProducts", "Loading products...")}
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  <Package className="w-12 h-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t("noProducts", "No products found")}
                  </h3>
                  <p>
                    {t(
                      "noProductsDesc",
                      "Get started by adding your first product.",
                    )}
                  </p>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="mr-4 flex-shrink-0">
                        {getProductImageElement(product, "medium")}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {product.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {stores.find((s) => s.id === product.store_id)?.name ||
                      t("unknownStore", "Unknown Store")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                        product.quantity_available > 0
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {product.quantity_available > 0
                        ? `${product.quantity_available} ${t("inStock", "in stock")}`
                        : t("outOfStock", "Out of stock")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(product.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        title={t("editProduct", "Edit Product")}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        title={t("deleteProduct", "Delete Product")}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
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
  );
};

export default ProductList;
