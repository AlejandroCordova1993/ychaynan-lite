# Rediseño visual funcional de Yachayñan Lite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir la interfaz existente de Yachayñan Lite con un sistema visual editorial Human / System, sobrio, accesible y orientado a la operación docente.

**Architecture:** Se conserva React + Vite, las rutas, los contratos de Supabase y la división actual por componentes. La reconstrucción se concentra en tokens y CSS compartido, después en el cromo de layout y finalmente en las superficies de autenticación y nómina. Cada lote conserva las pruebas de comportamiento existentes y añade comprobaciones semánticas cuando el cambio lo exige.

**Tech Stack:** React 18, TypeScript, Vite, React Router 7, React Hook Form, Zod, CSS nativo por capas, Vitest, Testing Library, Prettier y ESLint.

**Spec:** `docs/superpowers/specs/2026-08-31-ychaynan-lite-visual-system-design.md`

## Global Constraints

- Mantener la autenticación, RLS, rutas, contratos de API y modelo de datos existentes.
- No introducir dependencias visuales nuevas ni un framework CSS.
- Usar exclusivamente el tema claro aprobado; no activar modo oscuro automático.
- Aplicar `Public Sans`, `Source Serif 4` y `DM Mono` con fallback local.
- WCAG 2.2 AA: foco visible, teclado, estados textuales y objetivos táctiles adecuados.
- No presentar como disponibles las fases aún no implementadas.
- Ejecutar `npm run verify` antes de considerar completo cada lote.

---

### Task 1: Tokens y base tipográfica

**Files:**
- Modify: `src/styles/app.css:12-180`
- Modify: `index.html` (precarga/importación de fuentes sin bloquear la primera pintura)
- Test: `src/app/App.test.tsx` (mantener montaje y agregar comprobación del shell base si cambia el selector)

**Interfaces:**
- Consumes: clases CSS existentes (`app`, `app-header`, `card`, `button`, `input`, `notice`).
- Produces: tokens `--surface-page`, `--brand`, `--brand-context`, `--brand-active`, `--signal`, `--font-sans`, `--font-serif`, `--font-mono`; tema claro estable.

- [ ] **Step 1: Write the failing test**

Añadir una comprobación de montaje que confirme que la aplicación mantiene una sola región `main` y que el shell conserva la clase `app` después del cambio de estilos.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/App.test.tsx`
Expected: la prueba nueva falla si el selector estructural todavía no está disponible.

- [ ] **Step 3: Write minimal implementation**

Reemplazar el bloque de tokens de `app.css` por los tokens de la especificación, retirar la media query `prefers-color-scheme: dark`, añadir las tres familias tipográficas y conservar las clases funcionales existentes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/app.css index.html src/app/App.test.tsx
git commit -m "style: establish editorial visual tokens"
```

### Task 2: Shell docente y autenticación visual

**Files:**
- Modify: `src/components/layout/TeacherLayout.tsx`
- Modify: `src/components/layout/AuthLayout.tsx`
- Modify: `src/components/layout/BrandLockup.tsx`
- Modify: `src/components/layout/BrandMark.tsx`
- Modify: `src/components/layout/PageHeader.tsx`
- Modify: `src/components/layout/Notice.tsx`
- Modify: `src/components/layout/LoadingScreen.tsx`
- Modify: `src/features/auth/LoginForm.tsx`
- Modify: `src/features/auth/ChangePasswordForm.tsx`
- Test: `src/features/auth/AuthContext.test.tsx`, `src/features/auth/RequireAuth.test.tsx`

**Interfaces:**
- Consumes: tokens y clases base de Task 1; callbacks actuales de `useAuth`.
- Produces: encabezado, pie, marca, avisos, carga y formularios con jerarquía editorial y estados accesibles sin cambiar navegación ni autenticación.

- [ ] **Step 1: Write the failing test**

Agregar pruebas de interacción para que el botón de cierre de sesión, el formulario de ingreso y el cambio de contraseña sigan exponiendo nombres accesibles y estados de envío.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/auth/AuthContext.test.tsx src/features/auth/RequireAuth.test.tsx`
Expected: la prueba nueva falla antes de ajustar los nombres o estados.

- [ ] **Step 3: Write minimal implementation**

Aplicar el cromo editorial: marca compacta, microetiquetas mono, divisores finos, acción primaria azul profundo, enlace secundario subrayado y avisos con texto/icono además del color. Eliminar adornos SVG que parezcan logotipo definitivo si no representan una identidad aprobada.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/auth/AuthContext.test.tsx src/features/auth/RequireAuth.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout src/features/auth
git commit -m "style: rebuild app shell and auth surfaces"
```

