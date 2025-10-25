import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "packages/**/__tests__/**/*.test.ts",
      "apps/**/*.test.ts",
      "apps/**/__tests__/**/*.test.ts"
    ],
    exclude: ["**/node_modules/**", "vibesdk/**"]
  }
});
