# Yachayñan Lite — Sistema visual funcional

## Objetivo

Reemplazar la apariencia genérica, brillante y con modo oscuro automático de Yachayñan Lite por una interfaz editorial sobria que priorice la operación docente y la legibilidad diagnóstica.

La herramienta se presenta como un producto funcional de uso personal. La identidad Human / System de Alejandro Córdova se usa como referencia visual aplicada con discreción; no se desarrolla una submarca independiente.

## Principios

- La lectura y la respuesta estudiantil son el centro visual.
- La interfaz debe comunicar confianza, calma y precisión.
- El color tiene función jerárquica, no decorativa.
- Las pantallas operativas usan filas, divisores y tablas antes que colecciones de tarjetas.
- La interfaz no promete capacidades que todavía no están implementadas.
- El comportamiento existente, autenticación y contratos de datos permanecen intactos.
- Objetivo mínimo de accesibilidad: WCAG 2.2 AA, teclado, foco visible, estados claros y uso cómodo en móvil.

## Tokens aprobados

```css
--surface-page: #F3F1EA;
--surface-card: #F8F7F2;
--surface-inset: #ECEAE3;
--text: #101820;
--text-muted: #5C636C;
--brand: #071B33;
--brand-context: #123C69;
--brand-active: #2367D1;
--signal: #D83A32;
--border: #D7D9D6;
--border-strong: #AEB4B5;
--success: #123C69;
--success-soft: #E7EEF4;
--warning: #8A5A00;
--warning-soft: #F7EED8;
--danger: #D83A32;
--danger-soft: #FBE9E7;
--font-sans: 'Public Sans', system-ui, sans-serif;
--font-serif: 'Source Serif 4', Georgia, serif;
--font-mono: 'DM Mono', ui-monospace, monospace;
--radius-sm: 2px;
--radius-md: 4px;
```

No se usará `prefers-color-scheme` para alterar toda la paleta en esta fase. Los controles conservarán contraste suficiente en el único tema claro aprobado.

## Tipografía

- `Public Sans`: navegación, títulos, etiquetas, formularios y controles.
- `Source Serif 4`: lectura, citas y respuestas textuales cuando aparezcan.
- `DM Mono`: códigos de evaluación, metadatos, estados y microetiquetas.

## Composición

- Contenedor amplio con límite de 1280px y padding adaptable.
- Microetiquetas con punto rojo de 6px solo como señal contextual.
- Divisores de 1px para separar secciones.
- Acciones primarias en azul profundo; el rojo nunca será fondo de botones completos.
- Tarjetas solo cuando agrupen una tarea; sin sombras difusas ni radios grandes.
- Formularios con estados de foco, error, carga y deshabilitado visibles.
- Móvil como prioridad: navegación apilable, tablas con desplazamiento controlado y objetivos táctiles cómodos.

## Alcance de la primera reconstrucción

Se rediseñan las superficies existentes: ingreso docente, cambio de contraseña, inicio docente, paralelos, importación de nómina, encabezado, navegación, avisos, carga y pie. No se agregan todavía creación de evaluaciones, respuestas, IA ni dashboard diagnóstico porque aún no existen en el producto.

## Criterios de aceptación

1. Ninguna regla de tema oscuro automático ni color neón permanece activa.
2. La aplicación usa la paleta y familias tipográficas aprobadas.
3. Los flujos de autenticación y paralelos funcionan sin cambiar sus contratos.
4. Las pantallas mantienen estados vacío, error, carga, éxito y permiso sin depender únicamente del color.
5. La navegación docente y el ingreso se entienden en móvil y escritorio.
6. `npm run verify` continúa pasando completo.

## Ajuste de navegación aprobado posteriormente

Durante la revisión visual se decidió que el panel docente debía sentirse como
una aplicación de trabajo y no como una página informativa. La navegación se
resuelve ahora mediante un menú lateral plegable: contiene las rutas activas,
las funciones futuras y el estado de la cuenta, mientras que el inicio muestra
solo el siguiente paso y un resumen breve. En móvil el menú se convierte en un
panel deslizable con cierre por botón, fondo atenuado y tecla Escape.
