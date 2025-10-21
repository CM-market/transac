import React from "react";
import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
  message: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center font-[Inter] antialiased">
        <div className="backdrop-blur-md bg-white/80 border border-white/20 shadow-2xl rounded-3xl px-8 py-10 max-w-md w-full text-center relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-3xl"></div>

          {/* Floating particles */}
          <div className="absolute top-4 left-4 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-60 animate-[float_3s_ease-in-out_infinite]"></div>
          <div className="absolute top-8 right-6 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse opacity-40 animate-[float_3s_ease-in-out_infinite_0.5s]"></div>
          <div className="absolute bottom-6 left-8 w-1 h-1 bg-purple-400 rounded-full animate-pulse opacity-50 animate-[float_3s_ease-in-out_infinite_1s]"></div>

          {/* Main spinner */}
          <div className="relative mb-6">
            {/* Outer ring */}
            <div className="w-20 h-20 border-4 border-blue-100 rounded-full mx-auto relative">
              {/* Animated progress ring */}
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-500 rounded-full animate-[spin-slow_2s_linear_infinite]"></div>
              {/* Inner ring */}
              <div className="absolute inset-2 w-16 h-16 border-2 border-indigo-200 rounded-full"></div>
              {/* Center dot */}
              <div className="absolute inset-6 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Orbiting dots */}
            <div className="absolute inset-0 w-20 h-20 mx-auto animate-[spin-slow_8s_linear_infinite_reverse]">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-indigo-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-pink-400 rounded-full animate-ping opacity-75"></div>
            </div>
          </div>

          {/* Message */}
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t("loadingSpinner.securingDevice")}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              {message}
            </p>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-pulse w-[60%]"></div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>{t("loadingSpinner.encryption")}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>{t("loadingSpinner.authentication")}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span>{t("loadingSpinner.verification")}</span>
              </div>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-b-3xl"></div>
        </div>
      </div>
    </>
  );
};

export default LoadingSpinner;
