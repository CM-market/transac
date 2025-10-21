import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "../layouts";
import {
  ErrorPage,
  LoadingPage,
  Cart,
  NotFound,
  Orders,
  ProductDetails,
  ProductList,
  Search,
  Favorites,
} from "../pages";
import PowScreen from "../components/PowScreen";
import MarketplaceWelcome from "../components/MarketplaceWelcome";
import type { AuthenticationStatus } from "../hooks/useAuthenticationFlow";

interface AppRoutesProps {
  authStatus: AuthenticationStatus;
  onPowComplete: () => void;
  onBuy: () => void;
  onRetry: () => void;
}

const AppRoutes: React.FC<AppRoutesProps> = ({
  authStatus,
  onPowComplete,
  onBuy,
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

  // Main application routes after successful authentication
  return (
    <Routes>
      <Route path="/" element={<MarketplaceWelcome onBuy={onBuy} />} />
      <Route element={<MainLayout />}>
        <Route path="cart" element={<Cart />} />
        <Route path="orders" element={<Orders />} />
        <Route path="products" element={<ProductList />} />
        <Route path="product/:id" element={<ProductDetails />} />
        <Route path="search" element={<Search />} />
        <Route path="favorites" element={<Favorites />} />
      </Route>
      {/* Default redirect */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