### Task 3: Inicio docente y estados de recorrido

**Files:**
- Modify: `src/features/auth/TeacherHomeScreen.tsx`
- Test: `src/features/auth/RequireAuth.test.tsx` (si se modifican textos o enlaces accesibles)

**Interfaces:**
- Consumes: `PageHeader`, botones y filas editoriales de Task 2.
- Produces: inicio docente que diferencia con claridad disponible, en construcción y siguiente acción sin cuadrícula de tarjetas genérica.

- [ ] **Step 1: Write the failing test**

Agregar una prueba que encuentre `Paralelos y nómina` como enlace disponible y las otras fases como estados no interactivos de construcción.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/auth/RequireAuth.test.tsx`
Expected: FAIL si la pantalla no expone los estados semánticos definidos.

- [ ] **Step 3: Write minimal implementation**

Cambiar `section-grid`/`section-card` por una lista editorial de filas con número mono, título, descripción y estado textual; mantener únicamente `/docente/paralelos` como enlace activo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/auth/RequireAuth.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/TeacherHomeScreen.tsx src/features/auth/RequireAuth.test.tsx
git commit -m "style: make teacher home editorial and explicit"
```

### Task 4: Paralelos e importación de nómina

**Files:**
- Modify: `src/features/roster/ParalelosScreen.tsx`
- Modify: `src/features/roster/ImportRosterPanel.tsx`
- Modify: `src/features/roster/parseRoster.ts` only if labels or validation semantics require a type-safe adjustment
- Test: `src/features/roster/ParalelosScreen.test.tsx`
- Test: `src/features/roster/ImportRosterPanel.test.tsx`

**Interfaces:**
- Consumes: tokens y componentes del shell.
- Produces: gestión de paralelos legible en escritorio/móvil, con formulario de CSV, confirmaciones y errores sin alterar las mutaciones actuales.

- [ ] **Step 1: Write the failing test**

Extender las pruebas existentes para comprobar que el formulario conserva etiquetas accesibles, muestra el estado de carga y distingue mensajes de éxito y error por texto.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/roster/ParalelosScreen.test.tsx src/features/roster/ImportRosterPanel.test.tsx`
Expected: FAIL en las aserciones nuevas.

- [ ] **Step 3: Write minimal implementation**

Aplicar filas y tabla responsiva, encabezado de sección con microetiqueta, campos rectos, botón azul profundo y paneles de estado con borde lateral/ícono. No usar tarjetas apiladas con sombras ni cambiar la lógica de Supabase o del parser.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/roster/ParalelosScreen.test.tsx src/features/roster/ImportRosterPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/roster
git commit -m "style: refine roster management surfaces"
```

### Task 5: Verificación visual, accesibilidad y documentación

**Files:**
- Modify: `src/styles/app.css` (ajustes finales de responsive, `prefers-reduced-motion` y contraste)
- Modify: `README.md` o `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md` (registrar que la fase visual fue aplicada)
- Test: todos los tests existentes

**Interfaces:**
- Consumes: todas las superficies rediseñadas.
- Produces: paquete visual coherente y verificado en viewport estrecho y amplio.

- [ ] **Step 1: Write the failing test**

Añadir una prueba de regresión que monte el shell con una vista de error y confirme que el mensaje es visible y no depende de una clase de color específica.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/ErrorBoundary.test.tsx`
Expected: FAIL antes de la aserción semántica final.

- [ ] **Step 3: Write minimal implementation**

Completar media queries de móvil, tabla con overflow controlado, reduced motion, estados disabled y reglas de contraste. Documentar la fase y sus límites funcionales.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run verify`
Expected: lint, format, typecheck, tests y build PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/app.css README.md ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md src
git commit -m "chore: verify and document visual redesign"
```

## Self-review checklist

- [ ] La especificación cubre paleta, tipografía, composición, accesibilidad, móvil y límites funcionales.
- [ ] El plan no agrega evaluación, IA ni dashboard antes de que existan sus circuitos.
- [ ] Ninguna tarea cambia Supabase, roles, rutas o autenticación.
- [ ] No quedan instrucciones vagas, nombres de funciones inventados ni placeholders.
- [ ] El gate final es `npm run verify`.

