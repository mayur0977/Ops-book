import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Module tests live beside the module they cover (apps/api/CLAUDE.md);
    // test/ holds the cross-cutting ones and the shared harness.
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Tenant isolation tests share one database and assert on row visibility.
    // Running them in parallel would let one file's fixtures satisfy another's
    // negative assertion — the exact bug the suite exists to catch.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
