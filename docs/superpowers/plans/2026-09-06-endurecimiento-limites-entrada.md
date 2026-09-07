# Input Limits Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar límites coherentes y verificables a evaluaciones, nóminas, credenciales estudiantiles y respuestas en React, Edge Functions y PostgreSQL.

**Architecture:** Un contrato TypeScript puro en `supabase/functions/_shared/inputLimits.ts` será la fuente de verdad para navegador y Edge Functions. PostgreSQL repetirá las invariantes de persistencia y sustituirá la inserción directa de nóminas por una RPC atómica. Cada frontera rechazará entradas inválidas sin truncar respuestas ni exponer datos personales.

**Tech Stack:** React 18, TypeScript, Zod, Vitest, Testing Library, Supabase Edge Functions/Deno, PostgreSQL, PGlite y Supabase CLI.

**Spec:** `docs/superpowers/specs/2026-09-06-endurecimiento-limites-entrada-design.md`

## Global Constraints

- Contar texto por puntos de código Unicode: `Array.from(value).length` en TypeScript y `char_length(value)` en PostgreSQL.
- Respuesta: 5.000 caracteres; nunca truncarla ni normalizarla en servidor.
- Evaluación: 1–4 preguntas y hasta 20.000 caracteres de respuestas.
- Paralelo: máximo 50 estudiantes registrados, incluso mediante varias importaciones.
- Archivo de nómina: 50 filas, 500 celdas materializadas y 5 MB.
- Evaluación: título 160, propósito 1.000, lectura 30.000, instrucciones generales 6.000, consigna 2.000, instrucciones por pregunta 4.000 y versión curricular 80.
- Acceso: slug 200, nombre 160, paralelo 80, código 12, fingerprint 128, token 256 y clave idempotente 256.
- Cuerpo HTTP: `validate-student` 4 KB, `save-draft` 96 KB y `submit-assessment` 4 KB.
- Ninguna migración trunca, reescribe o elimina datos; debe fallar ante información incompatible.
- No registrar respuestas completas, nombres, códigos, tokens o claves idempotentes.
- No añadir dependencias de ejecución.
- Actualizar GitHub Actions después, en un commit de mantenimiento independiente.

## File Map

- `supabase/functions/_shared/inputLimits.ts`: límites, conteo Unicode y predicados puros.
- `supabase/functions/_shared/http.ts`: lectura acotada de JSON.
- `supabase/migrations/20260906180000_atomic_roster_import.sql`: RPC atómica y privilegios.
- `supabase/migrations/20260906181000_persisted_input_limits.sql`: preflight, restricciones y RPC endurecidas.
- `src/features/roster/parseRoster.ts`, `src/lib/api/students.ts`: nómina local y escritura única por RPC.
- `src/features/student/StudentQuestionResponse.tsx`: contador y techo de respuesta.
- `src/features/student/StudentAccessScreen.tsx`: límites de identidad.
- `src/features/assessment/assessmentSchemas.ts`, `AssessmentEditorScreen.tsx`: contrato docente.
- Handlers `validate-student`, `save-draft`, `submit-assessment`: validación estricta de frontera.
- `aiEvaluation.ts`, `submissionSource.ts`: límite equivalente antes de IA.

---

### Task 1: Contrato compartido de límites y Unicode

**Files:**
- Create: `supabase/functions/_shared/inputLimits.ts`
- Create: `supabase/functions/_shared/inputLimits.test.ts`

**Interfaces:**
- Produces: `INPUT_LIMITS`, `unicodeLength`, `isWithinUnicodeLimit`, `truncateUnicode`, `isPlainRecord`, `hasOnlyKeys`, `isUuid`.
- Consumes: ninguna dependencia de entorno; debe funcionar en Vite, Vitest y Deno.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { INPUT_LIMITS, hasOnlyKeys, isPlainRecord, isUuid, isWithinUnicodeLimit, truncateUnicode, unicodeLength } from './inputLimits.ts';

describe('input limits contract', () => {
  it('publica las cifras aprobadas', () => {
    expect(INPUT_LIMITS.responseChars).toBe(5_000);
    expect(INPUT_LIMITS.roster).toEqual({ fileBytes: 5 * 1024 * 1024, rows: 50, cells: 500, studentsPerGroup: 50, nameChars: 160 });
    expect(INPUT_LIMITS.edgeBodyBytes).toEqual({ validateStudent: 4096, saveDraft: 98304, submitAssessment: 4096 });
  });
  it('cuenta Unicode por puntos de código', () => {
    expect(unicodeLength('a😀b')).toBe(3);
    expect(isWithinUnicodeLimit('😀'.repeat(5_000), 5_000)).toBe(true);
    expect(isWithinUnicodeLimit('😀'.repeat(5_001), 5_000)).toBe(false);
    expect(truncateUnicode('a😀b', 2)).toBe('a😀');
  });
  it('valida forma, campos y UUID', () => {
    expect(isPlainRecord({ a: 1 })).toBe(true);
    expect(isPlainRecord([])).toBe(false);
    expect(hasOnlyKeys({ a: 1 }, ['a'])).toBe(true);
    expect(hasOnlyKeys({ a: 1, b: 2 }, ['a'])).toBe(false);
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('no-uuid')).toBe(false);
  });
});
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run supabase/functions/_shared/inputLimits.test.ts`

Expected: FAIL because `inputLimits.ts` does not exist.

- [ ] **Step 3: Implement the contract**

```ts
export const INPUT_LIMITS = {
  responseChars: 5_000,
  assessment: { slugChars: 200, titleChars: 160, purposeChars: 1_000, readingChars: 30_000, generalInstructionsChars: 6_000, questionsMin: 1, questionsMax: 4, promptChars: 2_000, questionInstructionsChars: 4_000, curriculumVersionChars: 80 },
  roster: { fileBytes: 5 * 1024 * 1024, rows: 50, cells: 500, studentsPerGroup: 50, nameChars: 160 },
  access: { fullNameChars: 160, groupNameChars: 80, personalCodeChars: 12, fingerprintChars: 128, tokenChars: 256, clientSubmissionKeyChars: 256 },
  edgeBodyBytes: { validateStudent: 4 * 1024, saveDraft: 96 * 1024, submitAssessment: 4 * 1024 },
} as const;

