import React from "react";
import { useTranslation } from "react-i18next";
import {
  Store,
  Plus,
  Share2,
  Edit,
  Trash2,
  MapPin,
  MessageCircle,
  ExternalLink,
  MoreVertical,
  Eye,
} from "lucide-react";
import type { StoreModel } from "../../openapi-rq/requests";

interface Store extends StoreModel {
  color?: string;
}

interface StoreListProps {
  stores: Store[];
  loading: boolean;
  onShowCreateStore: () => void;
  onEditStore: (id: string) => void;
  onDeleteStore: (id: string) => void;
  onShareStore: (id: string) => void;
  onViewStore: (id: string) => void;
  formatDate: (date: string) => string;
}

const StoreList: React.FC<StoreListProps> = ({
  stores,
  loading,
  onShowCreateStore,
  onEditStore,
  onDeleteStore,
  onShareStore,
  onViewStore,
  formatDate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("myStores", "My Stores")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t(
                "storesDescription",
                "Manage your stores and view their performance.",
              )}
            </p>
          </div>
          <button
            onClick={onShowCreateStore}
            title={t("createStore", "Create Store")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-transform transform hover:scale-105 flex items-center justify-center space-x-2 shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>{t("createStore", "Create Store")}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {t("loadingStores", "Loading stores...")}
          </p>
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-20 px-6">
          <Store className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t("noStores", "No stores yet")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {t(
              "noStoresDesc",
              "It looks like you haven't created any stores. Get started by creating your first one!",
            )}
          </p>
          <button
            onClick={onShowCreateStore}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-transform transform hover:scale-105 shadow-lg"
          >
            {t("createFirstStore", "Create Your First Store")}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {stores.map((store) => (
            <div
              key={store.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 ${store.color || "bg-emerald-500"} rounded-lg flex items-center justify-center shadow-inner`}
                  >
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      {store.name}
                      {store.is_verified && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {t("verified", "Verified")}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                      {store.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => onViewStore(store.id)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title={t("view", "View")}
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onShareStore(store.id)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title={t("share", "Share")}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onEditStore(store.id)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title={t("edit", "Edit")}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDeleteStore(store.id)}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
                    title={t("delete", "Delete")}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {store.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{store.location}</span>
                    </div>
                  )}
                  {store.contact_phone && (
                    <div className="flex items-center">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      <span>{store.contact_phone}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 self-start sm:self-center">
                  {t("created", "Created")}: {formatDate(store.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreList;
