# Cierre seguro previo a la Fase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sanear dependencias, esquema PostgreSQL, contratos técnicos y estado operativo antes de construir el circuito estudiantil.

**Architecture:** Se conserva la SPA React estática y el modelo de exactamente diez tablas. Una novena migración acumulativa añade concurrencia optimista para borradores, índices de claves foráneas y `search_path` fijo; la sexta Edge Function queda especificada, no implementada, para el siguiente corte vertical. Toda mutación remota queda detrás de una comprobación explícita del proyecto Ychayñan Lite y de una ejecución `--dry-run`.

**Tech Stack:** React 18, TypeScript 5.6, Vite 8.2.2, Vitest 4.1.11, PGlite, PostgreSQL 17, Supabase CLI 2.116.0 y `@supabase/supabase-js` 2.112.4.

**Spec:** `docs/superpowers/specs/2026-08-30-cierre-seguro-pre-fase2-design.md`

## Global Constraints

- Mantener exactamente diez tablas; no crear `audit_events` ni una bitácora general en este recorte.
- No editar las ocho migraciones ya aplicadas; todo cambio de esquema va en una novena migración creada por Supabase CLI.
- `submissions.draft_version` representa la versión del borrador completo de una entrega, no una versión independiente por pregunta.
- Mantener `supabase/config.toml` como configuración local con `site_url = "http://localhost:5173"`.
- No exponer ni registrar contraseñas, tokens, `service_role`, claves de IA, `ACCESS_CODE_PEPPER` o datos estudiantiles.
- No usar el proyecto Ecuafuturo. Antes de una operación remota, el listado y el vínculo deben identificar `ychaynan-lite` con `project_ref` `qwqugnbmncrwcemxwutc`.
- No implementar todavía Edge Functions, sesión estudiantil, IA, dashboard ni exportación.
- Cada cambio de comportamiento de base de datos seguirá TDD: prueba roja observada, migración mínima y prueba verde.
- No declarar una comprobación dinámica como vigente sin ejecutarla en el commit que se documenta.

## Execution Setup

- La ejecución delegada requiere un worktree aislado y una rama `codex/cierre-seguro-pre-fase2`; no implementar en `master` sin consentimiento explícito.
- Antes de Task 1, aplicar `superpowers:using-git-worktrees`: comprobar `git rev-parse --git-dir`, `git rev-parse --git-common-dir` y `git rev-parse --show-superproject-working-tree`. Si es un checkout normal, verificar `git check-ignore -q .worktrees`; si no está ignorado, añadir exactamente `.worktrees/` a `.gitignore` y versionar ese cambio antes de crear el worktree.
- Después del consentimiento, crear y entrar al espacio aislado con:

```powershell
git worktree add '.worktrees/cierre-seguro-pre-fase2' -b 'codex/cierre-seguro-pre-fase2'
Set-Location '.worktrees/cierre-seguro-pre-fase2'
git branch --show-current
git rev-parse --git-dir
git rev-parse --git-common-dir
```

Expected: la rama mostrada es `codex/cierre-seguro-pre-fase2` y `GIT_DIR` difiere de `GIT_COMMON`; solo entonces preparar dependencias, ejecutar la línea base y crear el workspace SDD.
- El controlador ejecuta los scripts SDD con `C:\Program Files\Git\bin\bash.exe`, disponible aunque `bash` no esté en `PATH`.
- Al iniciar, crear el workspace y el ledger con:

```powershell
$planFile = 'docs/superpowers/plans/2026-08-30-cierre-seguro-pre-fase2.md'
$sddScripts = 'C:/Users/User/.codex/plugins/cache/openai-curated-remote/superpowers/6.3.0/skills/subagent-driven-development/scripts'
& 'C:\Program Files\Git\bin\bash.exe' "$sddScripts/sdd-workspace" $planFile
```

El primer renglón de `.superpowers/sdd/2026-08-30-cierre-seguro-pre-fase2/progress.md` será:

```markdown
# SDD ledger — plan: docs/superpowers/plans/2026-08-30-cierre-seguro-pre-fase2.md
```

- Antes de cada Task N, generar su brief con `task-brief`; antes de cada revisión, generar el paquete con `review-package PLAN_FILE BASE HEAD`. Los reportes viven en el mismo workspace y se llaman `task-N-report.md`.
- Registrar en el ledger el resultado de la revisión, cada fix round y cada `Ruling:`. Estos artefactos son ignorados por Git mediante `.superpowers/sdd/.gitignore`.

