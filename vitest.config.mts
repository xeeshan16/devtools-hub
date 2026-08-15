import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The tool modules are pure logic, but several rely on browser globals
    // (btoa, crypto, TextDecoder), so they run against jsdom-free Node with
    // those globals available natively in modern Node.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
