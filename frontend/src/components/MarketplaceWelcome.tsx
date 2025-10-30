import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, TrendingUp, Store, Building2 } from "lucide-react";
import ConnectionStatus from "./ConnectionStatus";

interface MarketplaceWelcomeProps {
  onBuy: () => void;
  onSell: () => void;
  onBack?: () => void;
}

const MarketplaceWelcome: React.FC<MarketplaceWelcomeProps> = ({
  onBuy,
  onSell: _onSell, // Keeping for backward compatibility but not used
  onBack,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSellClick = () => {
    navigate("/seller-dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
        {/* Connection Status */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ConnectionStatus />
        </div>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="p-3 sm:p-4 rounded-2xl w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-blue-600 shadow-lg">
              <Store className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
            {t("marketplaceWelcomeTitle", "Welcome to Transac")}
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed">
            {t("marketplaceWelcomeSubtitle", "B2B Marketplace for Cameroon")}
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <button
            onClick={onBuy}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white font-semibold py-4 sm:py-5 px-6 rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
          >
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-base sm:text-lg font-medium">{t("buyButton", "Buy Products")}</span>
          </button>

          <button
            onClick={handleSellClick}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:from-emerald-800 active:to-emerald-900 text-white font-semibold py-4 sm:py-5 px-6 rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
          >
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-base sm:text-lg font-medium">{t("sellButton", "Sell Products")}</span>
          </button>
        </div>

        {/* Business Features */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 mb-6 shadow-sm">
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
            {t("marketplaceFeaturesTitle", "For Businesses in Cameroon")}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <span className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {t("featureB2B", "Connect with trusted B2B partners")}
              </span>
            </div>
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <span className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {t("featureSecure", "Secure transactions and verification")}
              </span>
            </div>
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
              <span className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {t("featureLocal", "Local market focused on Cameroon businesses")}
              </span>
            </div>
          </div>
        </div>

        {/* Back Button (if needed) */}
        {onBack && (
          <button
            onClick={onBack}
            className="w-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium py-3 sm:py-4 px-6 rounded-xl sm:rounded-2xl transition-all duration-200 touch-manipulation"
          >
            {t("backButton", "Back")}
          </button>
        )}

        {/* Footer */}
        <p className="text-center text-xs sm:text-sm text-gray-500 mt-6 sm:mt-8 leading-relaxed">
          {t("marketplaceFooter", "Transac - Powering B2B commerce in Cameroon")}
        </p>
      </div>
    </div>
  );
};

export default MarketplaceWelcome;