---

### Task 1: Fijar las dependencias Supabase reproducibles

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `src/lib/supabase/client.test.ts`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `createClient` de `@supabase/supabase-js` y los scripts npm existentes.
- Produces: `@supabase/supabase-js` exactamente `2.112.4` y la CLI `supabase` exactamente `2.116.0` disponible mediante `npx supabase` sin descarga oportunista.

- [ ] **Step 1: Capturar la línea base sin modificar dependencias**

Run:

```powershell
node --version
npm --version
npm ls @supabase/supabase-js supabase --depth=0
npx supabase --version
```

Expected: Node `v22.14.0`, npm `10.9.2`, `@supabase/supabase-js@2.112.4` y CLI `2.116.0`; `supabase` todavía no figura como dependencia local.

- [ ] **Step 2: Fijar solo los dos paquetes Supabase**

Run:

```powershell
npm install --save-exact @supabase/supabase-js@2.112.4
npm install --save-dev --save-exact supabase@2.116.0
```

Expected: `package.json` contiene `"@supabase/supabase-js": "2.112.4"` y `"supabase": "2.116.0"`; npm regenera el lockfile sin editarlo manualmente.

- [ ] **Step 3: Comprobar que la instalación no alteró contratos de frontend**

Run:

```powershell
npm ls @supabase/supabase-js supabase --depth=0
npx supabase --version
npx vitest run src/lib/supabase/client.test.ts src/app/App.test.tsx
npm audit --omit=dev
npm audit
```

Expected: ambas versiones son exactas, las pruebas focalizadas pasan y las dos auditorías terminan sin vulnerabilidades conocidas.

- [ ] **Step 4: Revisar el diff para descartar actualizaciones ajenas**

Run:

```powershell
git diff -- package.json package-lock.json
git diff --check
```

Expected: solo cambia el rango de `supabase-js`, se añade la CLI y aparecen sus dependencias transitivas necesarias; no cambian React, Router, Vite ni Vitest.

- [ ] **Step 5: Commit**

```powershell
git add -- package.json package-lock.json
git commit -m "chore: fijar dependencias de Supabase"
```

---

### Task 2: Crear y probar la migración acumulativa de saneamiento

**Files:**
- Modify: `src/test/db/migrations.test.ts`
- Create: `supabase/migrations/*_secure_pre_phase2_foundation.sql` mediante la CLI
- Test: `src/test/db/migrations-source.test.ts`

**Interfaces:**
- Consumes: `createTestDatabase()` que aplica todos los SQL ordenados desde una base PGlite vacía.
- Produces: `submissions.draft_version integer not null default 0`; cuatro índices de una columna; diez funciones sin argumentos con `search_path=pg_catalog, public`.

- [ ] **Step 1: Escribir las pruebas rojas del versionado de borrador**

Agregar a `src/test/db/migrations.test.ts` un bloque `describe('saneamiento previo a fase 2', ...)` con este comportamiento:

```ts
it('versiona el borrador completo de una entrega desde cero y rechaza negativos', async () => {
  const groupId = await insertGroup();
  const studentId = await insertStudent(groupId);
  const assessmentId = await insertAssessment();

  const inserted = await db.query<{ id: string; draft_version: number }>(
    `insert into public.submissions (assessment_id, student_id, client_submission_key)
     values ($1, $2, 'draft-version') returning id, draft_version`,
    [assessmentId, studentId],
  );
  expect(inserted.rows[0].draft_version).toBe(0);

  const updated = await db.query<{ draft_version: number }>(
    `update public.submissions
        set draft_version = draft_version + 1
      where id = $1 returning draft_version`,
    [inserted.rows[0].id],
  );
  expect(updated.rows[0].draft_version).toBe(1);

  await expect(
    db.query(`update public.submissions set draft_version = -1 where id = $1`, [
      inserted.rows[0].id,
    ]),
  ).rejects.toThrow(/submissions_draft_version_non_negative/);
});
```

- [ ] **Step 2: Escribir las pruebas rojas de índices y `search_path`**

Agregar esta prueba de catálogo para los índices:

