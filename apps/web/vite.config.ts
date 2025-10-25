import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_"],
  define: {
    "process.env": {}
  },
  build: {
    sourcemap: true
  }
});
