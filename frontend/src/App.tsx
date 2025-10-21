import React, { useCallback, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter as Router } from "react-router-dom";

import useSimplifiedAuthFlow from "./hooks/useSimplifiedAuthFlow";
import PowScreen from "./components/PowScreen";
import MarketplaceWelcome from "./components/MarketplaceWelcome";
import AppRoutes from "./routes/AppRoutes";
import { ToastProvider } from "./components/ToastContainer";

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

  // App state management - simplified for marketplace flow
  const [showPowScreen, setShowPowScreen] = useState(true);
  const [showMarketplaceWelcome, setShowMarketplaceWelcome] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Check if authentication is already complete
  useEffect(() => {
    const authToken = localStorage.getItem("authToken");
    if (authToken) {
      // Skip POW if already authenticated
      setShowPowScreen(false);
      setShowMarketplaceWelcome(true);
      setHasInitialized(true);
    } else if (!hasInitialized) {
      setShowPowScreen(true);
      setShowMarketplaceWelcome(false);
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Handle POW completion
  const handlePowComplete = useCallback(() => {
    setShowPowScreen(false);
    setShowMarketplaceWelcome(true);
  }, []);

  // Handle marketplace actions
  const handleBuy = useCallback(() => {
    // TODO: Implement buy flow
    console.log("Buy flow initiated");
  }, []);

  const handleSell = useCallback(() => {
    // TODO: Implement sell flow
    console.log("Sell flow initiated");
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Show POW screen during authentication
  if (showPowScreen && (authStatus.isLoading || authStatus.isPowComputing)) {
    return (
      <PowScreen onPowComplete={handlePowComplete} authStatus={authStatus} />
    );
  }

  // Show marketplace welcome after authentication
  if (showMarketplaceWelcome) {
    return <MarketplaceWelcome onBuy={handleBuy} onSell={handleSell} />;
  }

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
        <Router>
          <App />
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default AppWithRouter;
