import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ychaynan-lite/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    testTimeout: 10_000,
    hookTimeout: 20_000,
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
});
