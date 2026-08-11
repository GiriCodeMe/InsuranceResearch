import { defineConfig } from "vitest/config";

process.env.NODE_ENV = "test";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "packages/**/src/**/*.test.ts", "apps/**/src/**/*.test.ts"],
    environment: "node"
  }
});
