import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["{server,shared,src}/**/*.test.{ts,tsx}"], environment: "node" } });
