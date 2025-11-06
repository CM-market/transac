import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
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
      manifest: {
        name: "ReportHub",
        short_name: "ReportHub",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#007bff",
        icons: [
          {
            src: "/download1.png",
            sizes: "225x225",
            type: "image/png",
          },
          {
            src: "/download2.png",
            sizes: "225x225",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