export const unicodeLength = (value: string) => Array.from(value).length;
export const isWithinUnicodeLimit = (value: string, maximum: number) => unicodeLength(value) <= maximum;
export const truncateUnicode = (value: string, maximum: number) => Array.from(value).slice(0, maximum).join('');
export const isPlainRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
export const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every((key) => allowed.includes(key));
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
```

- [ ] **Step 4: Confirm GREEN and commit**

Run: `npx vitest run supabase/functions/_shared/inputLimits.test.ts && npm run typecheck`

```bash
git add supabase/functions/_shared/inputLimits.ts supabase/functions/_shared/inputLimits.test.ts
git commit -m "feat: centralizar limites de entrada"
```

---

### Task 2: Límites locales del importador

**Files:**
- Modify: `src/features/roster/parseRoster.ts:34-120`
- Modify: `src/features/roster/parseRoster.test.ts:48-145`
- Modify: `src/features/roster/ImportRosterPanel.tsx:100-145`
- Modify: `src/features/roster/ImportRosterPanel.test.tsx`

**Interfaces:**
- Consumes: `INPUT_LIMITS`, `unicodeLength`.
- Produces: 5 MB, 50 filas, 500 celdas y nombres/variantes de hasta 160.

- [ ] **Step 1: Add failing boundaries**

```ts
it('acepta 50 filas y rechaza 51', () => {
  const rows = Array.from({ length: 51 }, (_, i) => `Nombre ${String.fromCharCode(65 + (i % 26))},Apellido`);
  expect(parseRosterCsv('nombres,apellidos\n' + rows.slice(0, 50).join('\n')).rows).toHaveLength(50);
  expect(() => parseRosterCsv('nombres,apellidos\n' + rows.join('\n'))).toThrow(/máximo de 50 estudiantes/i);
});

it('acepta 500 celdas y rechaza 501', () => {
  const header = ['nombre completo', ...Array.from({ length: 9 }, (_, i) => `extra${i}`)].join(',');
  const row = ['Ana Ruiz', ...Array(9).fill('')].join(',');
  const rowWithOverflow = ['Ana Ruiz', ...Array(9).fill(''), 'sobrante'].join(',');
  expect(parseRosterCsv([header, ...Array(49).fill(row)].join('\n')).rows).toHaveLength(49);
  expect(() => parseRosterCsv([header, rowWithOverflow, ...Array(48).fill(row)].join('\n'))).toThrow(/500 celdas/i);
});

it('invalida nombre o variante de 161 caracteres', () => {
  const long = 'a'.repeat(161);
  const result = parseRosterCsv(`nombre completo,variante autorizada\n${long},${long}`);
  expect(result.rows[0].status).toBe('invalid');
  expect(result.rows[0].issues.join(' ')).toMatch(/160 caracteres/i);
});
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run src/features/roster/parseRoster.test.ts`

Expected: FAIL on old 2.000/20.000 limits and missing name-length validation.

- [ ] **Step 3: Use shared limits and add issues**

```ts
import { INPUT_LIMITS, unicodeLength } from '../../../supabase/functions/_shared/inputLimits';
export const MAX_ROSTER_FILE_BYTES = INPUT_LIMITS.roster.fileBytes;
export const MAX_ROSTER_ROWS = INPUT_LIMITS.roster.rows;
export const MAX_ROSTER_CELLS = INPUT_LIMITS.roster.cells;

if (unicodeLength(fullNameOriginal) > INPUT_LIMITS.roster.nameChars) issues.push('El nombre completo supera 160 caracteres.');
if (authorizedVariantRaw !== null && unicodeLength(authorizedVariantRaw) > INPUT_LIMITS.roster.nameChars) issues.push('La variante autorizada supera 160 caracteres.');
```

- [ ] **Step 4: Add and satisfy the visible-copy test**

```tsx
expect(screen.getByText(/máximo 50 estudiantes por archivo y por paralelo/i)).toBeInTheDocument();
```

Set the hint to: `Usa nombres + apellidos, o una sola columna nombre completo. Formatos: CSV y XLSX; máximo 50 estudiantes por archivo y por paralelo.`

- [ ] **Step 5: Confirm GREEN and commit**

Run: `npx vitest run src/features/roster/parseRoster.test.ts src/features/roster/ImportRosterPanel.test.tsx`

```bash
git add src/features/roster/parseRoster.ts src/features/roster/parseRoster.test.ts src/features/roster/ImportRosterPanel.tsx src/features/roster/ImportRosterPanel.test.tsx
git commit -m "fix: limitar nominas a cincuenta estudiantes"
```

---

### Task 3: Importación atómica y privilegio mínimo

**Files:**
- Create: `supabase/migrations/20260906180000_atomic_roster_import.sql`
- Create: `src/test/db/atomic-roster-import.test.ts`
- Modify: `src/lib/api/students.ts`
- Modify: `src/lib/api/students.test.ts`
- Modify: `src/features/roster/ParalelosScreen.test.tsx`

**Interfaces:**
- Produces SQL: `public.import_students_to_group(p_group_id uuid, p_students jsonb) returns integer`.
- Produces client: `bulkImportStudents(client, students): Promise<{ inserted: number }>` llama una vez a la RPC.
- Payload row: `{ full_name_original: string; authorized_variant: string | null }`; PostgreSQL normaliza.

- [ ] **Step 1: Write failing PGlite tests**

Initialize the test database and active group, then define every helper used below:

```ts
let db: PGlite;
let groupId: string;
beforeEach(async () => {
  db = await createTestDatabase();
  groupId = (await db.query<{ id: string }>(`insert into public.groups(name, school_year) values ('1A', '2026') returning id`)).rows[0].id;
});
afterEach(async () => db.close());

