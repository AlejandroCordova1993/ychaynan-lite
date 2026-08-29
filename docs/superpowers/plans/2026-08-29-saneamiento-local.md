# Saneamiento local de Ychayñan Lite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar la deuda técnica local identificada en la revisión y dejar una base verificable para implementar después el backend estudiantil.

**Architecture:** La ronda conserva React + Vite + Supabase como frontera del producto. Las optimizaciones de React serán cambios de comportamiento neutro; la validación de rúbrica se separará en una función pura que compara la fuente Markdown con `rubric-v1.json` sin enviar la fuente al navegador ni duplicar datos pedagógicos.

**Tech Stack:** React 18, TypeScript, Vite 8, React Router 7, Vitest 4, ESLint 9, Prettier 3, `@supabase/supabase-js`, PapaParse.

**Spec:** `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md` v1.5, `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` v1.4 y `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`.

## Global Constraints

- No exponer `service_role`, secretos de IA, pepper ni datos estudiantiles al frontend.
- Mantener `HashRouter` porque la publicación objetivo es GitHub Pages.
- Conservar la semántica de normalización: `ñ` permanece distinta de `n` y se ignoran tildes vocálicas.
- No convertir la rúbrica JSON en una fuente pedagógica independiente: la prueba debe detectar divergencias con la rúbrica Markdown.
- No incluir los dos DOCX fuente en un repositorio público sin una decisión explícita de licencia.
- Cada cambio de comportamiento debe seguir el ciclo TDD: prueba roja, implementación mínima, prueba verde y verificación completa.

---

### Task 1: Actualizar dependencias vulnerables sin cambiar el contrato de la aplicación

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `src/app/App.test.tsx`, `src/features/auth/RequireAuth.test.tsx`

**Interfaces:**
- Consume: imports actuales de `react-router-dom` (`HashRouter`, `Navigate`, `Route`, `Routes`).
- Produces: React Router 7 compatible, Vite 8 compatible y Vitest 4 compatible con Node 22.

- [ ] **Step 1: Registrar el baseline de dependencias y ejecutar las pruebas del contrato de rutas**

Run: `npm ls --depth=0` and `npm test -- src/app/App.test.tsx src/features/auth/RequireAuth.test.tsx`

Expected: React Router 6, Vite 5, Vitest 2 are present and the route tests pass.

- [ ] **Step 2: Actualizar únicamente las versiones que corrigen los avisos conocidos**

Run: `npm install react-router-dom@7.18.3` and `npm install --save-dev vite@8.2.2 @vitejs/plugin-react@6.1.1 vitest@4.1.11`

Expected: `package.json` and `package-lock.json` record the four requested versions; no unrelated package is upgraded intentionally.

- [ ] **Step 3: Ejecutar las pruebas de rutas y corregir solo incompatibilidades de API**

Run: `npm test -- src/app/App.test.tsx src/features/auth/RequireAuth.test.tsx`

Expected: PASS. If Router 7 requires a type-only or import adjustment, preserve the existing paths and `HashRouter` behavior.

- [ ] **Step 4: Confirmar auditoría de producción y herramientas**

Run: `npm audit --omit=dev --json` and `npm audit --json`

Expected: the Router production advisories are absent; any remaining advisory is documented with its dependency scope before continuing.

- [ ] **Step 5: Ejecutar la verificación completa**

Run: `npm run verify`

