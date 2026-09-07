import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/dom';

// El valor por defecto de Testing Library (1.000 ms) es independiente del
// testTimeout de Vitest: findBy*/waitFor lanzan su propio error al llegar a
// este plazo, sin importar cuánto tiempo le dé Vitest a la prueba. Bajo
// workers en paralelo, trabajo asíncrono legítimo pero lento —resolución en
// frío de un import() dinámico, el parseo de un XLSX— puede superar 1.000 ms
// sin que haya ningún error real. 5.000 ms da margen para esa contención sin
// ocultar una prueba genuinamente colgada (Vitest sigue cortando a los 30 s).
configure({ asyncUtilTimeout: 5_000 });