const assumeAuthenticated = async (role: string) => {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: '00000000-0000-0000-0000-000000000001', app_metadata: { role } })]);
  await db.exec('set role authenticated');
};
const assumeTeacher = () => assumeAuthenticated('teacher');
const alphabeticSuffix = (index: number) =>
  String.fromCharCode(65 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));
const alphabeticStudents = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    full_name_original: `Estudiante ${alphabeticSuffix(index)}`,
    authorized_variant: null,
  }));
const importRows = async (rows: Array<{ full_name_original: string; authorized_variant: string | null }>) => {
  const result = await db.query<{ inserted: number }>(
    `select public.import_students_to_group($1, $2::jsonb) as inserted`,
    [groupId, JSON.stringify(rows)],
  );
  return result.rows[0].inserted;
};
const countStudents = async () =>
  (await db.query<{ count: number }>(`select count(*)::integer as count from public.students where group_id = $1`, [groupId])).rows[0].count;
const storedIdentity = async () =>
  (await db.query<{ full_name_normalized: string; authorized_variants: string[] }>(`select full_name_normalized, authorized_variants from public.students where group_id = $1`, [groupId])).rows[0];
const hasAuthenticatedInsertPrivilege = async () => {
  await db.exec('reset role');
  return (await db.query<{ allowed: boolean }>(`select has_table_privilege('authenticated', 'public.students', 'insert') as allowed`)).rows[0].allowed;
};

it('inserta exactamente 50', async () => {
  await assumeTeacher();
  expect(await importRows(alphabeticStudents(50))).toBe(50);
  expect(await countStudents()).toBe(50);
});

it('revierte la importación que produciría el estudiante 51', async () => {
  await assumeTeacher();
  await importRows(alphabeticStudents(49));
  await expect(importRows(alphabeticStudents(2))).rejects.toThrow(/maximum 50 students/i);
  expect(await countStudents()).toBe(49);
});

it('normaliza vocales y conserva la ñ', async () => {
  await assumeTeacher();
  await importRows([{ full_name_original: 'María Peña Ñacato', authorized_variant: 'Ma. Peña' }]);
  expect(await storedIdentity()).toEqual({ full_name_normalized: 'maria peña ñacato', authorized_variants: ['ma peña'] });
});

it('niega anon, cuenta sin rol e INSERT directo', async () => {
  await db.exec('reset role');
  await db.exec('set role anon');
  await expect(db.query(`select public.import_students_to_group($1, $2::jsonb)`, [groupId, JSON.stringify(alphabeticStudents(1))])).rejects.toThrow();
  await assumeAuthenticated('student');
  await expect(importRows(alphabeticStudents(1))).rejects.toThrow(/teacher role required/i);
  expect(await hasAuthenticatedInsertPrivilege()).toBe(false);
});
```

Generated fixture names must use alphabetic suffixes because digits are invalid in names.

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run src/test/db/atomic-roster-import.test.ts`

Expected: FAIL because the RPC does not exist and direct `INSERT` is still granted.

- [ ] **Step 3: Generate the migration**

Run: `npx supabase migration new atomic_roster_import`

Rename only that new empty file to `supabase/migrations/20260906180000_atomic_roster_import.sql`; never edit deployed migrations.

- [ ] **Step 4: Implement the secured RPC**

```sql
create or replace function public.import_students_to_group(p_group_id uuid, p_students jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student jsonb;
  v_original text;
  v_variant text;
  v_current_count integer;
  v_inserted integer := 0;
begin
  if not public.is_teacher() then raise exception 'teacher role required'; end if;
  if pg_catalog.jsonb_typeof(p_students) is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_students) not between 1 and 50 then
    raise exception 'students must contain between 1 and 50 rows';
  end if;

  perform 1 from public.groups where id = p_group_id and status = 'active' for update;
  if not found then raise exception 'active group not found'; end if;
  select pg_catalog.count(*)::integer into v_current_count from public.students where group_id = p_group_id;
  if v_current_count + pg_catalog.jsonb_array_length(p_students) > 50 then
    raise exception 'group would exceed maximum 50 students';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_students) item(value)
    where pg_catalog.jsonb_typeof(item.value) is distinct from 'object'
       or exists (select 1 from pg_catalog.jsonb_object_keys(item.value) key(name) where key.name not in ('full_name_original', 'authorized_variant'))
       or pg_catalog.jsonb_typeof(item.value -> 'full_name_original') is distinct from 'string'
       or pg_catalog.char_length(pg_catalog.btrim(item.value ->> 'full_name_original')) not between 1 and 160
       or (item.value ->> 'full_name_original') ~ '[0-9[:cntrl:]]'
       or (item.value ? 'authorized_variant' and pg_catalog.jsonb_typeof(item.value -> 'authorized_variant') not in ('string', 'null'))
       or pg_catalog.char_length(pg_catalog.btrim(coalesce(item.value ->> 'authorized_variant', ''))) > 160
       or coalesce(item.value ->> 'authorized_variant', '') ~ '[0-9[:cntrl:]]'
  ) then raise exception 'invalid student rows'; end if;

  for v_student in select value from pg_catalog.jsonb_array_elements(p_students) loop
    v_original := pg_catalog.regexp_replace(pg_catalog.btrim(v_student ->> 'full_name_original'), '\s+', ' ', 'g');
    v_variant := nullif(pg_catalog.regexp_replace(pg_catalog.btrim(v_student ->> 'authorized_variant'), '\s+', ' ', 'g'), '');
    insert into public.students(group_id, full_name_original, full_name_normalized, authorized_variants)
    values (p_group_id, v_original, public.normalize_lite_identity(v_original), case when v_variant is null then '{}'::text[] else array[public.normalize_lite_identity(v_variant)] end);
    v_inserted := v_inserted + 1;
  end loop;
  return v_inserted;
end;
$$;

revoke insert on table public.students from authenticated;
revoke all on function public.import_students_to_group(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_students_to_group(uuid, jsonb) to authenticated;
```

- [ ] **Step 5: Confirm database GREEN**

Run: `npx vitest run src/test/db/atomic-roster-import.test.ts src/test/db/migrations.test.ts src/test/db/migrations-source.test.ts`

