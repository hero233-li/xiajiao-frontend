import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    name: 'practice-selection',
    environment: 'jsdom',
    setupFiles: ['./src/features/practice/test-setup.ts'],
    include: ['src/features/practice/selection.test.tsx'],
  },
});
