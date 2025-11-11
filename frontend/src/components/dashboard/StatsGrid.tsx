import React from "react";
import { useTranslation } from "react-i18next";
import { Store, Package } from "lucide-react";

interface StatsGridProps {
  storeCount: number;
  productCount: number;
}

const StatsGrid: React.FC<StatsGridProps> = ({ storeCount, productCount }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-full">
          <Store className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t("totalStores", "Total Stores")}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {storeCount}
          </p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
          <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t("totalProducts", "Total Products")}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {productCount}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsGrid;
