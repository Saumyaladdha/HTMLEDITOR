import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The editor's core is DOM surgery — parseDocument/serializeDocument,
    // structure detection, sanitisation — so tests need a real DOM rather
    // than mocks of one.
    environment: "jsdom",
    // .tsx as well: a panel that throws during render simply stops
    // appearing, with no error in the page — the only way to catch that
    // is to mount the component, which needs JSX in the test.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
