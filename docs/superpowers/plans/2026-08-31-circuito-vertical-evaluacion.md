# Circuito vertical mínimo de evaluación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que el docente cree y abra una evaluación, que un estudiante validado por nombre completo, paralelo y código responda con borrador recuperable y entregue una sola vez, y que el docente consulte la entrega original.

**Architecture:** La SPA React usa Supabase directamente solo para operaciones docentes protegidas por RLS. Cuatro Edge Functions median todo acceso estudiantil; operaciones multitabla se ejecutan mediante RPC SQL `SECURITY INVOKER` y privilegios explícitos. El navegador conserva texto temporal, pero códigos, tokens y operaciones autoritativas permanecen en servidor.

**Tech Stack:** React 18.3.1, TypeScript 5.6, Vite 8.2.2, React Router 7.18.3, Zod 3.23.8, Supabase JS 2.112.4, Supabase CLI 2.116.0, PostgreSQL/PGlite, Vitest 4.1.11 y Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-31-circuito-vertical-evaluacion-design.md`

## Global Constraints

- Mantener exactamente las diez tablas existentes; cualquier operación SQL nueva va en una migración creada mediante `npx supabase migration new vertical_assessment_flow`.
- No modificar migraciones ya aplicadas ni desplegar migraciones, funciones o secretos remotos sin aprobación explícita.
- El rol `anon` no obtiene privilegios de tabla ni de RPC.
- El docente se autoriza con JWT y `app_metadata.role = teacher`; nunca con `user_metadata`.
- El estudiante no crea cuenta, no consulta tablas y no recibe rúbrica, evaluación ni retroalimentación.
- La identidad exige nombre completo, paralelo y código; ignora mayúsculas y tildes vocálicas, pero distingue `ñ` de `n`.
- Código: ocho caracteres legibles, sin `0/O/1/I`, HMAC-SHA-256 con `ACCESS_CODE_PEPPER` y texto claro devuelto una sola vez.
- Token: 32 bytes aleatorios base64url; la base conserva únicamente SHA-256; expiración máxima 180 minutos o cierre de evaluación, lo que ocurra antes.
- Máximo una evaluación abierta, una entrega por estudiante/evaluación y una respuesta por pregunta.
- `draft_version` representa el borrador completo; un conflicto nunca sobrescribe texto.
- La entrega final es idempotente e inmutable y no se reabre en Lite.
- Conservar el rediseño visual existente; no editar los dos documentos `docs/pedagogia/*` asignados a Claude.
- Toda producción se escribe después de observar fallar la prueba correspondiente.

---

## Task 0: Cerrar la base visual y de autenticación pendiente

**Files:**
- Modify/commit existing: `src/app/App.test.tsx`, `src/app/ErrorBoundary.tsx`, `src/app/router.tsx`, `src/components/common/PlaceholderScreen.tsx`, `src/components/layout/TeacherLayout.tsx`, `src/features/auth/RedirectIfAuthenticated.tsx`, `src/features/auth/RequireAuth.test.tsx`, `src/features/auth/RequireAuth.tsx`, `src/features/auth/TeacherHomeScreen.tsx`, `src/main.tsx`, `src/styles/app.css`
- Modify/commit existing: `docs/superpowers/specs/2026-08-31-ychaynan-lite-visual-system-design.md`, `docs/superpowers/plans/2026-08-31-rediseño-visual-ychaynan-lite.md`

**Interfaces:**
- Consumes: estado local ya aprobado y verificado con 128 pruebas.
- Produces: árbol limpio antes de añadir el circuito vertical.

- [ ] **Step 1: Confirmar que el diff contiene únicamente el rediseño y los saneamientos ya revisados**

Run: `git diff --check && git diff --stat && git status --short`

Expected: 13 archivos modificados, sin errores de espacios y sin archivos pedagógicos de Claude.

- [ ] **Step 2: Repetir la puerta completa**

Run: `npm run verify`

Expected: lint, formato, tipos, 128 pruebas y build en verde.

- [ ] **Step 3: Confirmar el checkpoint**

```bash
git add docs/superpowers/specs/2026-08-31-ychaynan-lite-visual-system-design.md docs/superpowers/plans/2026-08-31-rediseño-visual-ychaynan-lite.md src/app src/components src/features/auth src/main.tsx src/styles/app.css
git commit -m "style: completar navegación docente desplegable"
```

Expected: no incluir la especificación ya confirmada ni archivos fuera de la lista.

## Task 1: Contratos de evaluación y snapshot determinista

**Files:**
- Create: `src/features/assessment/assessmentSchemas.ts`
- Create: `src/features/assessment/assessmentSchemas.test.ts`
- Create: `src/lib/rubric/createRubricSnapshot.ts`
- Create: `src/lib/rubric/createRubricSnapshot.test.ts`

**Interfaces:**
- Consumes: `rubric-v1.json` y Zod.
- Produces: `assessmentDraftSchema`, `AssessmentDraftInput`, `QuestionDraftInput`, `createRubricSnapshot(rubric): Promise<{ snapshot; schemaVersion; hash }>`.

- [ ] **Step 1: Escribir pruebas fallidas de límites y preguntas**

```ts
it('acepta entre una y cuatro preguntas y rechaza una quinta', () => {
  expect(assessmentDraftSchema.safeParse(validDraft({ questions: [question()] })).success).toBe(true);
  expect(assessmentDraftSchema.safeParse(validDraft({ questions: Array.from({ length: 5 }, question) })).success).toBe(false);
});

it('exige posiciones consecutivas y criterios existentes', () => {
  const result = assessmentDraftSchema.safeParse(
    validDraft({ questions: [{ ...question(), position: 2, activeCriteria: ['inventado'] }] }),
  );
  expect(result.success).toBe(false);
});
```

Run: `npm test -- src/features/assessment/assessmentSchemas.test.ts`

Expected: FAIL porque el módulo no existe.

- [ ] **Step 2: Implementar los contratos mínimos**

```ts
export const questionDraftSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().positive(),
  prompt: z.string().trim().min(1).max(2000),
  instructions: z.string().max(4000).default(''),
  suggestedMinWords: z.number().int().nonnegative().nullable(),
  suggestedMaxWords: z.number().int().positive().nullable(),
  activeCriteria: z.array(z.string()).min(1),
  activeModules: z.array(z.string()),
  curriculumLinks: z.record(z.unknown()),
});

export const assessmentDraftSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  purpose: z.string().trim().min(1).max(1000),
  readingText: z.string().trim().min(1).max(30000),
  generalInstructions: z.string().max(6000),
  opensAt: z.string().datetime().nullable(),
  closesAt: z.string().datetime().nullable(),
  pastePolicy: z.enum(['allow', 'discourage']),
  curriculumVersion: z.string().max(80).nullable(),
  questions: z.array(questionDraftSchema).min(1).max(4),
}).superRefine(validateQuestionOrderRangesAndRubricIds);
```

- [ ] **Step 3: Escribir prueba fallida de hash estable**

```ts
it('produce el mismo SHA-256 para el mismo JSON sin depender del orden de claves', async () => {
  const first = await createRubricSnapshot({ b: 2, a: 1 });
  const second = await createRubricSnapshot({ a: 1, b: 2 });
  expect(first.hash).toBe(second.hash);
});
```

Run: `npm test -- src/lib/rubric/createRubricSnapshot.test.ts`

Expected: FAIL porque la función no existe.

- [ ] **Step 4: Implementar serialización canónica y SHA-256 Web Crypto**

```ts
export async function createRubricSnapshot(rubric: unknown) {
  const snapshot = canonicalize(rubric);
  const encoded = new TextEncoder().encode(JSON.stringify(snapshot));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return { snapshot, schemaVersion: rubricSchema.parse(snapshot).schemaVersion, hash: toHex(digest) };
}
```

- [ ] **Step 5: Verificar y confirmar**

Run: `npm test -- src/features/assessment/assessmentSchemas.test.ts src/lib/rubric/createRubricSnapshot.test.ts`

Expected: PASS.

```bash
git add src/features/assessment src/lib/rubric/createRubricSnapshot.ts src/lib/rubric/createRubricSnapshot.test.ts
git commit -m "feat: definir contratos de evaluacion"
```

## Task 2: Guardado transaccional del borrador docente

**Files:**
- Create via CLI: `supabase/migrations/*_vertical_assessment_flow.sql` (usar exactamente el nombre impreso por `npx supabase migration new vertical_assessment_flow`)
- Modify: `src/test/db/pgliteFixture.ts`
- Create: `src/test/db/assessment-flow.test.ts`
- Create: `src/lib/api/assessments.ts`
- Create: `src/lib/api/assessments.test.ts`

**Interfaces:**
- Consumes: `AssessmentDraftInput` y snapshot de Task 1.
- Produces: RPC `save_assessment_draft(p_assessment jsonb, p_questions jsonb) returns uuid`; `saveAssessmentDraft(client, input): Promise<string>` y `getDraftAssessment(client): Promise<AssessmentDraftInput | null>`.

- [ ] **Step 1: Crear la migración con el CLI, sin inventar el timestamp**

Run: `npx supabase migration new vertical_assessment_flow`

Expected: un único archivo nuevo cuyo nombre termina en `_vertical_assessment_flow.sql`.

- [ ] **Step 2: Escribir pruebas PGlite fallidas de atomicidad y permisos**

```ts
it('guarda evaluación y preguntas juntas como docente', async () => {
  await setTeacherClaims(db);
  const result = await db.query<{ id: string }>(
    `select save_assessment_draft($1::jsonb, $2::jsonb) as id`,
    [assessmentJson, questionsJson],
  );
  expect(result.rows[0].id).toMatch(UUID_PATTERN);
  expect(await countRows(db, 'questions')).toBe(2);
});

it('revierte todo si una pregunta no es válida', async () => {
  await expect(callSaveDraft(db, assessmentJson, invalidQuestions)).rejects.toThrow();
  expect(await countRows(db, 'assessments')).toBe(0);
});
```

Run: `npm test -- src/test/db/assessment-flow.test.ts`

Expected: FAIL porque la RPC no existe.

- [ ] **Step 3: Implementar la RPC como `SECURITY INVOKER`**

La función valida `is_teacher()`, estado `draft`, 1–4 preguntas, posiciones consecutivas y reemplaza preguntas en la misma transacción. Al final:

```sql
revoke all on function public.save_assessment_draft(jsonb, jsonb) from public, anon;
grant execute on function public.save_assessment_draft(jsonb, jsonb) to authenticated;
```

El fixture crea también `service_role` para probar las RPC internas posteriores.

- [ ] **Step 4: Escribir prueba fallida del adaptador Supabase**

```ts
it('envía nombres snake_case a save_assessment_draft', async () => {
  await saveAssessmentDraft(client, draft);
  expect(client.rpc).toHaveBeenCalledWith('save_assessment_draft', {
    p_assessment: expect.objectContaining({ reading_text: draft.readingText }),
    p_questions: expect.arrayContaining([expect.objectContaining({ position: 1 })]),
  });
});
```

Run: `npm test -- src/lib/api/assessments.test.ts`

Expected: FAIL porque el adaptador no existe.

- [ ] **Step 5: Implementar adaptador, verificar y confirmar**

Run: `npm test -- src/test/db/assessment-flow.test.ts src/lib/api/assessments.test.ts`

Expected: PASS.

```bash
git add supabase/migrations src/test/db/pgliteFixture.ts src/test/db/assessment-flow.test.ts src/lib/api/assessments.ts src/lib/api/assessments.test.ts
git commit -m "feat: guardar borrador de evaluacion atomicamente"
```

## Task 3: Pantalla docente de creación

**Files:**
- Create: `src/features/assessment/AssessmentEditorScreen.tsx`
- Create: `src/features/assessment/AssessmentEditorScreen.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/components/layout/TeacherLayout.tsx`
- Modify: `src/styles/app.css`
- Modify: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `getDraftAssessment` y `saveAssessmentDraft`.
- Produces: ruta real `#/docente/evaluacion` y formulario accesible de 1–4 preguntas.

- [ ] **Step 1: Escribir prueba fallida del recorrido docente**

```tsx
it('crea una pregunta y conserva el formulario si falla el guardado', async () => {
  render(<AssessmentEditorScreen />);
  await user.type(screen.getByLabelText('Título'), 'Diagnóstico inicial');
  await user.type(screen.getByLabelText('Lectura'), 'Texto de lectura');
  await user.type(screen.getByLabelText('Pregunta 1'), '¿Qué sostiene el autor?');
  await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar');
  expect(screen.getByLabelText('Título')).toHaveValue('Diagnóstico inicial');
});
```

Run: `npm test -- src/features/assessment/AssessmentEditorScreen.test.tsx`

Expected: FAIL porque la pantalla no existe.

- [ ] **Step 2: Implementar con React Hook Form y Zod**

Usar `useFieldArray`, etiquetas persistentes, resumen de errores, botones “Añadir pregunta”, “Eliminar” y “Guardar borrador”. No cargar la rúbrica en cada render; importarla una vez a nivel de módulo y calcular snapshot solo al guardar.

- [ ] **Step 3: Sustituir placeholder y enlazar el menú**

Añadir importación lazy y ruta:

```tsx
const AssessmentEditorScreen = lazy(() => import('../features/assessment/AssessmentEditorScreen').then(({ AssessmentEditorScreen: Component }) => ({ default: Component })));
<Route path="/docente/evaluacion" element={teacherRoute(<AssessmentEditorScreen />)} />
```

- [ ] **Step 4: Verificar accesibilidad básica y confirmar**

Run: `npm test -- src/features/assessment/AssessmentEditorScreen.test.tsx src/app/App.test.tsx`

Expected: PASS.

```bash
git add src/features/assessment src/app/router.tsx src/components/layout/TeacherLayout.tsx src/styles/app.css src/app/App.test.tsx
git commit -m "feat: crear evaluaciones desde el panel docente"
```

## Task 4: Apertura atómica y códigos personales

**Files:**
- Extend: `supabase/migrations/*_vertical_assessment_flow.sql`
- Create: `supabase/functions/_shared/http.ts`
- Create: `supabase/functions/_shared/http.test.ts`
- Create: `supabase/functions/_shared/crypto.ts`
- Create: `supabase/functions/_shared/crypto.test.ts`
- Create: `supabase/functions/_shared/teacherAuth.ts`
- Create: `supabase/functions/manage-assessment-access/handler.ts`
- Create: `supabase/functions/manage-assessment-access/handler.test.ts`
- Create: `supabase/functions/manage-assessment-access/index.ts`
- Create: `src/lib/api/assessmentAccess.ts`
- Create: `src/lib/api/assessmentAccess.test.ts`
- Create: `src/features/assessment/AccessManagementScreen.tsx`
- Create: `src/features/assessment/AccessManagementScreen.test.tsx`
- Modify: `supabase/config.toml`, `src/app/router.tsx`, `src/components/layout/TeacherLayout.tsx`, `src/styles/app.css`

**Interfaces:**
- Produces: RPC `open_assessment_with_accesses(uuid, uuid, jsonb)`, Edge Function `manage-assessment-access`, `openAssessment(client, assessmentId, groupId): Promise<AccessCodeReceipt[]>`.

- [ ] **Step 1: Escribir pruebas fallidas de código y rollback**

```ts
it('genera ocho caracteres sin ambiguos y un HMAC reproducible', async () => {
  const code = generateAccessCode(() => fixedBytes);
  expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  expect(await hashAccessCode(code, 'pepper')).toBe(await hashAccessCode(code, 'pepper'));
});
```

Añadir PGlite: abre `draft`, inserta todos los accesos y revierte si un estudiante falla.

- [ ] **Step 2: Implementar RPC privada y revocar privilegios**

```sql
revoke all on function public.open_assessment_with_accesses(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.open_assessment_with_accesses(uuid, uuid, jsonb) to service_role;
```

- [ ] **Step 3: Implementar handler inyectable y wrapper Deno**

El handler verifica `Authorization: Bearer <JWT>` con `auth.getUser`, exige `app_metadata.role === 'teacher'`, usa `ACCESS_CODE_PEPPER`, llama la RPC con cliente privilegiado y responde `{ ok, data }`. También prueba y ejecuta `regenerate` solo para accesos no entregados y `unblock` limpiando `cooldown_until` e intentos; ambas acciones rechazan un acceso `submitted`. `config.toml` mantiene `verify_jwt = true` para esta función. `http.ts` responde `OPTIONS` y limita CORS a la lista exacta de `ALLOWED_ORIGINS`.

- [ ] **Step 4: Escribir e implementar la pantalla de accesos**

La prueba exige seleccionar paralelo, confirmar apertura, mostrar códigos una sola vez, ofrecer impresión, regenerar un código no usado y desbloquear un acceso temporal. Recargar la pantalla muestra estados, nunca códigos claros.

- [ ] **Step 5: Verificar y confirmar**

Run: `npm test -- supabase/functions/_shared/http.test.ts supabase/functions/_shared/crypto.test.ts supabase/functions/manage-assessment-access/handler.test.ts src/test/db/assessment-flow.test.ts src/lib/api/assessmentAccess.test.ts src/features/assessment/AccessManagementScreen.test.tsx`

Expected: PASS.

```bash
git add supabase src/lib/api/assessmentAccess* src/features/assessment/AccessManagementScreen* src/app/router.tsx src/components/layout/TeacherLayout.tsx src/styles/app.css
git commit -m "feat: abrir evaluacion y generar codigos"
```

## Task 5: Validación estudiantil y sesión temporal

**Files:**
- Extend: `supabase/migrations/*_vertical_assessment_flow.sql`
- Create: `supabase/functions/_shared/normalize.ts`
- Create: `supabase/functions/_shared/studentSession.ts`
- Create: `supabase/functions/validate-student/handler.ts`
- Create: `supabase/functions/validate-student/handler.test.ts`
- Create: `supabase/functions/validate-student/index.ts`
- Create: `src/lib/validation/normalizeGroup.ts`
- Create: `src/lib/validation/normalizeGroup.test.ts`
- Create: `src/lib/api/studentAssessment.ts`
- Create: `src/features/student/StudentAccessScreen.tsx`
- Create: `src/features/student/StudentAccessScreen.test.tsx`
- Create: `src/features/student/studentSessionStorage.ts`
- Create: `src/features/student/studentSessionStorage.test.ts`
- Modify: `supabase/config.toml`, `src/app/router.tsx`, `src/styles/app.css`

**Interfaces:**
- Produces: `validateStudent({ assessmentSlug, fullName, groupName, personalCode })`; almacenamiento `{ token, expiresAt, clientSubmissionKey, submissionId, draftVersion }` en `sessionStorage`/`localStorage`.

- [ ] **Step 1: Escribir pruebas fallidas de paralelo y nombre**

```ts
expect(normalizeGroup(' 3RO B.G.U. Á ')).toBe('3ro b g u a');
expect(namesMatch('Maria Pena', 'María Peña')).toBe(false);
```

Run: `npm test -- src/lib/validation/normalizeGroup.test.ts src/lib/validation/normalizeName.test.ts`

Expected: FAIL por módulo nuevo; la prueba de `ñ` existente continúa verde.

- [ ] **Step 2: Escribir pruebas de validación segura**

Cubrir: coincidencia válida, paralelo incorrecto, código incorrecto, evaluación cerrada, acceso entregado, sesión previa revocada y mensaje genérico idéntico. Definir umbral de red en 200 intentos por cinco minutos y espera por acceso de 30 s desde el tercer fallo, 120 s desde el quinto y 600 s desde el séptimo.

- [ ] **Step 3: Implementar RPC/handler y almacenamiento**

El servidor genera token de 32 bytes y `clientSubmissionKey`; calcula hashes con prefijos de dominio `code:`, `fingerprint:` y `session:`. `validate-student` usa `verify_jwt = false`, pero sigue requiriendo `apikey` del cliente Supabase y CORS para orígenes configurados.

- [ ] **Step 4: Sustituir la ruta pública de acceso**

Formulario con tres campos, error genérico y navegación a `/evaluacion/:slug/responder` solo después de persistir la sesión.

- [ ] **Step 5: Verificar y confirmar**

Run: `npm test -- supabase/functions/validate-student/handler.test.ts src/lib/validation src/features/student/StudentAccessScreen.test.tsx src/features/student/studentSessionStorage.test.ts src/test/db/assessment-flow.test.ts`

Expected: PASS.

```bash
git add supabase src/lib/validation src/lib/api/studentAssessment.ts src/features/student src/app/router.tsx src/styles/app.css
git commit -m "feat: validar acceso estudiantil"
```

## Task 6: Borrador local y remoto con conflicto optimista

**Files:**
- Extend: `supabase/migrations/*_vertical_assessment_flow.sql`
- Create: `supabase/functions/save-draft/handler.ts`
- Create: `supabase/functions/save-draft/handler.test.ts`
- Create: `supabase/functions/save-draft/index.ts`
- Create: `src/features/student/draftStorage.ts`
- Create: `src/features/student/draftStorage.test.ts`
- Create: `src/features/student/StudentResponseScreen.tsx`
- Create: `src/features/student/StudentResponseScreen.test.tsx`
- Modify: `src/lib/api/studentAssessment.ts`, `supabase/config.toml`, `src/app/router.tsx`, `src/styles/app.css`

**Interfaces:**
- Produces: `saveDraft(request): Promise<{ draftVersion; responses }>` y clave local `ychaynan-lite:v1:draft:<slug>`.

- [ ] **Step 1: Escribir pruebas fallidas de almacenamiento exacto y limpieza**

```ts
it('conserva saltos, tildes y errores tal como fueron escritos', () => {
  saveLocalDraft('diag', { q1: '  Él dijo:\n"sí"  ' });
  expect(loadLocalDraft('diag')?.responses.q1).toBe('  Él dijo:\n"sí"  ');
});
```

- [ ] **Step 2: Escribir pruebas PGlite de versión**

Guardar con versión 0 devuelve 1; guardar otra vez con 0 devuelve conflicto y conserva el texto de la versión 1.

- [ ] **Step 3: Implementar RPC y Edge Function**

`save_student_draft` recibe token hash, clave, versión esperada y snapshot JSON. Bloquea la entrega `for update`, valida preguntas, hace upsert de respuestas e incrementa una vez. `verify_jwt = false`.

- [ ] **Step 4: Implementar editor y resolución de conflicto**

Autosave local en cada cambio; remoto tras pausa de 1500 ms, cambio de pregunta, `online` y antes de entregar. Estado accesible: “Guardado en este equipo”, “Sincronizando”, “Guardado”, “Sin conexión”. Ante 409, mostrar local y remoto sin fusionar automáticamente.

- [ ] **Step 5: Verificar y confirmar**

Run: `npm test -- supabase/functions/save-draft/handler.test.ts src/features/student/draftStorage.test.ts src/features/student/StudentResponseScreen.test.tsx src/test/db/assessment-flow.test.ts`

Expected: PASS.

```bash
git add supabase src/features/student src/lib/api/studentAssessment.ts src/app/router.tsx src/styles/app.css
git commit -m "feat: guardar borradores estudiantiles"
```

## Task 7: Entrega final idempotente y limpieza

**Files:**
- Extend: `supabase/migrations/*_vertical_assessment_flow.sql`
- Create: `supabase/functions/submit-assessment/handler.ts`
- Create: `supabase/functions/submit-assessment/handler.test.ts`
- Create: `supabase/functions/submit-assessment/index.ts`
- Create: `src/features/student/SubmissionReceiptScreen.tsx`
- Create: `src/features/student/SubmissionReceiptScreen.test.tsx`
- Modify: `src/lib/api/studentAssessment.ts`, `src/features/student/StudentResponseScreen.tsx`, `src/features/student/StudentResponseScreen.test.tsx`, `supabase/config.toml`, `src/app/router.tsx`, `src/styles/app.css`

**Interfaces:**
- Produces: `submitAssessment(request): Promise<{ receiptId; submittedAt; finalDraftVersion }>` y `clearStudentDevice(slug)`.

- [ ] **Step 1: Escribir pruebas fallidas de idempotencia**

PGlite debe probar: primera llamada crea una entrega; repetición con misma clave devuelve mismo recibo; clave distinta no crea segunda entrega; respuesta queda inmutable; fuera de ventana falla.

- [ ] **Step 2: Implementar RPC/handler transaccional**

La repetición con token revocado solo puede leer el recibo cuando token, acceso y clave coinciden. Ningún camino posterior a `submitted` modifica `responses`.

- [ ] **Step 3: Añadir confirmación y recibo**

El diálogo enumera preguntas respondidas y exige `confirmed: true`. La pantalla de recibo no muestra resultados. “Finalizar y limpiar este equipo” borra token, borrador y clave únicamente después de mostrar el recibo.

- [ ] **Step 4: Verificar y confirmar**

Run: `npm test -- supabase/functions/submit-assessment/handler.test.ts src/features/student/StudentResponseScreen.test.tsx src/features/student/SubmissionReceiptScreen.test.tsx src/test/db/assessment-flow.test.ts`

Expected: PASS.

```bash
git add supabase src/features/student src/lib/api/studentAssessment.ts src/app/router.tsx src/styles/app.css
git commit -m "feat: entregar evaluacion una sola vez"
```

## Task 8: Bandeja y detalle docente

**Files:**
- Create: `src/lib/api/submissions.ts`
- Create: `src/lib/api/submissions.test.ts`
- Create: `src/features/submissions/SubmissionListScreen.tsx`
- Create: `src/features/submissions/SubmissionListScreen.test.tsx`
- Create: `src/features/submissions/SubmissionDetailScreen.tsx`
- Create: `src/features/submissions/SubmissionDetailScreen.test.tsx`
- Modify: `src/app/router.tsx`, `src/components/layout/TeacherLayout.tsx`, `src/styles/app.css`, `src/app/App.test.tsx`

**Interfaces:**
- Produces: `listSubmissionOverview(client, assessmentId)` y `getSubmissionDetail(client, submissionId)`; rutas reales `/docente/respuestas` y `/docente/respuestas/:submissionId`.

- [ ] **Step 1: Escribir pruebas fallidas del mapeo de estados**

```ts
expect(mapAccessState({ access: 'unused', submission: null })).toBe('esperado');
expect(mapAccessState({ access: 'active', submission: 'in_progress' })).toBe('iniciado');
expect(mapAccessState({ access: 'submitted', submission: 'submitted' })).toBe('entregado');
```

- [ ] **Step 2: Implementar consultas docentes bajo RLS**

Seleccionar solo columnas necesarias y ejecutar consultas independientes en paralelo con `Promise.all`. Parsear cada respuesta con Zod; errores técnicos van a consola y la interfaz muestra texto genérico.

- [ ] **Step 3: Implementar lista y detalle de solo lectura**

La lista permite filtrar por estado y enlaza entregas. El detalle presenta lectura, pregunta, texto original, conteo y fechas; no incluye botones de IA.

- [ ] **Step 4: Verificar y confirmar**

Run: `npm test -- src/lib/api/submissions.test.ts src/features/submissions src/app/App.test.tsx`

Expected: PASS.

```bash
git add src/lib/api/submissions* src/features/submissions src/app/router.tsx src/components/layout/TeacherLayout.tsx src/styles/app.css src/app/App.test.tsx
git commit -m "feat: consultar entregas desde el panel docente"
```

## Task 9: Verificación integral y preparación del despliegue

**Files:**
- Modify: `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`
- Modify: `README.md`


**Interfaces:**
- Consumes: Tasks 0–8.
- Produces: evidencia local completa y lista de operaciones remotas aún no ejecutadas.

- [ ] **Step 1: Ejecutar pruebas focalizadas y puerta general**

Run: `npm run verify`

Expected: lint sin warnings, formato limpio, TypeScript limpio, todas las pruebas PASS y build exitoso.

- [ ] **Step 2: Ejecutar diagnóstico React**

Run: `npx -y react-doctor@latest . --verbose --diff`

Expected: sin problemas bloqueantes; corregir cualquier regresión antes de continuar.

- [ ] **Step 3: Validar migraciones y funciones localmente**

Run: `npx supabase --version`, luego `npx supabase migration list --local` y, si Docker está disponible, `npx supabase start` seguido de `npx supabase functions serve` y smokes con datos ficticios.

Expected: migración ordenada, cuatro funciones arrancan, ningún secreto se imprime y `anon` no lee tablas.

- [ ] **Step 4: Actualizar documentación con evidencia, no expectativas**

Registrar número real de pruebas, rutas ya funcionales, funciones existentes y pendientes `evaluate-submission`/`export-campaign`. No afirmar despliegue remoto.

- [ ] **Step 5: Confirmar documentación**

```bash
git add ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md README.md
git commit -m "docs: registrar circuito vertical implementado"
```

- [ ] **Step 6: Detenerse antes de producción**

Entregar al usuario: commits, pruebas, nueva migración, cuatro funciones, secretos requeridos (`ACCESS_CODE_PEPPER`, `ALLOWED_ORIGINS`, `STUDENT_SESSION_MAX_MINUTES=180`) y comandos propuestos. No ejecutar `db push`, `functions deploy`, configurar secretos, hacer push a GitHub ni fusionar sin autorización explícita.

