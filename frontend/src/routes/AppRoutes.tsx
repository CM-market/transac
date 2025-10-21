import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "../layouts";
import { ErrorPage, LoadingPage } from "../pages";
import PowScreen from "../components/PowScreen";
import MarketplaceWelcome from "../components/MarketplaceWelcome";
import SellerDashboard from "../components/SellerDashboard";
import type { AuthenticationStatus } from "../hooks/useSimplifiedAuthFlow";

interface AppRoutesProps {
  authStatus: AuthenticationStatus;
  onPowComplete: () => void;
  onBuy: () => void;
  onSell: () => void;
  onRetry: () => void;
}

const AppRoutes: React.FC<AppRoutesProps> = ({
  authStatus,
  onPowComplete,
  onBuy,
  onSell,
  onRetry,
}) => {
  const isLoading = authStatus.isLoading;
  const hasError = !!authStatus.error;
  const errorMessage = authStatus.error || undefined;

  // Show loading state during authentication
  if (isLoading) {
    return <LoadingPage message="Securing your device..." />;
  }

  // Show error if authentication failed
  if (hasError) {
    return <ErrorPage message={errorMessage} onRetry={onRetry} />;
  }

  // Show POW screen during authentication
  if (authStatus.isPowComputing) {
    return <PowScreen onPowComplete={onPowComplete} authStatus={authStatus} />;
  }

  // Show marketplace welcome after successful authentication
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route
          index
          element={<MarketplaceWelcome onBuy={onBuy} onSell={onSell} />}
        />
        <Route
          path="/seller-dashboard"
          element={<SellerDashboard onBack={() => window.history.back()} />}
        />
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