- [ ] **Step 6: Replace API tests with the RPC contract**

```ts
expect(client.rpc).toHaveBeenCalledWith('import_students_to_group', {
  p_group_id: 'g1',
  p_students: [
    { full_name_original: 'Ana Ruiz', authorized_variant: null },
    { full_name_original: 'José Muñoz', authorized_variant: 'Pepe Muñoz' },
  ],
});
expect(client.from).not.toHaveBeenCalled();
```

- [ ] **Step 7: Implement the RPC client**

```ts
const groupIds = new Set(students.map(({ groupId }) => groupId));
if (groupIds.size !== 1) throw new Error('La nómina debe pertenecer a un solo paralelo.');
const { data, error } = await client.rpc('import_students_to_group', {
  p_group_id: students[0].groupId,
  p_students: students.map((student) => ({ full_name_original: student.fullNameOriginal, authorized_variant: student.authorizedVariant ?? null })),
});
if (error) throw new Error('No se pudo importar la nómina. Revisa que el paralelo no supere 50 estudiantes.');
return { inserted: z.number().int().nonnegative().max(50).parse(data) };
```

Import `z` from `zod`; remove client-side `normalizeName` from this API.

- [ ] **Step 8: Run and commit**

Run: `npx vitest run src/lib/api/students.test.ts src/features/roster/ParalelosScreen.test.tsx`

```bash
git add supabase/migrations/20260906180000_atomic_roster_import.sql src/test/db/atomic-roster-import.test.ts src/lib/api/students.ts src/lib/api/students.test.ts src/features/roster/ParalelosScreen.test.tsx
git commit -m "fix: importar nominas de forma atomica"
```

---

### Task 4: Lector seguro de JSON para Edge Functions

**Files:**
- Modify: `supabase/functions/_shared/http.ts`
- Create: `supabase/functions/_shared/http.test.ts`

**Interfaces:**
- Produces: `RequestBodyError(status, code)` and `readJsonObject(request, { maxBytes, allowedFields })`.
- Consumes: `hasOnlyKeys`, `isPlainRecord`.

- [ ] **Step 1: Write failing tests**

```ts
it.each([{ body: '', status: 400 }, { body: '{', status: 400 }, { body: '[]', status: 400 }, { body: '{"allowed":true,"extra":1}', status: 400 }])(
  'rechaza forma inválida', async ({ body, status }) => {
    await expect(readJsonObject(new Request('https://local.test', { method: 'POST', body }), { maxBytes: 100, allowedFields: ['allowed'] })).rejects.toMatchObject({ status });
  },
);
it('rechaza Content-Length excesivo', async () => {
  const request = new Request('https://local.test', { method: 'POST', headers: { 'Content-Length': '101' }, body: '{}' });
  await expect(readJsonObject(request, { maxBytes: 100, allowedFields: [] })).rejects.toMatchObject({ status: 413, code: 'body_too_large' });
});
it('mide bytes UTF-8 sin cabecera', async () => {
  const request = new Request('https://local.test', { method: 'POST', body: JSON.stringify({ allowed: '😀😀' }) });
  await expect(readJsonObject(request, { maxBytes: 20, allowedFields: ['allowed'] })).rejects.toMatchObject({ status: 413 });
});
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run supabase/functions/_shared/http.test.ts`

- [ ] **Step 3: Implement one-read parsing**

```ts
import { hasOnlyKeys, isPlainRecord } from './inputLimits.ts';

export class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 413, public readonly code: 'invalid_body' | 'body_too_large') { super(code); }
}

export async function readJsonObject(request: Request, options: { maxBytes: number; allowedFields: readonly string[] }) {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > options.maxBytes) throw new RequestBodyError(413, 'body_too_large');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > options.maxBytes) throw new RequestBodyError(413, 'body_too_large');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new RequestBodyError(400, 'invalid_body'); }
  if (!isPlainRecord(value) || !hasOnlyKeys(value, options.allowedFields)) throw new RequestBodyError(400, 'invalid_body');
  return value;
}
```

- [ ] **Step 4: Confirm GREEN and commit**

Run: `npx vitest run supabase/functions/_shared/http.test.ts`

```bash
git add supabase/functions/_shared/http.ts supabase/functions/_shared/http.test.ts
git commit -m "feat: limitar cuerpos json en edge functions"
```

---

### Task 5: Validación estricta de tres endpoints estudiantiles

**Files:**
- Modify: `supabase/functions/validate-student/handler.ts`
- Modify: `supabase/functions/validate-student/handler.test.ts`
- Modify: `supabase/functions/save-draft/handler.ts`
- Modify: `supabase/functions/save-draft/handler.test.ts`
- Modify: `supabase/functions/submit-assessment/handler.ts`
- Modify: `supabase/functions/submit-assessment/handler.test.ts`

**Interfaces:**
- Consumes: `readJsonObject`, `RequestBodyError`, `INPUT_LIMITS`, `isUuid`, `isPlainRecord`, `hasOnlyKeys`, `unicodeLength`.
- Produces: 400 forma/valor, 401 sesión, 409 versión y 413 tamaño.

- [ ] **Step 1: Add failing table-driven tests**

For each handler test oversized `Content-Length` and actual oversized UTF-8 without the header. Also cover:

```ts
// validate-student
{ fullName: 'a'.repeat(161), expected: 400 },
{ groupName: 'a'.repeat(81), expected: 400 },
{ personalCode: 'A'.repeat(13), expected: 400 },
{ fingerprint: 'a'.repeat(129), expected: 400 },
// save-draft
{ responses: Array(5).fill(validResponse), expected: 400 },
{ responses: [{ questionId: validUuid, text: 'a'.repeat(5_001) }], expected: 400 },
{ responses: [validResponse, validResponse], expected: 400 },
{ responses: [{ questionId: 'bad', text: '' }], expected: 400 },
{ responses: [{ ...validResponse, extra: true }], expected: 400 },
{ expectedVersion: -1, expected: 400 },
// submit-assessment
{ token: 'a'.repeat(257), expected: 400 },
{ clientSubmissionKey: 'a'.repeat(257), expected: 400 },
{ expectedVersion: -1, expected: 400 },
{ confirmed: false, expected: 400 },
```

