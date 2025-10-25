import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.{test,spec}.{ts,tsx}",
      "packages/**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "apps/**/*.{test,spec}.{ts,tsx}",
      "apps/**/__tests__/**/*.{test,spec}.{ts,tsx}"
    ],
    exclude: ["**/node_modules/**", "vibesdk/**"]
  }
});
