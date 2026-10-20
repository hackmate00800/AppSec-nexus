import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  
  build: {
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
          if (id.includes("src/theme/")) {
            return "theme-system";
          }
          if (id.includes("src/academy/data/")) {
            return "academy-data";
          }
          if (id.includes("src/academy/components/VirtualLabs")) {
            return "academy-labs";
          }
          if (id.includes("src/academy/components/VisualLearningEngine")) {
            return "academy-simulators";
          }
          if (id.includes("src/components/issues/")) {
            return "issue-center";
          }
          if (id.includes("src/categories/")) {
            return "categories";
          }
          if (id.includes("src/verification/")) {
            return "verification-lab";
          }
          if (id.includes("src/components/help/") || id.includes("src/components/crud/")) {
            return "app-modals";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
