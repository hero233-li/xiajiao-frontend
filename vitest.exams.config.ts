import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    name: 'exams',
    environment: 'jsdom',
    setupFiles: ['./src/features/exams/test-setup.ts'],
    include: ['src/features/exams/*.test.tsx'],
  },
});
