import React, { useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter as Router } from "react-router-dom";

import useSimplifiedAuthFlow from "./hooks/useSimplifiedAuthFlow";
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

  // Handle POW completion
  const handlePowComplete = useCallback(() => {
    // No-op: AppRoutes handles transitions based on authStatus
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
