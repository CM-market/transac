import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { initializePWA } from "./utils/pwa";
import "./index.css";
import App from "./App.tsx";
import { OpenAPI } from "./openapi-rq/requests/core/OpenAPI";

async function initializeAndRenderApp() {
  try {
    // Prefer current origin so the frontend can proxy to backend in any env
    OpenAPI.BASE = window.location.origin;
    
    // Initialize PWA features
    initializePWA();
  } finally {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </StrictMode>,
    );
  }
}

initializeAndRenderApp();