Assert dependency spies are not called on 400/413.

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run supabase/functions/validate-student/handler.test.ts supabase/functions/save-draft/handler.test.ts supabase/functions/submit-assessment/handler.test.ts`

Expected: FAIL because handlers parse `request.json()` directly or cast response items.

- [ ] **Step 3: Harden `validate-student`**

```ts
const body = await readJsonObject(request, {
  maxBytes: INPUT_LIMITS.edgeBodyBytes.validateStudent,
  allowedFields: ['assessmentSlug', 'fullName', 'groupName', 'personalCode', 'fingerprint'],
});
```

Require nonblank bounded strings with maxima 200/160/80/12/128. Catch `RequestBodyError` before the authentication catch and return its status with the existing generic message.

- [ ] **Step 4: Harden `save-draft` without casts**

Load accepts exactly `action`, `token`, `clientSubmissionKey`; save additionally accepts `expectedVersion`, `responses`. Token/key are nonblank and at most 256. Save requires integer version >= 0, 0–4 responses, exact `questionId`/`text` fields, UUID, string text <= 5.000 Unicode points and unique question IDs.

After predicates pass, build the typed array:

```ts
const responses: DraftResponse[] = body.responses.map((item) => ({ questionId: item.questionId, text: item.text }));
```

Map parser size to 413, other input errors to 400, RPC invalid session to 401, and conflict to 409.

- [ ] **Step 5: Harden `submit-assessment`**

Read at most 4 KB with exact fields `token`, `clientSubmissionKey`, `expectedVersion`, `confirmed`. Require bounded strings, version >= 0 and literal `true`. Return 400/413 with safe copy.

- [ ] **Step 6: Confirm GREEN and commit**

Run: `npx vitest run supabase/functions/validate-student/handler.test.ts supabase/functions/save-draft/handler.test.ts supabase/functions/submit-assessment/handler.test.ts && npx eslint supabase/functions/_shared/http.ts supabase/functions/validate-student/handler.ts supabase/functions/save-draft/handler.ts supabase/functions/submit-assessment/handler.ts`

```bash
git add supabase/functions/validate-student/handler.ts supabase/functions/validate-student/handler.test.ts supabase/functions/save-draft/handler.ts supabase/functions/save-draft/handler.test.ts supabase/functions/submit-assessment/handler.ts supabase/functions/submit-assessment/handler.test.ts
git commit -m "fix: validar entradas de sesiones estudiantiles"
```

---

### Task 6: Límites persistentes y RPC de borrador/evaluación

**Files:**
- Create: `supabase/migrations/20260906181000_persisted_input_limits.sql`
- Modify: `src/test/db/student-draft-flow.test.ts`
- Modify: `src/test/db/assessment-flow.test.ts`
- Modify: `src/test/db/migrations.test.ts`
- Modify: `src/test/db/migrations-source.test.ts`

**Interfaces:**
- Consumes: `save_student_draft(text,text,integer,jsonb)` y `save_assessment_draft(jsonb,jsonb)`.
- Produces: mismas firmas y éxitos; añade rechazo determinista antes de mutar.

- [ ] **Step 1: Add failing PGlite response tests**

```ts
const saveResponses = async (
  seeded: { questionId: string },
  text: string,
  expectedVersion: number,
) =>
  (await db.query<{ result: { ok: boolean; error?: string } }>(
    `select public.save_student_draft('token-hash','client-key',$1,$2::jsonb) as result`,
    [expectedVersion, JSON.stringify([{ questionId: seeded.questionId, text }])],
  )).rows[0].result;

it('guarda 5.000 caracteres y rechaza 5.001', async () => {
  const seeded = await seed();
  await db.exec('set role service_role');
  expect(await saveResponses(seeded, '😀'.repeat(5_000), 0)).toMatchObject({ ok: true });
  expect(await saveResponses(seeded, 'a'.repeat(5_001), 1)).toMatchObject({ ok: false, error: 'invalid responses' });
});

it('rechaza formas inválidas sin mutar texto ni versión', async () => {
  const seeded = await seed();
  await db.exec('set role service_role');
  const valid = { questionId: seeded.questionId, text: 'respuesta' };
  const payloads = [
    Array(5).fill(valid),
    [valid, valid],
    [{ ...valid, extra: true }],
    [{ questionId: seeded.questionId, text: 7 }],
    [{ questionId: 'no-uuid', text: 'respuesta' }],
  ];
  for (const payload of payloads) {
    const before = await db.query(`select draft_version from public.submissions where id = $1`, [seeded.submissionId]);
    const result = await db.query<{ result: { ok: boolean; error: string } }>(
      `select public.save_student_draft('token-hash','client-key',0,$1::jsonb) as result`,
      [JSON.stringify(payload)],
    );
    expect(result.rows[0].result).toEqual({ ok: false, error: 'invalid responses' });
    const after = await db.query(`select draft_version from public.submissions where id = $1`, [seeded.submissionId]);
    expect(after.rows).toEqual(before.rows);
  }
});
```

In `assessment-flow.test.ts`, use table-driven fixtures for each exact maximum and maximum + 1. Include table-level response 5.000/5.001 and group name 80/81.

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run src/test/db/student-draft-flow.test.ts src/test/db/assessment-flow.test.ts src/test/db/migrations.test.ts src/test/db/migrations-source.test.ts`

- [ ] **Step 3: Generate the migration**

Run: `npx supabase migration new persisted_input_limits`

Rename only the new empty file to `supabase/migrations/20260906181000_persisted_input_limits.sql`.

- [ ] **Step 4: Add a non-destructive compatibility gate**

