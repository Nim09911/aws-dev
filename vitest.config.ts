import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@aws-course/contracts": fileURLToPath(
        new URL("./packages/contracts/src/index.ts", import.meta.url),
      ),
      "@aws-course/data-access": fileURLToPath(
        new URL("./packages/data-access/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/dist/**", "**/node_modules/**"],
  },
});
