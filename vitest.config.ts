import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'foundation',
          env: { VITE_API_MOCK: 'true' },
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/features/exams/**', 'src/features/dashboard/**', 'src/features/catalog/**', 'src/features/manual/**', 'src/features/knowledge/**', 'src/features/practice/selection.test.tsx'],
        },
      },
      './vitest.exams.config.ts',
      './vitest.dashboard.config.ts',
      './vitest.catalog.config.ts',
      './vitest.manual.config.ts',
      './vitest.knowledge.config.ts',
      './vitest.practice-selection.config.ts',
    ],
  },
});
