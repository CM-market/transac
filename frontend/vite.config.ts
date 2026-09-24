import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/healthz": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/api-docs": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/swagger-ui": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  define: {
    global: "globalThis",
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      strategies: "generateSW",
      devOptions: {
        enabled: true,
      },
      useCredentials: true,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Serve the app shell for navigations when offline so the PWA keeps
        // loading after the network drops.
        navigateFallback: "/index.html",
        // Never fall back for API requests — those are handled by the
        // offline-aware data layer (see src/services/offline).
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Same-origin API GETs (the app calls /api/v1/... relative paths).
            // NetworkFirst transparently serves the last-good response offline.
            urlPattern: /^\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Image assets: cache-first so previously-viewed product/store
            // images render offline.
            urlPattern: /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
