# Fase 0 + Fase 1: scaffold y base segura — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el cimiento técnico de Ychayñan Lite que se puede escribir y verificar sin Docker ni un proyecto Supabase real: estructura del repositorio, migraciones SQL con sus invariantes y RLS (verificadas contra Postgres real vía PGlite), normalización de nombres, importador de nómina CSV con detección de codificación, capa de API docente para paralelos y estudiantes, y el enrutador con autenticación docente.

**Architecture:** SPA en React + TypeScript + Vite con `HashRouter`, Supabase (Postgres + Auth) como backend, sin Edge Functions todavía (llegan en Fase 2-3). Los módulos de dominio (normalización de nombres, importador CSV) son funciones puras sin dependencias de red, probadas con Vitest. La capa `src/lib/api` envuelve `@supabase/supabase-js` recibiendo el cliente por parámetro (inyección de dependencias) para poder probarla con un cliente simulado. Las migraciones SQL se verifican de extremo a extremo contra `@electric-sql/pglite` (Postgres real compilado a WebAssembly), incluyendo un esquema `auth` mínimo y los roles `anon`/`authenticated`, para comprobar constraints, triggers y RLS sin Docker.

**Tech Stack actual:** React 18, TypeScript 5, Vite 8, React Router 7 (HashRouter), React Hook Form 7 + `@hookform/resolvers`, Zod 3, `@supabase/supabase-js`, PapaParse, Vitest 4 + Testing Library, ESLint 9 (flat config) + Prettier 3, `@electric-sql/pglite` (solo como devDependency, para pruebas).

**Spec:** [`docs/superpowers/specs/2026-08-28-fase0-fase1-base-segura-design.md`](../specs/2026-08-28-fase0-fase1-base-segura-design.md) — que a su vez remite a `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md` v1.5, `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` v1.4 y `RUBRICA_DIAGNOSTICA_COMPLETA.md` v1.1 como autoridad completa del proyecto.

## Estado de ejecución del plan

A fecha de esta revisión, Tasks 1 a 9 del recorte local están implementadas y verificadas. Las correcciones posteriores añadieron la protección SQL de la ventana de entrega, el cierre de sesión para cuentas sin rol, la validación de nombres no vacíos y la importación CSV segura. Este cierre no equivale a completar las Fases 0 y 1 de la guía integral: siguen pendientes el proyecto Supabase real, las Edge Functions, los controles operativos de acceso y el ensayo de aula. La verificación completa debe ejecutarse antes de publicar.
## Global Constraints

- No introducir dependencias sin necesidad concreta (guía §5.1). Las añadidas en este plan y su justificación: `papaparse` (parseo CSV robusto ante comillas/comas internas), `@hookform/resolvers` (glue oficial entre React Hook Form y Zod, ya elegidos ambos), `@electric-sql/pglite` (solo dev, permite probar Postgres real sin Docker).
- Enrutamiento obligatorio con `HashRouter` (guía §7) — GitHub Pages no reescribe rutas de SPA.
- RLS obligatorio en toda tabla expuesta (guía §14); el rol `anon` no recibe acceso directo a `students`, `assessment_access`, `student_sessions`, `submissions`, `responses`, `ai_evaluations` (maestro §18, guía §14.1).
- No existen las tablas `teacher_profiles`, `rubric_versions` ni `audit_events` (guía §12, nota final): el único docente se identifica vía Supabase Auth con `app_metadata.role = teacher` y la rúbrica se congela como `rubric_snapshot` dentro de `assessments`.
- Límite de nombre completo: 160 caracteres (guía §16).
- Algoritmo de normalización de nombres exacto: guía §10 y maestro §7.3 (conserva `ñ` distinta de `n`; ignora tildes vocálicas y `ü`; convierte guion/apóstrofo en separador; elimina puntos y comas; exige coincidencia exacta, sin aproximación difusa).
- Detección de codificación del CSV de nómina: intentar UTF-8 estricto; si falla, decodificar como Windows-1252 (spec §"Decisiones de detalle").
- Nunca guardar secretos, nombres reales ni datos de estudiantes en el repositorio (guía §26).
- Si `npm run format:check` falla después de escribir un archivo nuevo, ejecutar `npx prettier --write <archivo>` antes de continuar.

---

## File Structure

```
.github/workflows/verify.yml
.github/workflows/deploy-pages.yml
.env.example
.gitignore
.prettierrc
.prettierignore
eslint.config.js
index.html
package.json
tsconfig.json
vite.config.ts
supabase/config.toml
supabase/seed.sql
supabase/migrations/20260828000001_schema.sql
supabase/migrations/20260828000002_rls.sql
supabase/migrations/20260828000003_hardening.sql
supabase/migrations/20260828000004_integrity_and_privileges.sql
supabase/migrations/20260828000005_freeze_questions_at_open.sql
supabase/migrations/20260828000006_default_privileges_and_updated_at.sql
supabase/migrations/20260828000007_submission_window_and_function_privileges.sql
supabase/migrations/20260828000008_nonblank_group_names.sql
src/main.tsx
src/app/App.tsx
src/app/App.test.tsx
src/app/router.tsx
src/components/common/PlaceholderScreen.tsx
src/features/auth/AuthContext.tsx
src/features/auth/AuthContext.test.tsx
src/features/auth/RequireAuth.tsx
src/features/auth/LoginForm.tsx
src/features/roster/parseRoster.ts
src/features/roster/parseRoster.test.ts
src/features/roster/ImportRosterPanel.tsx
src/features/roster/ImportRosterPanel.test.tsx
src/features/roster/ParalelosScreen.tsx
src/features/roster/ParalelosScreen.test.tsx
src/lib/supabase/client.ts
src/lib/supabase/client.test.ts
src/lib/validation/schemas.ts
src/lib/validation/schemas.test.ts
src/lib/validation/normalizeName.ts
src/lib/validation/normalizeName.test.ts
src/lib/api/groups.ts
src/lib/api/groups.test.ts
src/lib/api/students.ts
src/lib/api/students.test.ts
src/test/setup.ts
src/test/db/pgliteFixture.ts
src/test/db/migrations.test.ts
src/test/rubric.test.ts
rubric-v1.json
```

Carpetas que la guía técnica menciona (`components/student`, `components/teacher`, `features/assessments`, `features/submissions`, `features/evaluation`, `features/dashboard`, `features/export`, `supabase/functions/*`) no se crean todavía: quedan vacías hasta la fase que las necesite (Fase 2 en adelante). Crear carpetas vacías sin contenido no aporta nada verificable en este recorte.

---

### Task 1: Scaffold del proyecto y herramientas

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.env.example`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/test/setup.ts`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Produces: `App` (named export, `src/app/App.tsx`) — componente sin props que en este task solo renderiza un encabezado; Task 9 lo reescribe para montar `AuthProvider` + `AppRouter`.

- [x] **Step 1: Crear `package.json`**