```sql
do $$
begin
  if exists (select 1 from public.responses where pg_catalog.char_length(original_text) > 5000) then raise exception 'preflight: responses exceed 5000 characters'; end if;
  if exists (select 1 from public.groups where pg_catalog.char_length(name) > 80) then raise exception 'preflight: group names exceed 80 characters'; end if;
  if exists (select 1 from public.students group by group_id having pg_catalog.count(*) > 50) then raise exception 'preflight: groups exceed 50 students'; end if;
  if exists (select 1 from public.assessments where pg_catalog.char_length(slug) > 200 or pg_catalog.char_length(title) > 160 or pg_catalog.char_length(purpose) > 1000 or pg_catalog.char_length(reading_text) > 30000 or pg_catalog.char_length(general_instructions) > 6000 or pg_catalog.char_length(coalesce(curriculum_version, '')) > 80) then raise exception 'preflight: assessments exceed input limits'; end if;
  if exists (select 1 from public.questions where pg_catalog.char_length(prompt) > 2000 or pg_catalog.char_length(instructions) > 4000) then raise exception 'preflight: questions exceed input limits'; end if;
  if exists (select 1 from public.students where exists (select 1 from pg_catalog.unnest(authorized_variants) value where pg_catalog.char_length(value) > 160)) then raise exception 'preflight: student variants exceed 160 characters'; end if;
end;
$$;
```

- [ ] **Step 5: Add named constraints**

```sql
create or replace function public.text_array_values_within(p_values text[], p_max integer)
returns boolean language sql immutable strict set search_path = ''
as $$ select pg_catalog.coalesce(pg_catalog.bool_and(pg_catalog.char_length(value) <= p_max), true) from pg_catalog.unnest(p_values) value $$;
revoke all on function public.text_array_values_within(text[], integer) from public, anon, authenticated;

alter table public.groups add constraint groups_name_length check (pg_catalog.char_length(name) <= 80);
alter table public.students add constraint students_authorized_variants_length check (public.text_array_values_within(authorized_variants, 160));
alter table public.assessments
  add constraint assessments_slug_length check (pg_catalog.char_length(slug) <= 200),
  add constraint assessments_title_length check (pg_catalog.char_length(title) <= 160),
  add constraint assessments_purpose_length check (pg_catalog.char_length(purpose) <= 1000),
  add constraint assessments_reading_length check (pg_catalog.char_length(reading_text) <= 30000),
  add constraint assessments_instructions_length check (pg_catalog.char_length(general_instructions) <= 6000),
  add constraint assessments_curriculum_length check (pg_catalog.char_length(coalesce(curriculum_version, '')) <= 80);
alter table public.questions
  add constraint questions_prompt_length check (pg_catalog.char_length(prompt) <= 2000),
  add constraint questions_instructions_length check (pg_catalog.char_length(instructions) <= 4000);
alter table public.responses add constraint responses_original_text_length check (pg_catalog.char_length(original_text) <= 5000);
alter table public.submissions add constraint submissions_client_key_length check (pg_catalog.char_length(client_submission_key) <= 256);
alter table public.student_sessions add constraint student_sessions_token_hash_length check (pg_catalog.char_length(token_hash) <= 128);
alter table public.access_rate_limits add constraint access_rate_fingerprint_hash_length check (pg_catalog.char_length(client_fingerprint_hash) <= 128);
```

- [ ] **Step 6: Replace `save_student_draft` with strict pre-mutation checks**

Preserve current session lookup, conflict response, upsert, deletion and version increment. Before the loop require version >= 0, array <= 4, exact keys, string values, valid UUID text, text <= 5.000, no duplicate questions, and membership in the current assessment:

```sql
if p_expected_version < 0
   or pg_catalog.jsonb_typeof(p_responses) is distinct from 'array'
   or pg_catalog.jsonb_array_length(p_responses) > 4
   or exists (
     select 1 from pg_catalog.jsonb_array_elements(p_responses) item(value)
      where pg_catalog.jsonb_typeof(item.value) is distinct from 'object'
         or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(item.value)) <> 2
         or not (item.value ?& array['questionId', 'text'])
         or pg_catalog.jsonb_typeof(item.value -> 'questionId') is distinct from 'string'
         or pg_catalog.jsonb_typeof(item.value -> 'text') is distinct from 'string'
         or (item.value ->> 'questionId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or pg_catalog.char_length(item.value ->> 'text') > 5000
   )
   or (select pg_catalog.count(*) from pg_catalog.jsonb_array_elements(p_responses))
      <> (select pg_catalog.count(distinct item.value ->> 'questionId') from pg_catalog.jsonb_array_elements(p_responses) item(value))
then return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid responses'); end if;
```

- [ ] **Step 7: Harden `save_assessment_draft`**

Before insert/update require JSON string types and exact limits for assessment fields and every question. Use stable exceptions `assessment fields exceed limits` and `question fields exceed limits`. Preserve role, positions, dates, rubric and existing write logic.

- [ ] **Step 8: Confirm GREEN and commit**

Run: `npx vitest run src/test/db`

```bash
git add supabase/migrations/20260906181000_persisted_input_limits.sql src/test/db/student-draft-flow.test.ts src/test/db/assessment-flow.test.ts src/test/db/migrations.test.ts src/test/db/migrations-source.test.ts
git commit -m "fix: aplicar limites en postgres"
```

---

### Task 7: Contador y límite de respuesta estudiantil

**Files:**
- Create: `src/features/student/StudentQuestionResponse.test.tsx`
- Modify: `src/features/student/StudentQuestionResponse.tsx`
- Modify: `src/features/student/StudentResponseScreen.test.tsx`
- Modify: `src/features/student/StudentResponseScreen.submit.test.tsx`

**Interfaces:**
- Consumes: `INPUT_LIMITS.responseChars`, `unicodeLength`, `truncateUnicode`.
- Produces: `onChange` nunca recibe más de 5.000 puntos; pegado restringido conserva comillas y máximo de 40 palabras.

- [ ] **Step 1: Write failing component tests**

