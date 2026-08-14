import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    pool: "threads",
    setupFiles: "./src/test/setup.ts",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          icons: ["react-icons"],
          router: ["react-router-dom"],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
