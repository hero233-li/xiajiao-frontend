import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    name: 'manual',
    environment: 'jsdom',
    setupFiles: ['./src/features/dashboard/test-setup.ts'],
    include: ['src/features/manual/*.test.tsx'],
  },
});
