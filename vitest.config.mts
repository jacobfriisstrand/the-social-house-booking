import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // Component tests render client components whose import chain reaches
      // server modules guarded by the server-only package; node tests point
      // the guard at an empty module (scripts/server-only-stub.ts).
      "server-only": fileURLToPath(
        new URL("./scripts/server-only-stub.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
  },
});
