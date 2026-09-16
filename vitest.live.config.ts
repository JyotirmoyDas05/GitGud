import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vite.config";

// The live walk is excluded from `npm test` on purpose: it needs a network and
// a throwaway GitHub account in a specific state.
export default mergeConfig(
  base({ command: "serve", mode: "test" }),
  defineConfig({
    test: {
      include: ["src/**/*.live.ts"],
      testTimeout: 60_000,
      hookTimeout: 60_000,
    },
  }),
);
