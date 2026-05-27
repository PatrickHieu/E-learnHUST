import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // happy-dom is enough for our pure utility tests and isomorphic-dompurify;
    // we don't render React components here.
    environment: "happy-dom",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
