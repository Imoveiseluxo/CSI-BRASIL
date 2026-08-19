import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // Quem resolve `server-only` é o bundler do Next; em Node puro o pacote
      // não existe e todo arquivo que o importa deixa de carregar. Ver
      // tests/stubs/server-only.ts.
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
});