```tsx
it('muestra el contador para 5.000 puntos Unicode', () => {
  renderQuestion({ response: '😀'.repeat(5_000) });
  expect(screen.getByText('5.000 de 5.000 caracteres')).toBeInTheDocument();
});
it('limita en cliente la entrada 5.001', () => {
  const onChange = vi.fn();
  renderQuestion({ response: '', onChange });
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a'.repeat(5_001) } });
  expect(onChange).toHaveBeenLastCalledWith('a'.repeat(5_000));
});
it('rechaza una cita si el resultado superaría 5.000', () => {
  const onChange = vi.fn();
  renderQuestion({ response: 'a'.repeat(4_995), readingText: 'evidencia textual', onChange });
  paste(screen.getByRole('textbox'), 'evidencia textual');
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(/superaría 5.000 caracteres/i);
});
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run src/features/student/StudentQuestionResponse.test.tsx`

- [ ] **Step 3: Implement controlled Unicode length**

```tsx
const characterCount = unicodeLength(response);
const counterId = `response-${question.id}-character-count`;

onChange={(event) => {
  onChange(truncateUnicode(event.target.value, INPUT_LIMITS.responseChars));
  setPasteNotice(null);
}}

<p id={counterId} className="field-hint" aria-live="polite">
  {characterCount.toLocaleString('es-EC')} de 5.000 caracteres
</p>
```

Add `counterId` to `aria-describedby`; retain suggested word guidance.

- [ ] **Step 4: Guard restricted paste**

Build the candidate including `result.text`, which already carries automatic quotation marks. If `unicodeLength(candidate) > 5_000`, set the specific notice and return before `onChange`; otherwise preserve cursor restoration.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run src/features/student/StudentQuestionResponse.test.tsx src/features/student/StudentResponseScreen.test.tsx src/features/student/StudentResponseScreen.submit.test.tsx src/features/student/readingPaste.test.ts`

```bash
git add src/features/student/StudentQuestionResponse.tsx src/features/student/StudentQuestionResponse.test.tsx src/features/student/StudentResponseScreen.test.tsx src/features/student/StudentResponseScreen.submit.test.tsx
git commit -m "feat: limitar respuestas a cinco mil caracteres"
```

---

### Task 8: Límites visibles en acceso y editor docente

**Files:**
- Modify: `src/features/student/StudentAccessScreen.tsx`
- Modify: `src/features/student/StudentAccessScreen.test.tsx`
- Modify: `src/lib/api/studentAssessment.ts`
- Modify: `src/lib/api/studentAssessment.test.ts`
- Modify: `src/features/assessment/assessmentSchemas.ts`
- Modify: `src/features/assessment/assessmentSchemas.test.ts`
- Modify: `src/features/assessment/AssessmentEditorScreen.tsx`
- Modify: `src/features/assessment/AssessmentEditorScreen.test.tsx`

**Interfaces:**
- Consumes: `INPUT_LIMITS`, `unicodeLength`.
- Produces: client no más permisivo que Edge/PostgreSQL.

- [ ] **Step 1: Write failing access tests**

```tsx
expect(screen.getByLabelText(/nombres y apellidos/i)).toHaveAttribute('maxlength', '160');
expect(screen.getByLabelText(/paralelo/i)).toHaveAttribute('maxlength', '80');
expect(screen.getByLabelText(/código personal/i)).toHaveAttribute('maxlength', '12');
```

In `studentAssessment.test.ts`, assert 161/81/13/129/201 input is rejected before `functions.invoke`.

- [ ] **Step 2: Confirm access RED**

Run: `npx vitest run src/features/student/StudentAccessScreen.test.tsx src/lib/api/studentAssessment.test.ts`

- [ ] **Step 3: Add and use the input schema**

```ts
export const validateStudentInputSchema = z.object({
  assessmentSlug: z.string().trim().min(1).refine((v) => unicodeLength(v) <= INPUT_LIMITS.assessment.slugChars),
  fullName: z.string().trim().min(1).refine((v) => unicodeLength(v) <= INPUT_LIMITS.access.fullNameChars),
  groupName: z.string().trim().min(1).refine((v) => unicodeLength(v) <= INPUT_LIMITS.access.groupNameChars),
  personalCode: z.string().trim().min(1).refine((v) => unicodeLength(v) <= INPUT_LIMITS.access.personalCodeChars),
  fingerprint: z.string().trim().min(1).refine((v) => unicodeLength(v) <= INPUT_LIMITS.access.fingerprintChars),
});
```

Parse before invoking the function. Add `maxLength={160}`, `{80}`, `{12}` to access fields.

- [ ] **Step 4: Use shared assessment constants and exact boundary tests**

Replace numeric literals in `assessmentSchemas.ts` with `INPUT_LIMITS.assessment.*`. Add table-driven tests for every exact limit and +1, plus question count 1/4 accepted and 0/5 rejected.

- [ ] **Step 5: Add native editor maxima**

Add `maxLength` 160/1.000/30.000/6.000/80/2.000/4.000 to title, purpose, reading, general instructions, curriculum, prompt and question instructions. Keep AI draft parsing through the same Zod schema.

- [ ] **Step 6: Verify and commit**

Run: `npx vitest run src/features/student/StudentAccessScreen.test.tsx src/lib/api/studentAssessment.test.ts src/features/assessment/assessmentSchemas.test.ts src/features/assessment/AssessmentEditorScreen.test.tsx src/features/assessment/AssessmentEditorScreen.ai.test.tsx`

```bash
git add src/features/student/StudentAccessScreen.tsx src/features/student/StudentAccessScreen.test.tsx src/lib/api/studentAssessment.ts src/lib/api/studentAssessment.test.ts src/features/assessment/assessmentSchemas.ts src/features/assessment/assessmentSchemas.test.ts src/features/assessment/AssessmentEditorScreen.tsx src/features/assessment/AssessmentEditorScreen.test.tsx
git commit -m "fix: alinear limites de formularios"
```

---

### Task 9: Límite de IA y documentación

**Files:**
- Modify: `supabase/functions/_shared/aiEvaluation.ts:5-12`
- Modify: `supabase/functions/evaluate-submission/submissionSource.ts:100-112`
- Modify: `supabase/functions/evaluate-submission/submissionSource.test.ts:64-84`
- Modify: `README.md:25-90`
- Modify: `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md`
- Modify: `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`
- Modify: `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`

**Interfaces:**
- Consumes: `INPUT_LIMITS.responseChars`, `unicodeLength`.
- Produces: AI source accepts 5.000 and rejects 5.001 Unicode points.

- [ ] **Step 1: Change the failing source boundary**

```ts
expect(() => buildSubmissionEvaluationSource({ ...input, responses: [{ ...input.responses[0], original_text: '😀'.repeat(5_000) }] })).not.toThrow();
expect(detailOf(() => buildSubmissionEvaluationSource({ ...input, responses: [{ ...input.responses[0], original_text: '😀'.repeat(5_001) }] }))).toBe('response_too_long');
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run supabase/functions/evaluate-submission/submissionSource.test.ts`

- [ ] **Step 3: Reuse the shared ceiling**

```ts
import { INPUT_LIMITS, unicodeLength } from './inputLimits.ts';
export const EVALUATION_LIMITS = {
  responseMaxChars: INPUT_LIMITS.responseChars,
  reasonMaxChars: 1_200,
  evidenceMaxChars: 600,
  evidenceCountMax: 4,
  observationFragmentMaxChars: 600,
  observationExplanationMaxChars: 1_200,
  textItemMaxChars: 600,
  textItemCountMax: 8,
  limitationCountMax: 8,
} as const;
```

Replace `responseText.length` with `unicodeLength(responseText)` in `submissionSource.ts`.

- [ ] **Step 4: Update current documentation facts**

Document 5.000 characters, 50 students, RPC-only roster writes and 413 behavior. Correct README’s stale statement that teacher review remains pending. Add the decisions to the master document without renaming its historical filename. Do not claim remote deployment until Task 10 succeeds.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run supabase/functions/evaluate-submission && npx prettier --check README.md GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`

