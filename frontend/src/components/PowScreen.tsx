import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Cpu, CheckCircle } from "lucide-react";

interface PowScreenProps {
  onPowComplete: () => void;
  authStatus: {
    isLoading: boolean;
    powStatus: string;
    isPowComputing: boolean;
    error: string | null;
  };
}

const PowScreen: React.FC<PowScreenProps> = ({ onPowComplete, authStatus }) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (authStatus.isPowComputing) {
      // Simulate progress for better UX
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      return () => clearInterval(interval);
    } else if (!authStatus.isLoading && !authStatus.error) {
      // POW completed successfully
      setProgress(100);
      setShowSuccess(true);
      setTimeout(() => {
        onPowComplete();
      }, 1500);
    }
  }, [
    authStatus.isPowComputing,
    authStatus.isLoading,
    authStatus.error,
    onPowComplete,
  ]);

  if (authStatus.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("powFailed", "Proof of Work Failed")}
          </h2>
          <p className="text-gray-600 mb-6">{authStatus.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200"
          >
            {t("retryButton", "Try Again")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Header */}
        <div className="flex justify-center mb-8">
          <div className="p-6 rounded-2xl w-24 h-24 flex items-center justify-center bg-blue-50">
            {showSuccess ? (
              <CheckCircle className="w-12 h-12 text-green-600" />
            ) : (
              <Cpu className="w-12 h-12 text-blue-600" />
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {showSuccess
            ? t("powCompleted", "Verification Complete!")
            : t("powVerifying", "Device Verification")}
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          {showSuccess
            ? t(
                "powSuccessDesc",
                "Your device has been successfully verified. Welcome to Transac!",
              )
            : t(
                "powDesc",
                "Securing your device and verifying authenticity...",
              )}
        </p>

        {/* Progress */}
        {!showSuccess && (
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {authStatus.powStatus || t("powProcessing", "Processing...")}
            </p>
          </div>
        )}

        {/* Status Message */}
        {authStatus.isPowComputing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3" />
              <span className="text-blue-800 text-sm">
                {authStatus.powStatus ||
                  t("powComputing", "Computing Proof of Work...")}
              </span>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            {t(
              "powInfo",
              "This process helps prevent spam and ensures a secure marketplace environment for all users.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PowScreen;