```ts
it('indexa las claves foráneas usadas por accesos, sesiones, entregas y respuestas', async () => {
  const result = await db.query<{ table_name: string; columns: string[] }>(
    `select table_relation.relname as table_name,
            array_agg(column_attribute.attname order by indexed_column.ordinality)::text[] as columns
       from pg_catalog.pg_index index_definition
       join pg_catalog.pg_class table_relation
         on table_relation.oid = index_definition.indrelid
       join pg_catalog.pg_namespace table_namespace
         on table_namespace.oid = table_relation.relnamespace
       cross join lateral unnest(index_definition.indkey)
         with ordinality as indexed_column(attnum, ordinality)
       join pg_catalog.pg_attribute column_attribute
         on column_attribute.attrelid = table_relation.oid
        and column_attribute.attnum = indexed_column.attnum
      where table_namespace.nspname = 'public'
      group by table_relation.relname, index_definition.indexrelid`,
  );

  for (const expectedIndex of [
    { table_name: 'assessment_access', columns: ['student_id'] },
    { table_name: 'student_sessions', columns: ['assessment_access_id'] },
    { table_name: 'submissions', columns: ['student_id'] },
    { table_name: 'responses', columns: ['question_id'] },
  ]) {
    expect(result.rows).toContainEqual(expectedIndex);
  }
});
```

Agregar esta prueba completa de `search_path`:

```ts
it('fija un search_path seguro en todas las funciones del dominio', async () => {
  const result = await db.query<{ proname: string; proconfig: string[] | null }>(
    `select procedure.proname, procedure.proconfig
       from pg_catalog.pg_proc procedure
       join pg_catalog.pg_namespace namespace
         on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and pg_catalog.pg_get_function_identity_arguments(procedure.oid) = ''`,
  );
  const configByName = new Map(result.rows.map((row) => [row.proname, row.proconfig]));

  for (const functionName of [
    'is_teacher',
    'prevent_response_edit_after_submit',
    'prevent_assessment_content_change_after_submission',
    'prevent_question_change_after_submission',
    'prevent_failed_to_reviewed',
    'require_reviewer_on_review',
    'validate_response_question_assessment',
    'prevent_ai_original_output_edit',
    'set_updated_at',
    'guard_submission_window',
  ]) {
    expect(configByName.get(functionName)).toContain('search_path=pg_catalog, public');
  }
});
```

No probar nombres de índices: probar tabla y columnas para que la prueba mida comportamiento estructural.

- [ ] **Step 3: Ejecutar RED y comprobar la causa**

Run:

```powershell
npx vitest run src/test/db/migrations.test.ts src/test/db/migrations-source.test.ts
```

Expected: fallan las tres pruebas nuevas por causas identificables: columna ausente, entradas de índice ausentes y `proconfig` ausente o distinto. No usar el conteo total como criterio de RED.

- [ ] **Step 4: Crear la migración vacía con la CLI**

Run:

```powershell
npx supabase migration new secure_pre_phase2_foundation
Get-ChildItem supabase/migrations/*_secure_pre_phase2_foundation.sql | Sort-Object Name
```

Expected: la CLI crea exactamente un archivo nuevo con timestamp; usar el nombre generado y no renombrarlo manualmente.

- [ ] **Step 5: Implementar el SQL mínimo**

Escribir en el archivo generado:

```sql
alter table public.submissions
  add column draft_version integer not null default 0
  constraint submissions_draft_version_non_negative
  check (draft_version >= 0);

create index if not exists assessment_access_student_id_idx
  on public.assessment_access (student_id);
create index if not exists student_sessions_assessment_access_id_idx
  on public.student_sessions (assessment_access_id);
create index if not exists submissions_student_id_idx
  on public.submissions (student_id);
create index if not exists responses_question_id_idx
  on public.responses (question_id);

alter function public.is_teacher() set search_path to pg_catalog, public;
alter function public.prevent_response_edit_after_submit() set search_path to pg_catalog, public;
alter function public.prevent_assessment_content_change_after_submission() set search_path to pg_catalog, public;
alter function public.prevent_question_change_after_submission() set search_path to pg_catalog, public;
alter function public.prevent_failed_to_reviewed() set search_path to pg_catalog, public;
alter function public.require_reviewer_on_review() set search_path to pg_catalog, public;
alter function public.validate_response_question_assessment() set search_path to pg_catalog, public;
alter function public.prevent_ai_original_output_edit() set search_path to pg_catalog, public;
alter function public.set_updated_at() set search_path to pg_catalog, public;
alter function public.guard_submission_window() set search_path to pg_catalog, public;
```