```json
{
  "name": "ychaynan-lite",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify": "npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@supabase/supabase-js": "^2.45.4",
    "papaparse": "^5.4.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-router-dom": "^7.18.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@electric-sql/pglite": "^0.2.13",
    "@eslint/js": "^9.11.1",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/papaparse": "^5.3.14",
    "@types/react": "^18.3.9",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "6.1.1",
    "eslint": "^9.11.1",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.4.12",
    "jsdom": "^29.1.1",
    "prettier": "^3.3.3",
    "typescript": "^5.6.2",
    "typescript-eslint": "^8.7.0",
    "vite": "8.2.2",
    "vitest": "4.1.11"
  }
}
```

**Nota post-ejecución 2 (Task 8, ruling registrado en el ledger):** `jsdom@^25.0.1` (versión original de este plan) no implementa `File.prototype.arrayBuffer()`, necesario para probar la subida de archivos CSV en Task 8. Se confirmó de forma directa que jsdom 26, 27 y 28 tampoco lo tienen, y que jsdom 29.0.0 sí. Se probó primero `^30.0.1` (la última estable), pero requiere Node `^22.22.2` y este entorno tiene Node `22.14.0` (`npm install` lo advierte con `EBADENGINE`); se optó por `^29.1.1`, que sí tiene `arrayBuffer()` y declara compatibilidad con Node `^22.13.0` (satisfecho aquí sin advertencias). jsdom es una herramienta de pruebas que nunca se envía a producción, así que el riesgo habitual de un salto de versión mayor no aplica aquí de la misma forma que a una dependencia de la aplicación.

**Nota post-ejecución (ruling registrado en el ledger):** la combinación original `eslint@^9.11.1` + `eslint-plugin-react-hooks@^4.6.2` tiene un conflicto de peer dependency real — v4.6.2 exige `eslint@^8` como máximo. `eslint-plugin-react-hooks@^7.1.1` sí declara soporte para `eslint@^9`, y su export `configs.recommended.rules` tiene la misma forma que en v4 (verificado), así que `eslint.config.js` (Step 4) no necesita ningún cambio. `@testing-library/dom` es una peerDependency obligatoria de `@testing-library/react@16` que el brief original omitía; sin ella ningún test corre. Con estas dos correcciones, `npm install` (sin `--legacy-peer-deps`) debe instalar limpio.

- [x] **Step 2: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [x] **Step 3: Crear `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ychaynan-lite/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

- [x] **Step 4: Crear `eslint.config.js`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);
```

- [x] **Step 5: Crear `.prettierrc` y `.prettierignore`**

`.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

`.prettierignore`:
```
dist
coverage
node_modules
package-lock.json
docs/superpowers
.superpowers
DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md
GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md
RUBRICA_DIAGNOSTICA_COMPLETA.md
```

**Nota post-ejecución:** las últimas cuatro líneas se añadieron porque `prettier --check .` (dentro de `npm run verify`) recorre todo el repositorio por defecto, incluyendo `.superpowers/` (el espacio de trabajo de este mismo plan) y los documentos de autoridad del proyecto en la raíz, que está prohibido tocar o reformatear. `Base teórica.docx` y `Rubrica_Integral_360_Escritura.docx` no necesitan entrada porque Prettier ya ignora extensiones `.docx` sin configuración.

- [x] **Step 6: Crear `.gitignore`**

```
node_modules
dist
coverage
.env
.env.local
.env.*
!.env.example
*.local
supabase/.branches
supabase/.temp
exports/
resultados/
datos-locales/
logs/
*.csv
*.jsonl
*.sqlite
playwright-report/
test-results/
```

- [x] **Step 7: Crear `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_VERSION=0.1.0
VITE_ASSESSMENT_SLUG=diagnostico-2026
```

- [x] **Step 8: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ychayñan Lite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 9: Crear `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [x] **Step 10: Escribir la prueba que falla — `src/app/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the application name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Ychayñan Lite' })).toBeInTheDocument();
  });
});
```

- [x] **Step 11: Instalar dependencias y confirmar que la prueba falla**

Run: `npm install`
Run: `npx vitest run src/app/App.test.tsx`
Expected: FAIL — `src/app/App.tsx` todavía no existe.

- [x] **Step 12: Implementar `src/app/App.tsx` y `src/main.tsx`**

`src/app/App.tsx`:
```tsx
export function App() {
  return (
    <main>
      <h1>Ychayñan Lite</h1>
    </main>
  );
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [x] **Step 13: Confirmar que la prueba pasa y que la verificación completa corre**

Run: `npx vitest run src/app/App.test.tsx`
Expected: PASS

Run: `npm run verify`
Expected: lint, format:check, typecheck, test y build pasan (no hay más archivos que verificar todavía).

- [x] **Step 14: Inicializar el repositorio git y hacer el primer commit**

```bash
git init
git add package.json tsconfig.json vite.config.ts eslint.config.js .prettierrc .prettierignore .gitignore .env.example index.html src/main.tsx src/app/App.tsx src/app/App.test.tsx src/test/setup.ts
git commit -m "chore: scaffold del proyecto (Vite + React + TypeScript + Vitest)"
```

---

### Task 2: Flujos de CI

**Files:**
- Create: `.github/workflows/verify.yml`, `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: script `npm run verify` (Task 1).
- Produces: nada que otras tareas consuman; son archivos de configuración terminales.

- [x] **Step 1: Crear `.github/workflows/verify.yml`**

```yaml
name: Verify

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run verify
```

- [x] **Step 2: Crear `.github/workflows/deploy-pages.yml`**

