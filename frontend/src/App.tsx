import React, { useCallback } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter as Router, useNavigate } from "react-router-dom";

import useSimplifiedAuthFlow from "./hooks/useSimplifiedAuthFlow";
import AppRoutes from "./routes/AppRoutes";
import { ToastProvider } from "./components/ToastContainer";
import { PWAStatusIndicator } from "./components/PWAInstallPrompt";
import { CartProvider } from "./contexts/CartContext";
import { queryClient } from "./lib/queryClient";

function App() {
  // Use the simplified authentication flow (without registration)
  const authStatus = useSimplifiedAuthFlow();
  const navigate = useNavigate();

  // Handle POW completion
  const handlePowComplete = useCallback(() => {
    // No-op: AppRoutes handles transitions based on authStatus
  }, []);

  // Handle marketplace actions
  const handleBuy = useCallback(() => {
    navigate("/buyer-dashboard");
  }, [navigate]);

  const handleSell = useCallback(() => {
    // TODO: Implement sell flow
    console.log("Sell flow initiated");
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Delegate to AppRoutes for handling loading, error states and routing
  return (
    <AppRoutes
      authStatus={authStatus}
      onPowComplete={handlePowComplete}
      onBuy={handleBuy}
      onSell={handleSell}
      onRetry={handleRetry}
    />
  );
}

function AppWithRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CartProvider>
          <Router>
            <App />
            <PWAStatusIndicator />
          </Router>
          <ReactQueryDevtools initialIsOpen={false} />
        </CartProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default AppWithRouter;
