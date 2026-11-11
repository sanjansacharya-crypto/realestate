import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Supabase cloud connections have network latency — allow 45s per test
    testTimeout: 45000,
    // Run test files sequentially to avoid exhausting Supabase connection pool
    fileParallelism: false,
    maxConcurrency: 1,
  },
});