```yaml
name: Deploy Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run verify
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [x] **Step 3: Validar la sintaxis YAML de ambos archivos**

Run: `npx -y js-yaml .github/workflows/verify.yml`
Expected: imprime el documento parseado sin error.

Run: `npx -y js-yaml .github/workflows/deploy-pages.yml`
Expected: imprime el documento parseado sin error.

Nota para quien ejecute esta tarea: estos flujos no se ejecutarán de verdad hasta que exista un repositorio remoto en GitHub con Pages habilitado; por ahora solo se valida su sintaxis.

- [x] **Step 4: Commit**

```bash
git add .github/workflows/verify.yml .github/workflows/deploy-pages.yml
git commit -m "ci: agregar flujos de verificación y despliegue a GitHub Pages"
```

---

### Task 3: Migraciones SQL, invariantes y RLS verificadas con PGlite

**Estado:** implementado y verificado. Las migraciones vigentes son la fuente de verdad; este plan no contiene SQL alternativo para copiar.

**Archivos:**

- supabase/migrations/20260828000001_schema.sql
- supabase/migrations/20260828000002_rls.sql
- supabase/migrations/20260828000003_hardening.sql
- supabase/migrations/20260828000004_integrity_and_privileges.sql
- src/test/db/pgliteFixture.ts
- src/test/db/migrations.test.ts

**Contrato implementado:**

- Diez tablas públicas, con RLS activado en todas.
- app_metadata.role = teacher como autorización; nunca user_metadata.
- authenticated recibe solo los privilegios SQL necesarios; anon no recibe privilegios sobre el esquema ni tablas públicas.
- Las políticas de fila limitan las operaciones del docente y dejan assessment_access, student_sessions y access_rate_limits en lectura para authenticated.
- Las respuestas entregadas son inmutables y no pueden eliminarse.
- Una evaluación enviada no puede editarse ni eliminarse cuando contiene una entrega.
- La rúbrica, lectura, consigna y configuración quedan congeladas al abrir la evaluación.
- Lite no admite reaperturas. La restricción de submissions permite únicamente in_progress y submitted; una nueva oportunidad requiere otra evaluación.
- La salida original y los metadatos de ejecución de una evaluación de IA quedan inmutables cuando pasa a completed, failed, reviewed o discarded. La revisión solo modifica campos docentes.
- Las ventanas de rate limit usan buckets de un minuto y unicidad por evaluación, fingerprint y ventana.
- La entrega final solo puede pasar a submitted si la evaluación está abierta y la hora actual está dentro de su ventana.
- Las funciones de dominio no son ejecutables por PUBLIC, anon ni authenticated salvo las autorizadas explícitamente.
- Las migraciones no publican políticas para anon. El fixture no concede permisos implícitos: prueba los grants declarados por las migraciones.

**Rúbrica operativa:**

- rubric-v1.json contiene la versión 1.1, los doce criterios centrales, M1 y M3 activos y los 27 códigos de observación.
- src/test/rubric.test.ts verifica identificadores, niveles, módulos y códigos antes de permitir el despliegue.

**Verificación:**

- npm test -- src/test/db/migrations.test.ts
- npm test -- src/test/rubric.test.ts
- npm run verify

La validación contra un proyecto Supabase real continúa siendo una puerta posterior: confirmar auth.users, privilegios Data API, claims de app_metadata, Edge Functions y configuración de GitHub Pages antes de publicar.
### Task 4: Esquemas de dominio con Zod

**Files:**
- Create: `src/lib/validation/schemas.ts`
- Test: `src/lib/validation/schemas.test.ts`

**Interfaces:**
- Produces: `groupSchema`, `createGroupInputSchema`, `studentSchema` (Zod schemas) y los tipos `Group`, `CreateGroupInput`, `Student` inferidos de ellos. Task 7 (`src/lib/api/groups.ts`, `src/lib/api/students.ts`) los consume.

- [x] **Step 1: Escribir la prueba que falla**

```ts
import { describe, expect, it } from 'vitest';
import { createGroupInputSchema, groupSchema, studentSchema } from './schemas';

describe('groupSchema', () => {
  it('acepta un paralelo válido', () => {
    const result = groupSchema.parse({
      id: '11111111-1111-1111-1111-111111111111',
      name: '3ro BGU A',
      schoolYear: '2026-2027',
      status: 'active',
    });
    expect(result.status).toBe('active');
  });

  it('rechaza un estado que no sea active o archived', () => {
    expect(() =>
      groupSchema.parse({
        id: '11111111-1111-1111-1111-111111111111',
        name: '3ro BGU A',
        schoolYear: '2026-2027',
        status: 'borrado',
      }),
    ).toThrow();
  });
});

describe('createGroupInputSchema', () => {
  it('rechaza un nombre vacío', () => {
    expect(() => createGroupInputSchema.parse({ name: '', schoolYear: '2026-2027' })).toThrow();
  });

  it('rechaza un nombre de más de 160 caracteres', () => {
    expect(() =>
      createGroupInputSchema.parse({ name: 'a'.repeat(161), schoolYear: '2026-2027' }),
    ).toThrow();
  });
});

describe('studentSchema', () => {
  it('acepta un estudiante válido con variantes autorizadas', () => {
    const result = studentSchema.parse({
      id: '11111111-1111-1111-1111-111111111111',
      groupId: '22222222-2222-2222-2222-222222222222',
      fullNameOriginal: 'María José Peña Ñacato',
      fullNameNormalized: 'maria jose peña ñacato',
      authorizedVariants: [],
      status: 'active',
    });
    expect(result.fullNameOriginal).toBe('María José Peña Ñacato');
  });
});
```

- [x] **Step 2: Confirmar que la prueba falla**

Run: `npx vitest run src/lib/validation/schemas.test.ts`
Expected: FAIL — el módulo `./schemas` no existe.

- [x] **Step 3: Implementar `src/lib/validation/schemas.ts`**

```ts
import { z } from 'zod';

export const groupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(160),
  schoolYear: z.string().min(4).max(9),
  status: z.enum(['active', 'archived']),
});
export type Group = z.infer<typeof groupSchema>;

export const createGroupInputSchema = z.object({
  name: z.string().min(1).max(160),
  schoolYear: z.string().min(4).max(9),
});
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;

export const studentSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  fullNameOriginal: z.string().min(1).max(160),
  fullNameNormalized: z.string().min(1).max(160),
  authorizedVariants: z.array(z.string()),
  status: z.enum(['active', 'inactive']),
});
export type Student = z.infer<typeof studentSchema>;
```

- [x] **Step 4: Confirmar que las pruebas pasan**

Run: `npx vitest run src/lib/validation/schemas.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/lib/validation/schemas.ts src/lib/validation/schemas.test.ts
git commit -m "feat: esquemas Zod de paralelo y estudiante"
```

---

### Task 5: Normalización de nombres

**Files:**
- Create: `src/lib/validation/normalizeName.ts`
- Test: `src/lib/validation/normalizeName.test.ts`

**Interfaces:**
- Produces: `normalizeName(rawName: string): string`, `namesMatch(candidate: string, registered: string): boolean`, `containsInvalidNameCharacters(rawName: string): boolean`. Task 6 (`parseRoster.ts`) consume las tres.

- [x] **Step 1: Escribir la prueba que falla**

```ts
import { describe, expect, it } from 'vitest';
import { containsInvalidNameCharacters, namesMatch, normalizeName } from './normalizeName';

describe('normalizeName', () => {
  it('reproduce los cuatro ejemplos de la guía técnica §10', () => {
    expect(normalizeName('María José Peña Ñacato')).toBe('maria jose peña ñacato');
    expect(normalizeName('MARIA JOSE PEÑA ÑACATO')).toBe('maria jose peña ñacato');
    expect(normalizeName('Maria José Peña Ñacato')).toBe('maria jose peña ñacato');
    expect(normalizeName('Maria Jose Pena Nacato')).toBe('maria jose pena nacato');
  });

  it('nunca convierte ñ en n ni infiere una ñ que no estaba en el original', () => {
    expect(normalizeName('Peña')).toBe('peña');
    expect(normalizeName('Pena')).toBe('pena');
    expect(normalizeName('Peña')).not.toBe(normalizeName('Pena'));
  });

  it('trata ü como u', () => {
    expect(normalizeName('Güemes')).toBe('guemes');
  });

  it('colapsa espacios repetidos y recorta los extremos', () => {
    expect(normalizeName('  JOSÉ   ANDRÉS  MUÑOZ  ')).toBe('jose andres muñoz');
  });

  it('convierte guiones y apóstrofos en separadores simples', () => {
    expect(normalizeName('Maria Fernanda  De-La-Cruz')).toBe('maria fernanda de la cruz');
    expect(normalizeName('Maria Fernanda De la Cruz')).toBe('maria fernanda de la cruz');
  });

  it('elimina puntos y comas que no cambian el nombre', () => {
    expect(normalizeName('J. Andrés Muñoz,')).toBe('j andres muñoz');
  });
});