No añadir `auth` al `search_path`: las llamadas existentes a `auth.jwt()` y `auth.uid()` ya están calificadas por esquema.

- [ ] **Step 6: Ejecutar GREEN y regresiones de seguridad**

Run:

```powershell
npx vitest run src/test/db/migrations.test.ts src/test/db/migrations-source.test.ts
npm run verify
```

Expected: todas las pruebas focalizadas y la puerta completa pasan; las pruebas de RLS y privilegios anónimos permanecen verdes.

- [ ] **Step 7: Commit**

```powershell
git add -- src/test/db/migrations.test.ts supabase/migrations
git commit -m "fix: sanear borradores indices y funciones SQL"
```

---

### Task 3: Alinear los contratos maestros y documentar la operación segura

**Files:**
- Modify: `README.md`
- Modify: `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md`
- Modify: `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`
- Create: `docs/OPERACION_SUPABASE_YCHAYNAN_LITE.md`

**Interfaces:**
- Consumes: el modelo de diez tablas, `draft_version` de Task 2, GitHub Pages existente y el proyecto remoto identificado en Global Constraints.
- Produces: contrato documental de seis Edge Functions y un runbook que separa configuración local, conexión remota, despliegue y smoke tests.

- [ ] **Step 1: Corregir el estado introductorio del README**

Reemplazar la afirmación de que Supabase y Pages no existen por estos hechos:

- GitHub Pages está publicado en `https://alejandrocordova1993.github.io/ychaynan-lite/`;
- existe un proyecto Supabase separado y la CLI debe confirmar nombre + `project_ref` antes de usarlo;
- la aplicación sigue sin ser utilizable con estudiantes porque faltan seis Edge Functions y el circuito diagnóstico;
- `.env.local` usa valores públicos del proyecto confirmado y permanece ignorado;
- `supabase/config.toml` configura el stack local; la `SITE_URL` productiva se administra en Supabase Auth remoto.

Mantener la explicación de `HashRouter`, `/ychaynan-lite/`, RLS y rol docente.

- [ ] **Step 2: Corregir modelo y contratos en ambos documentos maestros**

En `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` y `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`:

1. Añadir `submissions.draft_version integer not null default 0` y `CHECK (draft_version >= 0)`.
2. Definir que `save-draft` recibe `expectedDraftVersion`, actualiza solo cuando coincide, incrementa uno al éxito y devuelve conflicto sin sobrescribir cuando no coincide.
3. Cambiar todas las referencias de “cinco Edge Functions” a “seis Edge Functions”.
4. Añadir `manage-assessment-access` antes de `validate-student`, con acciones `open`, `regenerate`, `unblock`, JWT docente, códigos aleatorios de ocho caracteres, HMAC con `ACCESS_CODE_PEPPER`, persistencia solo del hash y devolución en claro una sola vez.
5. Declarar que `open` usa una operación SQL transaccional `security invoker` invocable solo por `service_role`; `PUBLIC`, `anon` y `authenticated` no reciben `EXECUTE`.
6. Mantener exactamente diez tablas y declarar explícitamente que esta versión no conserva una bitácora general de eventos.
7. Asignar el conflicto optimista y la implementación de `manage-assessment-access` al siguiente corte vertical; este saneamiento solo deja esquema y contratos coherentes.

- [ ] **Step 3: Crear el runbook de Supabase**

Crear `docs/OPERACION_SUPABASE_YCHAYNAN_LITE.md` con estas secciones y comandos exactos:

```markdown
# Operación segura de Supabase para Ychayñan Lite

## Identidad del proyecto
- Nombre esperado: `ychaynan-lite`
- Project ref esperado: `qwqugnbmncrwcemxwutc`
- Nunca usar `edicionesecuafuturo Project` para esta aplicación.

## Configuración local y remota
`supabase/config.toml` configura el stack local y conserva localhost. La URL de GitHub Pages se configura como Site URL en Auth remoto; localhost se permite como Redirect URL adicional de desarrollo.

## Comprobación de solo lectura
`npx supabase projects list --output-format json`
`npx supabase migration list --linked`
`npx supabase db push --linked --dry-run`

## Despliegue controlado
`npx supabase db push --linked`
`npx supabase migration list --linked`
`npx supabase db lint --linked --schema public --level warning --fail-on error`
`npx supabase db advisors --linked`

## Smoke posterior
Verificar login docente, rechazo de cuenta sin rol, rechazo anónimo de las diez tablas, carga de Pages y ausencia de secretos en el bundle.

## Prohibiciones
No registrar ni pegar contraseñas, tokens, service_role o pepper. No ejecutar `db reset`, `migration repair` ni smokes mutables en producción como comprobación rutinaria.
```

