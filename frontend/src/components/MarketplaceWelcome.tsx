import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, TrendingUp, Store, Building2 } from "lucide-react";

interface MarketplaceWelcomeProps {
  onBuy: () => void;
  onBack?: () => void;
}

const MarketplaceWelcome: React.FC<MarketplaceWelcomeProps> = ({
  onBuy,
  onBack,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl w-20 h-20 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-blue-600">
              <Store className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t("marketplaceWelcome.title")}
          </h1>
          <p className="text-lg text-gray-600">
            {t("marketplaceWelcome.subtitle")}
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-4 mb-8">
          <button
            onClick={onBuy}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-lg">
              {t("marketplaceWelcome.buyProducts")}
            </span>
          </button>
        </div>

        {/* Business Features */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {t("marketplaceWelcome.forBusinesses")}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">
                {t("marketplaceWelcome.connect")}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm text-gray-600">
                {t("marketplaceWelcome.secureTransactions")}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-sm text-gray-600">
                {t("marketplaceWelcome.localMarket")}
              </span>
            </div>
          </div>
        </div>

        {/* Back Button (if needed) */}
        {onBack && (
          <button
            onClick={onBack}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors duration-200"
          >
            {t("marketplaceWelcome.back")}
          </button>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          {t("marketplaceWelcome.footer")}
        </p>
      </div>
    </div>
  );
};

export default MarketplaceWelcome;