describe('namesMatch', () => {
  it('coincide con diferencias de mayúsculas y tildes', () => {
    expect(namesMatch('JOSÉ  ANDRÉS MUÑOZ', 'José Andrés Muñoz')).toBe(true);
  });

  it('no hace coincidir Pena con Peña', () => {
    expect(namesMatch('Pena Ruiz', 'Peña Ruiz')).toBe(false);
  });
});

describe('containsInvalidNameCharacters', () => {
  it('detecta dígitos', () => {
    expect(containsInvalidNameCharacters('Ana2 Ruiz')).toBe(true);
  });

  it('acepta nombres sin dígitos ni caracteres de control', () => {
    expect(containsInvalidNameCharacters('María José Peña Ñacato')).toBe(false);
  });
});
```

- [x] **Step 2: Confirmar que la prueba falla**

Run: `npx vitest run src/lib/validation/normalizeName.test.ts`
Expected: FAIL — el módulo `./normalizeName` no existe.

- [x] **Step 3: Implementar `src/lib/validation/normalizeName.ts`**

```ts
const ACCENTED_VOWELS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
};

export function normalizeName(rawName: string): string {
  let value = rawName.normalize('NFC').trim();
  value = value.toLocaleLowerCase('es');
  value = value.replace(/[áéíóú]/g, (match) => ACCENTED_VOWELS[match] ?? match);
  value = value.replace(/ü/g, 'u');
  value = value.replace(/[-']/g, ' ');
  value = value.replace(/[.,]/g, '');
  value = value.replace(/\s+/g, ' ').trim();
  return value;
}

export function namesMatch(candidate: string, registered: string): boolean {
  return normalizeName(candidate) === normalizeName(registered);
}

export function containsInvalidNameCharacters(rawName: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[0-9\x00-\x1F\x7F]/.test(rawName);
}
```

- [x] **Step 4: Confirmar que las pruebas pasan**

Run: `npx vitest run src/lib/validation/normalizeName.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/lib/validation/normalizeName.ts src/lib/validation/normalizeName.test.ts
git commit -m "feat: normalizacion de nombres segun guia tecnica §10"
```

---

### Task 6: Importador de nómina CSV con detección de codificación

**Files:**
- Create: `src/features/roster/parseRoster.ts`
- Test: `src/features/roster/parseRoster.test.ts`

**Interfaces:**
- Consumes: `normalizeName`, `containsInvalidNameCharacters` (`src/lib/validation/normalizeName.ts`, Task 5).
- Produces: `decodeRosterCsv(bytes: Uint8Array, requestedEncoding?: RosterEncoding): { text: string; encodingUsed: RosterEncoding }`, `parseRosterCsv(text: string): RosterImportResult`, `importRosterFile(bytes: Uint8Array, requestedEncoding?: RosterEncoding): RosterImportResult`, y los tipos `RosterCsvRow`, `RosterImportResult`, `RosterRowStatus`. Tasks 8 y 9 (`ImportRosterPanel.tsx`, `ParalelosScreen.tsx`) consumen `importRosterFile` y los tipos.

- [x] **Step 1: Escribir la prueba que falla**

```ts
import { describe, expect, it } from 'vitest';
import { decodeRosterCsv, importRosterFile, parseRosterCsv } from './parseRoster';

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function windows1252Bytes(text: string): Uint8Array {
  return new Uint8Array(Buffer.from(text, 'latin1'));
}

describe('decodeRosterCsv', () => {
  it('decodifica un archivo UTF-8 válido como utf-8', () => {
    const result = decodeRosterCsv(utf8Bytes('nombres,apellidos\nMaría,Peña Ñacato\n'));
    expect(result.encodingUsed).toBe('utf-8');
    expect(result.text).toContain('María');
    expect(result.text).toContain('Ñacato');
  });

  it('usa windows-1252 cuando los bytes no son UTF-8 válido (CSV exportado desde Excel en Windows)', () => {
    const result = decodeRosterCsv(windows1252Bytes('nombres,apellidos\nMaría,Peña Ñacato\n'));
    expect(result.encodingUsed).toBe('windows-1252');
    expect(result.text).toContain('María');
    expect(result.text).toContain('Ñacato');
  });

  it('decodifica un archivo UTF-8 con BOM inicial y no deja el BOM en el texto', () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const body = utf8Bytes('nombres,apellidos\nMaría,Peña Ñacato\n');
    const bytesWithBom = new Uint8Array([...bom, ...body]);

    const result = decodeRosterCsv(bytesWithBom);

    expect(result.encodingUsed).toBe('utf-8');
    expect(result.text.startsWith('nombres,apellidos')).toBe(true);
    expect(result.text.charCodeAt(0)).not.toBe(0xfeff);
  });
});

describe('parseRosterCsv', () => {
  it('lanza un error si faltan las columnas requeridas', () => {
    expect(() => parseRosterCsv('nombre,apellido\nAna,Ruiz\n')).toThrow(/columnas requeridas/);
  });

  it('marca una fila válida y normaliza el nombre completo', () => {
    const result = parseRosterCsv('nombres,apellidos\nJosé Andrés,Muñoz\n');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[0].fullNameNormalized).toBe('jose andres muñoz');
  });

  it('marca como inválida una fila sin nombres o sin apellidos', () => {
    const result = parseRosterCsv('nombres,apellidos\n,Muñoz\n');
    expect(result.rows[0].status).toBe('invalid');
    expect(result.rows[0].issues[0]).toMatch(/Faltan/);
  });

  it('marca como duplicada la segunda fila con el mismo nombre normalizado', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n');
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[1].status).toBe('duplicate');
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidCount).toBe(0);
  });

  it('cuenta correctamente válidas, duplicadas e inválidas', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n,Sin Apellido\n');
    expect(result.validCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidCount).toBe(1);
  });
});

describe('importRosterFile', () => {
  it('combina decodificación y parseo de extremo a extremo para un archivo windows-1252', () => {
    const bytes = windows1252Bytes('nombres,apellidos\nMaría José,Peña Ñacato\n');
    const result = importRosterFile(bytes);
    expect(result.encodingUsed).toBe('windows-1252');
    expect(result.rows[0].fullNameNormalized).toBe('maria jose peña ñacato');
  });
});
```

- [x] **Step 2: Confirmar que la prueba falla**

Run: `npx vitest run src/features/roster/parseRoster.test.ts`
Expected: FAIL — el módulo `./parseRoster` no existe.

- [x] **Step 3: Implementar `src/features/roster/parseRoster.ts`**

```ts
import Papa from 'papaparse';
import { containsInvalidNameCharacters, normalizeName } from '../../lib/validation/normalizeName';

export type RosterRowStatus = 'valid' | 'duplicate' | 'invalid';

export interface RosterCsvRow {
  rowNumber: number;
  namesRaw: string;
  lastNamesRaw: string;
  authorizedVariantRaw: string | null;
  fullNameOriginal: string;
  fullNameNormalized: string;
  status: RosterRowStatus;
  issues: string[];
}

