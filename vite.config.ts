import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ychaynan-lite/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Bajo workers en paralelo, la primera resolución en frío de un import()
    // dinámico (las rutas con React.lazy y read-excel-file en el parser de
    // nóminas) puede superar un presupuesto ajustado; los 10 s originales
    // eran una guarda por defecto, no una aserción de rendimiento.
    testTimeout: 30_000,
    hookTimeout: 20_000,
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
});
