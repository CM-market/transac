import React, { useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter as Router } from "react-router-dom";

import useSimplifiedAuthFlow from "./hooks/useSimplifiedAuthFlow";
import useAuthenticationFlow from "./hooks/useAuthenticationFlow";
import AppRoutes from "./routes/AppRoutes";
import { CartProvider } from "./contexts/CartContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { Toaster } from "./components/ui/sonner";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  // Use the simplified authentication flow (without registration)
  const authStatus = useSimplifiedAuthFlow();

  // Handle POW completion
  const handlePowComplete = useCallback(() => {
    // No-op: AppRoutes handles transitions based on authStatus
  }, []);

  // Handle marketplace actions
  const handleBuy = useCallback(() => {
    // Navigate to products page for buying
    window.location.href = "/products";
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Delegate to AppRoutes for handling loading, error states and routing
  return (
    <AppRoutes
      authStatus={authStatus}
      onPowComplete={() => {}}
      onBuy={handleBuy}
      onRetry={handleRetry}
    />
  );
}

function AppWithRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <FavoritesProvider>
          <CartProvider>
            <App />
            <Toaster />
          </CartProvider>
        </FavoritesProvider>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default AppWithRouter;