Añadir que las credenciales expuestas deben rotarse antes de considerar producción cerrada y que una conexión que muestre otro proyecto detiene el procedimiento.

- [ ] **Step 4: Verificar consistencia documental**

Run:

```powershell
rg -n "cinco Edge Functions|cinco funciones|5 funciones|Sin un proyecto real|no existe proyecto Supabase|No existe remoto" README.md GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md docs/OPERACION_SUPABASE_YCHAYNAN_LITE.md
rg -n "audit_events" GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md docs/OPERACION_SUPABASE_YCHAYNAN_LITE.md
rg -n "manage-assessment-access|draft_version|expectedDraftVersion|config.toml" README.md GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md docs/OPERACION_SUPABASE_YCHAYNAN_LITE.md
npx prettier --write README.md GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md docs/OPERACION_SUPABASE_YCHAYNAN_LITE.md
npm run format:check
```

Expected: no sobreviven afirmaciones de cinco funciones o remoto inexistente; cualquier aparición de `audit_events` declara explícitamente que no se crea esa tabla; los cuatro contratos nuevos aparecen y Prettier pasa.

- [ ] **Step 5: Commit**

```powershell
git add -- README.md GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md docs/OPERACION_SUPABASE_YCHAYNAN_LITE.md
git commit -m "docs: alinear contratos y operacion de Supabase"
```

---

### Task 4: Verificar, desplegar la migración aprobada y actualizar el estado real

**Files:**
- Modify: `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`
- Test: entire repository
- Verify remote: linked Supabase project and GitHub Pages

**Interfaces:**
- Consumes: commits de Tasks 1–3, proyecto enlazado `qwqugnbmncrwcemxwutc` y las nueve migraciones locales.
- Produces: migración 9 aplicada al proyecto correcto con evidencia remota posterior, o bloqueo remoto documentado con cierre local completo; en ambos casos, un estado operativo fechado que no confunde contratos con funcionalidad.

- [ ] **Step 1: Ejecutar la puerta local fresca**

Run:

```powershell
npm ci
npm run verify
npm audit --omit=dev
npm audit
npx -y react-doctor@latest . --verbose --project src
git diff --check
```

Expected: instalación reproducible; lint, formato, tipos, pruebas y build con código 0; auditorías sin vulnerabilidades; React Doctor sobre `src` sin hallazgos accionables.

- [ ] **Step 2: Verificar el destino remoto sin mutarlo**

Completar primero esta compuerta, sin registrar valores secretos:

- [ ] el propietario confirma que rotó la contraseña docente y la contraseña de base de datos expuestas;
- [ ] el propietario confirma que revocó o rotó cualquier token personal expuesto;
- [ ] Supabase Auth remoto muestra como Site URL `https://alejandrocordova1993.github.io/ychaynan-lite/` y conserva localhost únicamente como Redirect URL adicional de desarrollo;
- [ ] la CLI lista `ychaynan-lite` con `project_ref` `qwqugnbmncrwcemxwutc` y `linked: true`;
- [ ] el historial remoto contiene exactamente las ocho migraciones previas;
- [ ] el dry-run propone únicamente `secure_pre_phase2_foundation`.

Run:

```powershell
npx supabase projects list --output-format json
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Expected: el proyecto listado y enlazado es únicamente el esperado; las ocho migraciones anteriores figuran remotas; el dry-run propone solo la migración `secure_pre_phase2_foundation`.

Si cualquier casilla no puede verificarse, omitir Steps 3–4, registrar el despliegue remoto como bloqueado y continuar con el cierre local, la actualización honesta del estado y la revisión final.

- [ ] **Step 3: Aplicar la única migración después de la compuerta externa**

Esta operación modifica Supabase alojado. Solo si todas las casillas de Step 2 están verificadas, el controlador debe presentar el resultado del dry-run y obtener autorización explícita inmediatamente antes de ejecutar:

```powershell
npx supabase db push --linked
```

Expected: se aplica exactamente la migración 9, sin seed, reset ni repair.

- [ ] **Step 4: Verificar el entorno alojado después del despliegue**

Run:

```powershell
npx supabase migration list --linked
npx supabase db lint --linked --schema public --level warning --fail-on error
npx supabase db advisors --linked
```

Expected: las nueve migraciones locales y remotas coinciden; lint no devuelve errores; los hallazgos de seguridad/rendimiento se corrigen o se documentan con impacto y decisión.

La sintaxis `--output-format json` y `db advisors --linked --output-format json` fue ejecutada contra la CLI 2.116.0 el 30 de agosto de 2026; no sustituirla por una variante no comprobada.

Realizar además smokes de solo lectura:

- GitHub Pages devuelve HTTP 200;
- login docente llega al inicio docente;
- una petición anónima a cada una de las diez tablas sigue siendo rechazada;
- el bundle no contiene `service_role`, contraseñas, tokens ni pepper.

- [ ] **Step 5: Actualizar el estado con evidencia del commit actual**

Reescribir `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md` con:

- fecha de corte 30 de agosto de 2026;
- rama, commit técnico verificado anterior al commit documental, relación con `origin/master` y estado del árbol obtenidos en ese momento; no llamarlo `HEAD actual` porque el commit del propio estado lo cambiará;
- conteo exacto de archivos/pruebas, bundle, auditorías y React Doctor de Step 1;
- remoto GitHub y Pages existentes;
- proyecto Supabase correcto, nueve migraciones y verificaciones de Step 4 solo si se completaron;
- seis Edge Functions como contrato objetivo y cero implementadas;
- dos rutas funcionales y diez placeholders, salvo que una comprobación actual demuestre otra cosa;
- rotación de credenciales como pendiente hasta que el propietario confirme haberla realizado;
- siguiente corte vertical: crear evaluación, gestionar accesos, validar estudiante, guardar borrador, entregar y mostrar al docente.

No fijar conteos, hashes o estados que no provengan de la ejecución actual.

- [ ] **Step 6: Repetir la puerta documental y local**

Run:

```powershell
npm run format:check
npm run verify
git diff --check
git status --short
```

Expected: todas las puertas pasan y solo `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md` queda pendiente de commit en este task.

- [ ] **Step 7: Commit**

```powershell
git add -- ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md
git commit -m "docs: actualizar estado real previo a fase 2"
```

---

### Task 5: Revisión final independiente del recorte

**Files:**
- Review: diff completo desde el commit anterior al plan hasta `HEAD`
- Test: entire repository and remote evidence from Task 4

**Interfaces:**
- Consumes: los cuatro entregables ya revisados por tarea y el ledger SDD.
- Produces: veredicto final de cumplimiento, seguridad y preparación para el siguiente corte vertical.

- [ ] **Step 1: Generar el paquete de revisión completo**

Run:

```powershell
$planFile = 'docs/superpowers/plans/2026-08-30-cierre-seguro-pre-fase2.md'
$sddScripts = 'C:/Users/User/.codex/plugins/cache/openai-curated-remote/superpowers/6.3.0/skills/subagent-driven-development/scripts'
$mergeBase = git merge-base master HEAD
& 'C:\Program Files\Git\bin\bash.exe' "$sddScripts/review-package" $planFile $mergeBase HEAD
```

Expected: se crea `.superpowers/sdd/2026-08-30-cierre-seguro-pre-fase2/review-<base>..<head>.diff` con commits, estadística y diff completo. Adjuntar también al reviewer `progress.md` y todos los `task-N-report.md`.

- [ ] **Step 2: Ejecutar una revisión de máxima capacidad**

El reviewer debe comprobar:

- cobertura completa de la especificación;
- ausencia de edición retroactiva de migraciones;
- TDD rojo/verde en la migración 9;
- privilegios y `search_path` seguros;
- coherencia de diez tablas, seis funciones objetivo y ninguna bitácora general;
- correspondencia entre documentación, código y estado remoto;
- ausencia de secretos y de cambios fuera de alcance.

- [ ] **Step 3: Resolver una única ola final de correcciones**

Si hay hallazgos, enviar la lista completa a un único implementador, ejecutar pruebas proporcionales y una sola re-revisión focalizada. Registrar rulings residuales en el ledger.

- [ ] **Step 4: Preparar el cierre de rama**

Ejecutar de nuevo `npm run verify`, confirmar árbol limpio y usar `superpowers:finishing-a-development-branch`. No hacer push, merge ni publicar sin autorización del propietario.