```bash
git add supabase/functions/_shared/aiEvaluation.ts supabase/functions/evaluate-submission/submissionSource.ts supabase/functions/evaluate-submission/submissionSource.test.ts README.md GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md
git commit -m "fix: alinear limite de evaluacion con persistencia"
```

---

### Task 10: Verificación, preflight, despliegue y smokes

**Files:**
- Modify after deployment: `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`

**Interfaces:**
- Consumes: Tasks 1–9.
- Produces: remote DB and four functions deployed, plus non-sensitive evidence.

- [ ] **Step 1: Run local gates**

Run: `npm run verify`

Expected: lint with zero warnings, Prettier, TypeScript, Vitest and Vite build pass.

Run: `npx -y react-doctor@latest . --verbose --diff`

Expected: no new blocking React issue; unrelated warnings are recorded, not expanded into this change.

- [ ] **Step 2: Run read-only production preflight**

Against linked project `qwqugnbmncrwcemxwutc`, run without selecting names or text:

```sql
select
  (select count(*) from public.responses where char_length(original_text) > 5000) as long_responses,
  (select count(*) from public.groups where char_length(name) > 80) as long_group_names,
  (select count(*) from public.students where exists (select 1 from unnest(authorized_variants) value where char_length(value) > 160)) as long_authorized_variants,
  (select count(*) from (select group_id from public.students group by group_id having count(*) > 50) excessive_groups) as groups_over_50,
  (select count(*) from public.assessments where char_length(slug) > 200 or char_length(title) > 160 or char_length(purpose) > 1000 or char_length(reading_text) > 30000 or char_length(general_instructions) > 6000 or char_length(coalesce(curriculum_version, '')) > 80) as excessive_assessments,
  (select count(*) from public.questions where char_length(prompt) > 2000 or char_length(instructions) > 4000) as excessive_questions;
```

Expected: all zero. Stop if not; never truncate or delete.

- [ ] **Step 3: Preview and apply migrations**

Run: `npx supabase db push --linked --dry-run`

Expected: only the two new migrations are pending.

Run: `npx supabase db push --linked`

- [ ] **Step 4: Deploy affected functions**

```bash
npx supabase functions deploy validate-student --project-ref qwqugnbmncrwcemxwutc
npx supabase functions deploy save-draft --project-ref qwqugnbmncrwcemxwutc
npx supabase functions deploy submit-assessment --project-ref qwqugnbmncrwcemxwutc
npx supabase functions deploy evaluate-submission --project-ref qwqugnbmncrwcemxwutc
```

- [ ] **Step 5: Run safe remote rejection smokes**

Send oversized anonymous bodies and assert 413. Send malformed small bodies and assert 400 generic responses. Evaluate a submission only with synthetic data; otherwise rely on local evaluation source tests and test remote authentication/method behavior.

- [ ] **Step 6: Run application smokes**

Verify local and Pages: teacher login; 50-student hint and small CSV/XLSX preview; valid draft save; student access; response counter; quoted reading paste; rejected 5.001st character; existing submission and teacher evaluation views.

- [ ] **Step 7: Record and commit actual deployment state**

Update `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md` with migration names, function versions, test totals and smoke results. Do not claim Pages updated before its workflow succeeds.

```bash
git add ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md
git commit -m "docs: registrar despliegue de limites"
```

- [ ] **Step 8: Push and verify CI/Pages**

Run: `git push origin master`

Expected: Verify and Deploy Pages finish green; `https://alejandrocordova1993.github.io/ychaynan-lite/` serves the update.

---

## Final Acceptance Checklist

- [ ] Browser, Edge, RPC and table accept response 5.000 and reject 5.001 Unicode points.
- [ ] Parser accepts 50 rows and rejects 51; server prevents group totals over 50 atomically.
- [ ] Browser no longer calls `from('students').insert(...)`.
- [ ] `authenticated` has no direct `INSERT` on `public.students`.
- [ ] `PUBLIC` and `anon` cannot execute the roster RPC.
- [ ] Assessment and access limits match across client and server.
- [ ] Oversized HTTP bodies return 413 before business dependencies run.
- [ ] Incompatible existing data is reported, never truncated or deleted.
- [ ] AI never accepts a response above the persisted ceiling.
- [ ] Full verification, React Doctor, remote migration, Edge deployment and Pages workflow are evidenced.
