import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The editor's core is DOM surgery — parseDocument/serializeDocument,
    // structure detection, sanitisation — so tests need a real DOM rather
    // than mocks of one.
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
