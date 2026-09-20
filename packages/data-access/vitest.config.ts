import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Phase 8 live tests share F8-* rows. Sequential files avoid fixture races.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 90_000,
  },
});
