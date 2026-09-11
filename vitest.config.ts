import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],

    // B7 — coverage. Until now nothing said WHICH parts of the app were tested,
    // only that 192 tests passed. That distinction matters here specifically:
    // FLAG-221 is the repeated finding that a green suite can say nothing about
    // the property it appears to protect, and coverage is the cheapest way to see
    // where there is no test at all — which is a different and more basic problem
    // than a test that asserts the wrong thing.
    //
    // No thresholds are set yet, deliberately. A threshold picked before anyone
    // has seen the real number is either trivially met or instantly red, and a
    // red-from-day-one gate is what FLAG-370 describes on the backend. The
    // measured baseline goes in the PR; thresholds are a follow-up decision made
    // against real numbers.
    coverage: {
      provider: 'v8',
      // 'text' for a human reading CI logs; 'json-summary' so a later job or PR
      // comment can read the numbers without re-running the suite.
      reporter: ['text', 'text-summary', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        // Type-only modules compile to nothing, so they report 0% forever and
        // drag the average down while representing no untested behaviour.
        'src/types/**',
        'src/**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});