export interface RosterImportResult {
  encodingUsed: 'utf-8' | 'windows-1252';
  rows: RosterCsvRow[];
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

const REQUIRED_HEADERS = ['nombres', 'apellidos'];

export function decodeRosterCsv(
  bytes: Uint8Array,
): { text: string; encodingUsed: 'utf-8' | 'windows-1252' } {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text, encodingUsed: 'utf-8' };
  } catch {
    const text = new TextDecoder('windows-1252').decode(bytes);
    return { text, encodingUsed: 'windows-1252' };
  }
}

export function parseRosterCsv(text: string): RosterImportResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const headers = parsed.meta.fields ?? [];
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`El archivo no tiene las columnas requeridas: ${missingHeaders.join(', ')}`);
  }

  const seen = new Map<string, number>();
  const rows: RosterCsvRow[] = parsed.data.map((record, index) => {
    const rowNumber = index + 2;
    const namesRaw = (record.nombres ?? '').trim();
    const lastNamesRaw = (record.apellidos ?? '').trim();
    const authorizedVariantRaw = record.variante_autorizada?.trim() || null;
    const fullNameOriginal = `${namesRaw} ${lastNamesRaw}`.replace(/\s+/g, ' ').trim();
    const fullNameNormalized = normalizeName(fullNameOriginal);

    const issues: string[] = [];
    if (namesRaw === '' || lastNamesRaw === '') {
      issues.push('Faltan nombres o apellidos.');
    }
    if (containsInvalidNameCharacters(fullNameOriginal)) {
      issues.push('El nombre contiene dígitos o caracteres no válidos.');
    }

    let status: RosterRowStatus = issues.length > 0 ? 'invalid' : 'valid';

    if (status === 'valid') {
      const seenAtRow = seen.get(fullNameNormalized);
      if (seenAtRow !== undefined) {
        status = 'duplicate';
        issues.push(`Coincide con la fila ${seenAtRow}; revisa si es un duplicado accidental.`);
      } else {
        seen.set(fullNameNormalized, rowNumber);
      }
    }

    return {
      rowNumber,
      namesRaw,
      lastNamesRaw,
      authorizedVariantRaw,
      fullNameOriginal,
      fullNameNormalized,
      status,
      issues,
    };
  });

  return {
    encodingUsed: 'utf-8',
    rows,
    validCount: rows.filter((row) => row.status === 'valid').length,
    duplicateCount: rows.filter((row) => row.status === 'duplicate').length,
    invalidCount: rows.filter((row) => row.status === 'invalid').length,
  };
}

export function importRosterFile(bytes: Uint8Array, requestedEncoding?: RosterEncoding): RosterImportResult {
  const { text, encodingUsed } = decodeRosterCsv(bytes);
  const result = parseRosterCsv(text);
  return { ...result, encodingUsed };
}
```

- [x] **Step 4: Confirmar que las pruebas pasan**

Run: `npx vitest run src/features/roster/parseRoster.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/features/roster/parseRoster.ts src/features/roster/parseRoster.test.ts
git commit -m "feat: importador de nomina CSV con deteccion de codificacion"
```

---

### Task 7: Cliente Supabase y capa de API docente (paralelos y estudiantes)

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/api/groups.ts`, `src/lib/api/students.ts`
- Test: `src/lib/supabase/client.test.ts`, `src/lib/api/groups.test.ts`, `src/lib/api/students.test.ts`

**Interfaces:**
- Consumes: `groupSchema`, `studentSchema` (no se usa aquí, se valida en `groups.ts`), `CreateGroupInput`, `Group` (Task 4).
- Produces: `createSupabaseClient(url: string, anonKey: string): SupabaseClient`, `getSupabaseClient(): SupabaseClient` (`src/lib/supabase/client.ts`); `createGroup(client, input): Promise<Group>`, `listGroups(client): Promise<Group[]>` (`src/lib/api/groups.ts`); `bulkImportStudents(client, students: BulkImportStudentInput[]): Promise<{ inserted: number }>` (`src/lib/api/students.ts`). Tasks 8 y 9 consumen `getSupabaseClient`, `createGroup`, `listGroups` y `bulkImportStudents`.

- [x] **Step 1: Escribir la prueba que falla — `src/lib/supabase/client.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createSupabaseClient } from './client';

describe('createSupabaseClient', () => {
  it('lanza un error si falta la URL', () => {
    expect(() => createSupabaseClient('', 'anon-key')).toThrow(/obligatorias/);
  });

  it('lanza un error si falta la clave anónima', () => {
    expect(() => createSupabaseClient('https://example.supabase.co', '')).toThrow(/obligatorias/);
  });

  it('crea un cliente cuando ambos valores están presentes', () => {
    const client = createSupabaseClient('https://example.supabase.co', 'anon-key');
    expect(client).toBeTruthy();
  });
});
```

- [x] **Step 2: Confirmar que la prueba falla**

Run: `npx vitest run src/lib/supabase/client.test.ts`
Expected: FAIL — el módulo `./client` no existe.

- [x] **Step 3: Implementar `src/lib/supabase/client.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son obligatorias.');
  }
  return createClient(url, anonKey);
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
  }
  return cachedClient;
}
```

- [x] **Step 4: Confirmar que la prueba pasa**

Run: `npx vitest run src/lib/supabase/client.test.ts`
Expected: PASS

- [x] **Step 5: Escribir la prueba que falla — `src/lib/api/groups.test.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createGroup, listGroups } from './groups';

interface FakeClientOptions {
  single?: unknown;
  select?: unknown;
  error?: { message: string } | null;
}

function fakeClient(options: FakeClientOptions) {
  const error = options.error ?? null;
  const chain = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve({ data: options.select, error })),
    single: vi.fn(() => Promise.resolve({ data: options.single, error })),
  };
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('createGroup', () => {
  it('inserta un paralelo y devuelve el resultado ya validado', async () => {
    const client = fakeClient({
      single: {
        id: '11111111-1111-1111-1111-111111111111',
        name: '3ro BGU A',
        school_year: '2026-2027',
        status: 'active',
      },
    });

    const result = await createGroup(client, { name: '3ro BGU A', schoolYear: '2026-2027' });

    expect(result).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      name: '3ro BGU A',
      schoolYear: '2026-2027',
      status: 'active',
    });
  });

  it('lanza un mensaje seguro cuando la inserción falla', async () => {
    const client = fakeClient({ error: { message: 'duplicate key' } });
    await expect(
      createGroup(client, { name: '3ro BGU A', schoolYear: '2026-2027' }),
    ).rejects.toThrow(/No se pudo crear el paralelo/);
  });
});

describe('listGroups', () => {
  it('devuelve los paralelos ordenados por nombre', async () => {
    const client = fakeClient({
      select: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: '3ro BGU A',
          school_year: '2026-2027',
          status: 'active',
        },
      ],
    });

    const result = await listGroups(client);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('3ro BGU A');
  });
});
```

- [x] **Step 6: Confirmar que la prueba falla**

Run: `npx vitest run src/lib/api/groups.test.ts`
Expected: FAIL — el módulo `./groups` no existe.