Expected: lint, format, typecheck, all tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/app src/features/auth
git commit -m "chore: actualizar dependencias de frontend"
```

---

### Task 2: Eliminar las dos advertencias de React Doctor con pruebas de comportamiento

**Files:**
- Modify: `src/features/roster/ImportRosterPanel.tsx`
- Modify: `src/features/roster/ImportRosterPanel.test.tsx`
- Modify: `src/features/roster/parseRoster.ts`
- Modify: `src/features/roster/parseRoster.test.ts`

**Interfaces:**
- Consume: `importRosterFile`, `RosterCsvRow` y la vista de previsualización existentes.
- Produces: `summarizeRosterRows(rows)` que devuelve `{ validCount, duplicateCount, invalidCount }`; `ImportRosterPanel` conserva los bytes del archivo sin suscribirse a estado que solo usan los manejadores.

- [ ] **Step 1: Escribir una prueba roja para el resumen de filas**

Add to `src/features/roster/parseRoster.test.ts`:

```ts
it('resume estados de filas en una sola pasada', () => {
  expect(
    summarizeRosterRows([
      { status: 'valid' },
      { status: 'duplicate' },
      { status: 'invalid' },
      { status: 'valid' },
    ]),
  ).toEqual({ validCount: 2, duplicateCount: 1, invalidCount: 1 });
});
```

Import `summarizeRosterRows` and the minimal row-status type from `parseRoster.ts`.

- [ ] **Step 2: Ejecutar la prueba para confirmar que falla por función inexistente**

Run: `npm test -- src/features/roster/parseRoster.test.ts`

Expected: FAIL because `summarizeRosterRows` is not exported yet.

- [ ] **Step 3: Implementar el resumen en una sola iteración**

Implement `summarizeRosterRows` with a `for...of` loop over `Array<Pick<RosterCsvRow, 'status'>>`; increment only the matching counter and return the three counters. Replace the three chained `filter(...).length` expressions in `parseRosterCsv` with this helper.

- [ ] **Step 4: Mover los bytes del archivo a una referencia mutable y probar recodificación**

Change `ImportRosterPanel` from `useState<Uint8Array | null>` to `useRef<Uint8Array | null>`. Add a test that uploads UTF-8 data, switches to Windows-1252, then back to UTF-8 and verifies the displayed original name is restored. The visible result must remain state; only the non-rendered bytes move to the ref.

- [ ] **Step 5: Ejecutar pruebas de roster y comprobar React Doctor**

Run: `npm test -- src/features/roster/parseRoster.test.ts src/features/roster/ImportRosterPanel.test.tsx` and `npx react-doctor@latest --verbose --scope changed`

Expected: tests pass and both previous warnings are absent or demonstrably unrelated to the changed files.

- [ ] **Step 6: Commit**

```bash
git add src/features/roster/parseRoster.ts src/features/roster/parseRoster.test.ts src/features/roster/ImportRosterPanel.tsx src/features/roster/ImportRosterPanel.test.tsx
git commit -m "perf: sanear importador de nomina"
```

---

### Task 3: Verificar que la rúbrica operativa coincide con su fuente humana

**Files:**
- Create: `src/lib/rubric/parseRubricSource.ts`
- Create: `src/lib/rubric/parseRubricSource.test.ts`
- Modify: `src/test/rubric.test.ts`
- Test: `RUBRICA_DIAGNOSTICA_COMPLETA.md`, `rubric-v1.json`

**Interfaces:**
- Produces: `parseRubricSource(markdown)` returning `{ criterionIds, observationCodes }` in document order.
- Consumes: labels `**Identificador:** \`...\`` and the first column of the observation table in the human rubric.

- [ ] **Step 1: Escribir una prueba roja del parser Markdown**

Add a test with a small Markdown fixture containing two identifiers and two observation rows; assert the returned arrays preserve order and ignore table headers.

- [ ] **Step 2: Ejecutar la prueba y confirmar que falla por módulo inexistente**

Run: `npm test -- src/lib/rubric/parseRubricSource.test.ts`

Expected: FAIL because `parseRubricSource` does not exist.

- [ ] **Step 3: Implementar el parser puro mínimo**

Use global regular expressions anchored to the exact Markdown markers. Trim values, discard empty matches, and return only identifiers and observation codes. Do not infer labels, descriptors or pedagogical equivalence from prose.

- [ ] **Step 4: Escribir la prueba de integración contra los archivos reales**

Read `RUBRICA_DIAGNOSTICA_COMPLETA.md` from the repository root in the test, parse it, and assert:

```ts
expect(source.criterionIds).toEqual([
  ...rubric.coreCriteria.map(({ id }) => id),
  ...rubric.optionalModules.map(({ id }) => id),
]);
expect(source.observationCodes).toEqual(rubric.observationCodes);
```

Keep the existing structural checks for version, active modules and four descriptor levels.

- [ ] **Step 5: Ejecutar la prueba y la verificación completa**

Run: `npm test -- src/lib/rubric/parseRubricSource.test.ts src/test/rubric.test.ts` and `npm run verify`

Expected: the source and JSON match in identifiers and observation-code order; all project checks pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rubric src/test/rubric.test.ts
git commit -m "test: comparar rubrica operativa con su fuente"
```

---

### Task 4: Evitar la publicación accidental de fuentes DOCX

**Files:**
- Modify: `.gitignore`
- Test: `git status --short`, `git check-ignore -v "Base teórica.docx" "Rubrica_Integral_360_Escritura.docx"`

- [ ] **Step 1: Añadir los dos nombres exactos a `.gitignore`**

Add entries for the two local source documents. Do not ignore all DOCX files globally because a future export or documentation artifact may need tracking deliberately.

- [ ] **Step 2: Confirmar que Git los ignora y que los archivos no se eliminan**

Run: `git check-ignore -v "Base teórica.docx" "Rubrica_Integral_360_Escritura.docx"` and `Test-Path` for both paths.

Expected: both paths are ignored and both files still exist locally.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: proteger documentos fuente locales"
```

---

### Task 5: Validación final del recorte

**Files:**
- Test: entire repository
- Modify: `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`

- [ ] **Step 1: Ejecutar la puerta completa**

Run: `npm run verify`

Expected: lint, Prettier, TypeScript, all tests and Vite build pass with exit code 0.

- [ ] **Step 2: Ejecutar React Doctor sobre todo el frontend**

Run: `npx react-doctor@latest --verbose`

Expected: no regression from the baseline score of 85/100; any remaining finding is recorded as low priority with file and reason.

- [ ] **Step 3: Actualizar el estado operativo**

Record the exact test count, dependency audit result, React Doctor score and remaining external blockers in `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`.

- [ ] **Step 4: Commit**

```bash
git add ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md
git commit -m "docs: actualizar estado tras saneamiento local"
```
