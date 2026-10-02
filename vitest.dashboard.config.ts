import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    name: 'dashboard',
    environment: 'jsdom',
    setupFiles: ['./src/features/dashboard/test-setup.ts'],
    include: ['src/features/dashboard/*.test.tsx'],
  },
});