- [x] **Step 7: Implementar `src/lib/api/groups.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { groupSchema, type CreateGroupInput, type Group } from '../validation/schemas';

export async function createGroup(client: SupabaseClient, input: CreateGroupInput): Promise<Group> {
  const { data, error } = await client
    .from('groups')
    .insert({ name: input.name, school_year: input.schoolYear })
    .select('id, name, school_year, status')
    .single();

  if (error) {
    throw new Error(`No se pudo crear el paralelo: ${error.message}`);
  }

  return groupSchema.parse({
    id: data.id,
    name: data.name,
    schoolYear: data.school_year,
    status: data.status,
  });
}

export async function listGroups(client: SupabaseClient): Promise<Group[]> {
  const { data, error } = await client
    .from('groups')
    .select('id, name, school_year, status')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los paralelos: ${error.message}`);
  }

  return (data ?? []).map((row: { id: string; name: string; school_year: string; status: string }) =>
    groupSchema.parse({
      id: row.id,
      name: row.name,
      schoolYear: row.school_year,
      status: row.status,
    }),
  );
}
```

- [x] **Step 8: Confirmar que la prueba pasa**

Run: `npx vitest run src/lib/api/groups.test.ts`
Expected: PASS

- [x] **Step 9: Escribir la prueba que falla — `src/lib/api/students.test.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { bulkImportStudents } from './students';

