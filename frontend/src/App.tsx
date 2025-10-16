import React, { useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter as Router } from "react-router-dom";

import useAuthenticationFlow from "./hooks/useAuthenticationFlow";
import AppRoutes from "./routes/AppRoutes";
import { CartProvider } from "./contexts/CartContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  // Use the comprehensive authentication flow
  const authStatus = useAuthenticationFlow();

  // Handle marketplace actions
  const handleBuy = useCallback(() => {
    // Navigate to products page for buying
    window.location.href = "/products";
  }, []);

  const handleSell = useCallback(() => {
    // Navigate to product preview page for selling
    window.location.href = "/product-preview";
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Delegate to AppRoutes for all routing and authentication handling
  return (
    <AppRoutes
      authStatus={authStatus}
      onPowComplete={() => {}}
      onBuy={handleBuy}
      onSell={handleSell}
      onRetry={handleRetry}
    />
  );
}

function AppWithRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <FavoritesProvider>
          <Router>
            <App />
          </Router>
        </FavoritesProvider>
      </CartProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default AppWithRouter;
