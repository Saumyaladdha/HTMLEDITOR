import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 8010 is the historical default, but it is not reserved — on this
// machine another service already listens there, so the dev proxy silently
// forwarded API calls to an unrelated backend. Overridable rather than
// hardcoded: `API_TARGET=http://localhost:8021 npm run dev`.
const API_TARGET = process.env.API_TARGET ?? "http://localhost:8010";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT ?? 5173),
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    port: Number(process.env.PORT ?? 4173),
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
