import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ychaynan-lite/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Defensa secundaria: el freno principal contra la intermitencia por
    // contención bajo workers en paralelo es asyncUtilTimeout en
    // src/test/setup.ts, que gobierna cada findBy*/waitFor individual.
    // Este testTimeout solo acota la prueba completa; 30 s da margen sin
    // ocultar una prueba genuinamente colgada.
    testTimeout: 30_000,
    hookTimeout: 20_000,
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
});
