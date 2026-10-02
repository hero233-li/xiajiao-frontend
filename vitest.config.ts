import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'foundation',
          env: { VITE_API_MOCK: 'true' },
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/features/dashboard/**', 'src/features/catalog/**', 'src/features/manual/**', 'src/features/knowledge/**', 'src/features/practice/selection.test.tsx'],
        },
      },
      './vitest.dashboard.config.ts',
      './vitest.catalog.config.ts',
      './vitest.manual.config.ts',
      './vitest.knowledge.config.ts',
      './vitest.practice-selection.config.ts',
    ],
  },
});