function fakeClient(options: { select?: unknown; error?: { message: string } | null }) {
  const error = options.error ?? null;
  const chain = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => Promise.resolve({ data: options.select, error })),
  };
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('bulkImportStudents', () => {
  it('no llama al cliente si la lista está vacía', async () => {
    const client = fakeClient({ select: [] });
    const result = await bulkImportStudents(client, []);
    expect(result).toEqual({ inserted: 0 });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('inserta las filas y devuelve la cantidad insertada', async () => {
    const client = fakeClient({ select: [{ id: '1' }, { id: '2' }] });

    const result = await bulkImportStudents(client, [
      { groupId: 'g1', fullNameOriginal: 'Ana Ruiz', fullNameNormalized: 'ana ruiz' },
      { groupId: 'g1', fullNameOriginal: 'José Muñoz', fullNameNormalized: 'jose muñoz' },
    ]);

    expect(result).toEqual({ inserted: 2 });
  });

  it('lanza un mensaje seguro cuando la inserción falla', async () => {
    const client = fakeClient({ error: { message: 'constraint violation' } });
    await expect(
      bulkImportStudents(client, [
        { groupId: 'g1', fullNameOriginal: 'Ana Ruiz', fullNameNormalized: 'ana ruiz' },
      ]),
    ).rejects.toThrow(/No se pudo importar la nómina/);
  });
});
```

- [x] **Step 10: Confirmar que la prueba falla**

Run: `npx vitest run src/lib/api/students.test.ts`
Expected: FAIL — el módulo `./students` no existe.

- [x] **Step 11: Implementar `src/lib/api/students.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface BulkImportStudentInput {
  groupId: string;
  fullNameOriginal: string;
  fullNameNormalized: string;
  authorizedVariant?: string | null;
}

export async function bulkImportStudents(
  client: SupabaseClient,
  students: BulkImportStudentInput[],
): Promise<{ inserted: number }> {
  if (students.length === 0) {
    return { inserted: 0 };
  }

  const rows = students.map((student) => ({
    group_id: student.groupId,
    full_name_original: student.fullNameOriginal,
    full_name_normalized: student.fullNameNormalized,
    authorized_variants: student.authorizedVariant ? [student.authorizedVariant] : [],
  }));

  const { data, error } = await client.from('students').insert(rows).select('id');

  if (error) {
    throw new Error(`No se pudo importar la nómina: ${error.message}`);
  }

  return { inserted: data?.length ?? 0 };
}
```

- [x] **Step 12: Confirmar que todas las pruebas de este task pasan**

Run: `npx vitest run src/lib/supabase/client.test.ts src/lib/api/groups.test.ts src/lib/api/students.test.ts`
Expected: PASS

- [x] **Step 13: Commit**

```bash
git add src/lib/supabase src/lib/api
git commit -m "feat: cliente Supabase y capa de API para paralelos y estudiantes"
```

---

### Task 8: UI de importación de nómina

**Files:**
- Create: `src/features/roster/ImportRosterPanel.tsx`, `src/features/roster/ParalelosScreen.tsx`
- Test: `src/features/roster/ImportRosterPanel.test.tsx`, `src/features/roster/ParalelosScreen.test.tsx`

**Interfaces:**
- Consumes: `importRosterFile`, `RosterImportResult` (Task 6); `getSupabaseClient` (Task 7, `src/lib/supabase/client.ts`); `createGroup`, `listGroups` (Task 7, `src/lib/api/groups.ts`); `bulkImportStudents` (Task 7, `src/lib/api/students.ts`); `Group` (Task 4).
- Produces: `ImportRosterPanel({ onConfirm }: { onConfirm: (result: RosterImportResult) => Promise<void> }): JSX.Element`; `ParalelosScreen(): JSX.Element`. Task 9 (`router.tsx`) monta `ParalelosScreen` en la ruta `/docente/paralelos`.

- [x] **Step 1: Escribir la prueba que falla — `src/features/roster/ImportRosterPanel.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportRosterPanel } from './ImportRosterPanel';

describe('ImportRosterPanel', () => {
  it('muestra una vista previa con problemas y confirma solo las filas válidas', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    render(<ImportRosterPanel onConfirm={onConfirm} />);

    const csv = 'nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n,Sin Nombre\n';
    const file = new File([csv], 'nomina.csv', { type: 'text/csv' });

    await userEvent.upload(screen.getByLabelText('Archivo CSV de la nómina'), file);

    expect(await screen.findByText(/Válidas: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Duplicadas: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Inválidas: 1/)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Step 2: Confirmar que la prueba falla**

Run: `npx vitest run src/features/roster/ImportRosterPanel.test.tsx`
Expected: FAIL — el módulo `./ImportRosterPanel` no existe.

- [x] **Step 3: Implementar `src/features/roster/ImportRosterPanel.tsx`**

```tsx
import { useState, type ChangeEvent } from 'react';
import { importRosterFile, type RosterImportResult } from './parseRoster';

export interface ImportRosterPanelProps {
  onConfirm: (result: RosterImportResult) => Promise<void>;
}

export function ImportRosterPanel({ onConfirm }: ImportRosterPanelProps) {
  const [result, setResult] = useState<RosterImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setResult(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setResult(importRosterFile(bytes));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'No se pudo leer el archivo.');
    }
  };

  const handleConfirm = async () => {
    if (!result) {
      return;
    }
    setConfirming(true);
    try {
      await onConfirm(result);
      setResult(null);
    } finally {
      setConfirming(false);
    }
  };

  const importableCount = result?.validCount ?? 0;

  return (
    <section aria-label="Importar nómina">
      <label htmlFor="roster-file">Archivo CSV de la nómina</label>
      <input id="roster-file" type="file" accept=".csv" onChange={handleFileChange} />

      {error && <p role="alert">{error}</p>}

      {result && (
        <div>
          <p>
            Codificación detectada: {result.encodingUsed}. Válidas: {result.validCount}. Duplicadas:{' '}
            {result.duplicateCount}. Inválidas: {result.invalidCount}.
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Fila</th>
                <th scope="col">Nombre original</th>
                <th scope="col">Nombre normalizado</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td>{row.rowNumber}</td>
                  <td>{row.fullNameOriginal}</td>
                  <td>{row.fullNameNormalized}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={handleConfirm} disabled={confirming || importableCount === 0}>
            Confirmar importación de {importableCount} estudiantes
          </button>
        </div>
      )}
    </section>
  );
}
```

- [x] **Step 4: Confirmar que la prueba pasa**

Run: `npx vitest run src/features/roster/ImportRosterPanel.test.tsx`
Expected: PASS

- [x] **Step 5: Escribir la prueba que falla — `src/features/roster/ParalelosScreen.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParalelosScreen } from './ParalelosScreen';
import * as groupsApi from '../../lib/api/groups';
import * as studentsApi from '../../lib/api/students';

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => ({}),
}));
vi.mock('../../lib/api/groups');
vi.mock('../../lib/api/students');

describe('ParalelosScreen', () => {
  beforeEach(() => {
    vi.mocked(groupsApi.listGroups).mockResolvedValue([]);
    vi.mocked(groupsApi.createGroup).mockResolvedValue({
      id: 'group-1',
      name: '3ro BGU A',
      schoolYear: '2026-2027',
      status: 'active',
    });
    vi.mocked(studentsApi.bulkImportStudents).mockResolvedValue({ inserted: 1 });
  });

  it('crea un paralelo, lo selecciona, importa una nómina y reporta cuántos estudiantes se insertaron', async () => {
    render(<ParalelosScreen />);

    await userEvent.type(screen.getByLabelText('Nombre del paralelo'), '3ro BGU A');
    await userEvent.type(screen.getByLabelText('Año lectivo'), '2026-2027');
    await userEvent.click(screen.getByRole('button', { name: 'Crear paralelo' }));

    expect(await screen.findByRole('option', { name: '3ro BGU A (2026-2027)' })).toBeInTheDocument();

    const csv = 'nombres,apellidos\nAna,Ruiz\n';
    const file = new File([csv], 'nomina.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('Archivo CSV de la nómina'), file);

    await userEvent.click(
      await screen.findByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    );

    expect(await screen.findByText('Se importaron 1 estudiantes.')).toBeInTheDocument();
    expect(studentsApi.bulkImportStudents).toHaveBeenCalledWith({}, [
      {
        groupId: 'group-1',
        fullNameOriginal: 'Ana Ruiz',
        fullNameNormalized: 'ana ruiz',
        authorizedVariant: null,
      },
    ]);
  });
});
```

- [x] **Step 6: Confirmar que la prueba falla**

Run: `npx vitest run src/features/roster/ParalelosScreen.test.tsx`
Expected: FAIL — el módulo `./ParalelosScreen` no existe.

- [x] **Step 7: Implementar `src/features/roster/ParalelosScreen.tsx`**

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { createGroup, listGroups } from '../../lib/api/groups';
import { bulkImportStudents } from '../../lib/api/students';
import { ImportRosterPanel } from './ImportRosterPanel';
import type { Group } from '../../lib/validation/schemas';
import type { RosterImportResult } from './parseRoster';

export function ParalelosScreen() {
  const client = getSupabaseClient();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupYear, setNewGroupYear] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    listGroups(client).then(setGroups);
  }, [client]);

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    const group = await createGroup(client, { name: newGroupName, schoolYear: newGroupYear });
    setGroups((current) => [...current, group]);
    setSelectedGroupId(group.id);
    setNewGroupName('');
    setNewGroupYear('');
  };

  const handleImportConfirm = async (result: RosterImportResult) => {
    if (!selectedGroupId) {
      setMessage('Selecciona un paralelo antes de importar.');
      return;
    }

    const importableRows = result.rows.filter(
      (row) => row.status === 'valid' || row.status === 'duplicate',
    );

    const { inserted } = await bulkImportStudents(
      client,
      importableRows.map((row) => ({
        groupId: selectedGroupId,
        fullNameOriginal: row.fullNameOriginal,
        fullNameNormalized: row.fullNameNormalized,
        authorizedVariant: row.authorizedVariantRaw,
      })),
    );

    setMessage(`Se importaron ${inserted} estudiantes.`);
  };

  return (
    <main>
      <h1>Paralelos y nómina</h1>

      <form onSubmit={handleCreateGroup} aria-label="Crear paralelo">
        <label htmlFor="group-name">Nombre del paralelo</label>
        <input
          id="group-name"
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          required
        />

        <label htmlFor="group-year">Año lectivo</label>
        <input
          id="group-year"
          value={newGroupYear}
          onChange={(event) => setNewGroupYear(event.target.value)}
          required
        />

        <button type="submit">Crear paralelo</button>
      </form>

      <label htmlFor="group-select">Paralelo activo para importar</label>
      <select
        id="group-select"
        value={selectedGroupId}
        onChange={(event) => setSelectedGroupId(event.target.value)}
      >
        <option value="">Selecciona un paralelo</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name} ({group.schoolYear})
          </option>
        ))}
      </select>

      {message && <p role="status">{message}</p>}

      <ImportRosterPanel onConfirm={handleImportConfirm} />
    </main>
  );
}
```

- [x] **Step 8: Confirmar que las pruebas de este task pasan**

Run: `npx vitest run src/features/roster/ImportRosterPanel.test.tsx src/features/roster/ParalelosScreen.test.tsx`
Expected: PASS

- [x] **Step 9: Commit**

```bash
git add src/features/roster/ImportRosterPanel.tsx src/features/roster/ImportRosterPanel.test.tsx src/features/roster/ParalelosScreen.tsx src/features/roster/ParalelosScreen.test.tsx
git commit -m "feat: pantalla de paralelos y nomina con vista previa de importacion"
```

---

### Task 9: Autenticación docente, enrutador y ensamblaje final de `App`

**Files:**
- Create: `src/features/auth/AuthContext.tsx`, `src/features/auth/RequireAuth.tsx`, `src/features/auth/LoginForm.tsx`, `src/components/common/PlaceholderScreen.tsx`, `src/app/router.tsx`
- Modify: `src/app/App.tsx`, `src/app/App.test.tsx`
- Test: `src/features/auth/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `getSupabaseClient` (Task 7); `ParalelosScreen` (Task 8).
- Produces: `AuthProvider({ client, children })`, `useAuth(): AuthContextValue` (`src/features/auth/AuthContext.tsx`); `RequireAuth({ children })` (`src/features/auth/RequireAuth.tsx`); `AppRouter(): JSX.Element` (`src/app/router.tsx`). Nada posterior en este recorte consume estos nombres; quedan listos para Fase 2.

