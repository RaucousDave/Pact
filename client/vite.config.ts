import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://pact-backend.fastapicloud.dev",
        changeOrigin: true,
      },
    },
    port: 3000,
  },
});
