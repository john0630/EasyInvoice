import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { localDataPlugin } from "./vite-plugin-local-data";

export default defineConfig({
  plugins: [react(), tailwindcss(), localDataPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
