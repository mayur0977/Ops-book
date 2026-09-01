import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Token and pure-logic tests only. Component rendering needs a React Native
    // environment; the useful assertions here are about the design system's own
    // rules — contrast, scale, motion budget — which are plain arithmetic.
    include: ['src/**/*.test.ts'],
  },
});