- [x] **Step 1: Escribir la prueba que falla — `src/features/auth/AuthContext.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from './AuthContext';

function fakeSupabaseClient(options: {
  session?: { user: { id: string } } | null;
  signInError?: string | null;
}) {
  return {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: options.session ?? null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ error: options.signInError ? { message: options.signInError } : null }),
      ),
      signOut: vi.fn(() => Promise.resolve()),
    },
  } as unknown as SupabaseClient;
}

function Probe() {
  const { session, loading } = useAuth();
  if (loading) {
    return <p>cargando</p>;
  }
  return <p>{session ? 'con sesion' : 'sin sesion'}</p>;
}

describe('AuthProvider', () => {
  it('empieza cargando y luego expone que no hay sesión', async () => {
    const client = fakeSupabaseClient({ session: null });
    render(
      <AuthProvider client={client}>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByText('cargando')).toBeInTheDocument();
    expect(await screen.findByText('sin sesion')).toBeInTheDocument();
  });

  it('expone la sesión existente después de cargar', async () => {
    const client = fakeSupabaseClient({ session: { user: { id: 'u1' } } });
    render(
      <AuthProvider client={client}>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText('con sesion')).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Confirmar que la prueba falla**

Run: `npx vitest run src/features/auth/AuthContext.test.tsx`
Expected: FAIL — el módulo `./AuthContext` no existe.

- [x] **Step 3: Implementar `src/features/auth/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  client: SupabaseClient;
  children: ReactNode;
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [client]);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await client.auth.signInWithPassword({ email, password });
    return { error: error ? 'No pudimos iniciar sesión. Revisa tus datos.' : null };
  };

  const signOut = async () => {
    await client.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
```

- [x] **Step 4: Confirmar que la prueba pasa**

Run: `npx vitest run src/features/auth/AuthContext.test.tsx`
Expected: PASS

- [x] **Step 5: Implementar `src/features/auth/RequireAuth.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <p role="status">Cargando…</p>;
  }

  if (!session) {
    return <Navigate to="/docente/ingresar" replace />;
  }

  return <>{children}</>;
}
```

- [x] **Step 6: Implementar `src/features/auth/LoginForm.tsx`**

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from './AuthContext';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setFormError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Ingreso docente">
      <label htmlFor="email">Correo</label>
      <input id="email" type="email" {...register('email')} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <label htmlFor="password">Contraseña</label>
      <input id="password" type="password" {...register('password')} />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      {formError && <p role="alert">{formError}</p>}

      <button type="submit" disabled={isSubmitting}>
        Ingresar
      </button>
    </form>
  );
}
```

- [x] **Step 7: Implementar `src/components/common/PlaceholderScreen.tsx`**

```tsx
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <main>
      <h1>{title}</h1>
      <p>Esta pantalla se implementará en una fase posterior.</p>
    </main>
  );
}
```

- [x] **Step 8: Implementar `src/app/router.tsx`**

```tsx
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PlaceholderScreen } from '../components/common/PlaceholderScreen';
import { LoginForm } from '../features/auth/LoginForm';
import { RequireAuth } from '../features/auth/RequireAuth';
import { ParalelosScreen } from '../features/roster/ParalelosScreen';

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/evaluacion/:slug" element={<PlaceholderScreen title="Acceso a la evaluación" />} />
        <Route
          path="/evaluacion/:slug/responder"
          element={<PlaceholderScreen title="Responder evaluación" />}
        />
        <Route
          path="/evaluacion/:slug/entregada"
          element={<PlaceholderScreen title="Entrega recibida" />}
        />

        <Route path="/docente/ingresar" element={<LoginForm />} />
        <Route
          path="/docente"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Inicio docente" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/paralelos"
          element={
            <RequireAuth>
              <ParalelosScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/evaluacion"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Crear evaluación" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/accesos"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Distribuir accesos" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/respuestas"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Respuestas" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/respuestas/:submissionId"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Revisión de respuesta" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/diagnostico"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Resumen diagnóstico" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/exportar"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Exportar" />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/docente" replace />} />
      </Routes>
    </HashRouter>
  );
}
```

- [x] **Step 9: Actualizar `src/app/App.test.tsx` para reflejar el nuevo `App`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

const fakeAuthClient = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
};

vi.mock('../lib/supabase/client', () => ({
  getSupabaseClient: () => fakeAuthClient,
}));

describe('App', () => {
  it('redirige a una visitante sin sesión hacia el formulario de ingreso docente', async () => {
    render(<App />);
    expect(await screen.findByRole('form', { name: 'Ingreso docente' })).toBeInTheDocument();
  });
});
```

- [x] **Step 10: Confirmar que la prueba falla por el `App` viejo**

Run: `npx vitest run src/app/App.test.tsx`
Expected: FAIL — `App` todavía solo renderiza el encabezado estático.

- [x] **Step 11: Actualizar `src/app/App.tsx`**

```tsx
import { AuthProvider } from '../features/auth/AuthContext';
import { getSupabaseClient } from '../lib/supabase/client';
import { AppRouter } from './router';

export function App() {
  return (
    <AuthProvider client={getSupabaseClient()}>
      <AppRouter />
    </AuthProvider>
  );
}
```

- [x] **Step 12: Confirmar que la prueba pasa y correr la verificación completa**

Run: `npx vitest run src/app/App.test.tsx`
Expected: PASS

Run: `npm run verify`
Expected: lint, format:check, typecheck, test y build pasan sobre todo el proyecto de este recorte.

- [x] **Step 13: Confirmar visualmente en el navegador (verificación manual, no automatizada)**

1. Crear `.env.local` con `VITE_SUPABASE_URL=https://placeholder.supabase.co` y `VITE_SUPABASE_ANON_KEY=placeholder-key` (valores de relleno; no se hará ninguna llamada de red real todavía porque no hay pantalla que dispare login antes de esta comprobación visual).
2. Ejecutar `npm run dev`.
3. Abrir `http://localhost:5173/#/docente/paralelos` en el navegador: debe redirigir al formulario de ingreso docente (todavía no hay sesión).
4. Abrir `http://localhost:5173/#/docente/ingresar`: debe mostrarse el formulario con los campos de correo y contraseña.

Esta verificación confirma que el enrutador y la protección de rutas funcionan visualmente; no valida un login real porque eso requiere un proyecto Supabase con el docente ya creado, fuera del alcance de este recorte.

- [x] **Step 14: Commit**

```bash
git add src/features/auth src/components/common/PlaceholderScreen.tsx src/app/router.tsx src/app/App.tsx src/app/App.test.tsx
git commit -m "feat: autenticacion docente, enrutador con HashRouter y ensamblaje final de App"
```

---

## Qué queda deliberadamente fuera de este recorte

Todo lo que dependa de un proyecto Supabase real o de las Edge Functions (guía técnica Fase 2 en adelante): editor de lectura y preguntas, congelación de rúbrica, generación de códigos personales, sesión estudiantil, `save-draft`, `submit-assessment`, evaluación con IA, revisión docente, dashboard diagnóstico y exportación. También queda pendiente aplicar estas migraciones contra un proyecto Supabase real (`supabase db push`) y verificar RLS con el esquema `auth` completo de Supabase, no con el simulado en `pgliteFixture.ts`.
