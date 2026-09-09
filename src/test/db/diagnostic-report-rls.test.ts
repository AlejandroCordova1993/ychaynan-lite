// @vitest-environment node
//
// Task 8 del plan «Resumen diagnóstico y exportación»: esta prueba es una
// regresión de RLS, no una prueba de la Task 8 en sí. El plan no agregó
// ninguna migración; el cargador `src/lib/api/diagnosticReport.ts` (Task 2)
// lee `ai_evaluations`, `submissions`, `responses`, `students` y `groups`
// exclusivamente a través de las políticas "teacher full access" que ya
// existían antes de este bloque (`supabase/migrations/20260828000002_rls.sql`,
// endurecida para `ai_evaluations` en
// `supabase/migrations/20260908134926_align_identity_and_submission_contracts.sql`).
// Si alguna de esas políticas o privilegios desapareciera por accidente, esta
// prueba debe fallar.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDatabase } from './pgliteFixture';

let db: PGlite;

const TEACHER_ID = '00000000-0000-0000-0000-000000000001';

// Las cinco tablas que lee el cargador del resumen diagnóstico (§4 del spec).
const DIAGNOSTIC_TABLES = ['ai_evaluations', 'submissions', 'responses', 'students', 'groups'];

beforeEach(async () => {
  db = await createTestDatabase();
});

afterEach(async () => {
  await db.close();
});

async function setTeacherClaims(): Promise<void> {
  await db.exec(
    `select set_config('request.jwt.claims', '{"sub":"${TEACHER_ID}","app_metadata":{"role":"teacher"}}', false)`,
  );
}

async function setUntrustedClaims(): Promise<void> {
  await db.exec(`select set_config('request.jwt.claims', '{}', false)`);
}

/** Siembra una fila completa en cada una de las cinco tablas, para que un
 * SELECT vacío por RLS se distinga de un SELECT vacío por falta de datos. */
async function seedOneRowPerDiagnosticTable(): Promise<void> {
  const group = await db.query<{ id: string }>(
    `insert into public.groups (name, school_year) values ('3ro BGU A', '2026-2027') returning id`,
  );
  const groupId = group.rows[0].id;

  const student = await db.query<{ id: string }>(
    `insert into public.students (group_id, full_name_original, full_name_normalized)
     values ($1, 'Ana Ruiz', 'ana ruiz') returning id`,
    [groupId],
  );
  const studentId = student.rows[0].id;

  const assessment = await db.query<{ id: string }>(
    `insert into public.assessments
       (slug, title, purpose, reading_text, rubric_snapshot, rubric_schema_version, rubric_hash)
     values ('diagnostico-rls', 'Diagnóstico', 'piloto', 'lectura', '{}'::jsonb, '1.0', 'hash')
     returning id`,
  );
  const assessmentId = assessment.rows[0].id;

  const question = await db.query<{ id: string }>(
    `insert into public.questions (assessment_id, position, prompt) values ($1, 1, 'consigna') returning id`,
    [assessmentId],
  );
  const questionId = question.rows[0].id;

  const submission = await db.query<{ id: string }>(
    `insert into public.submissions (assessment_id, student_id, client_submission_key)
     values ($1, $2, 'rls-key') returning id`,
    [assessmentId, studentId],
  );
  const submissionId = submission.rows[0].id;

  await db.query(
    `insert into public.responses (submission_id, question_id, original_text, submitted_at)
     values ($1, $2, 'respuesta original', now())`,
    [submissionId, questionId],
  );

  await db.query(
    `insert into public.ai_evaluations
       (submission_id, rubric_schema_version, rubric_hash, prompt_version, provider, model, status, result_json)
     values ($1, '1.0', 'hash', 'v1', 'openai', 'modelo', 'completed', '{"questionResults":[]}'::jsonb)`,
    [submissionId],
  );
}

describe('RLS del resumen diagnóstico y exportación (Task 8, sin migraciones nuevas)', () => {
  it('anon no puede leer ninguna de las cinco tablas que usa el cargador del resumen', async () => {
    await seedOneRowPerDiagnosticTable();

    await db.exec('set role anon');
    for (const table of DIAGNOSTIC_TABLES) {
      await expect(
        db.query(`select * from public.${table}`),
        `anon no debería poder leer ${table}`,
      ).rejects.toThrow(/permission denied/);
    }
    await db.exec('reset role');
  });

  it('authenticated sin app_metadata.role=teacher no puede leer ninguna de las cinco tablas', async () => {
    await seedOneRowPerDiagnosticTable();

    await setUntrustedClaims();
    await db.exec('set role authenticated');
    for (const table of DIAGNOSTIC_TABLES) {
      const result = await db.query(`select * from public.${table}`);
      expect(
        result.rows,
        `authenticated sin rol docente no debería ver filas de ${table}`,
      ).toHaveLength(0);
    }
    await db.exec('reset role');
  });

  it('control positivo: una sesión docente autenticada SÍ puede leer las cinco tablas', async () => {
    await seedOneRowPerDiagnosticTable();

    await setTeacherClaims();
    await db.exec('set role authenticated');
    for (const table of DIAGNOSTIC_TABLES) {
      const result = await db.query(`select * from public.${table}`);
      expect(
        result.rows.length,
        `una sesión docente debería ver al menos una fila de ${table}`,
      ).toBeGreaterThan(0);
    }
    await db.exec('reset role');
  });

  it('no aparece ningún privilegio de escritura nuevo para authenticated sobre estas tablas', async () => {
    // `ai_evaluations` es de solo lectura para el cliente docente desde
    // 20260908134926_align_identity_and_submission_contracts.sql: los ajustes
    // se escriben únicamente vía la RPC `review_submission_evaluation`. Este
    // bloque no debía tocar ese privilegio y no lo hizo.
    const aiEvaluationsPrivileges = await db.query<{
      can_insert: boolean;
      can_update: boolean;
      can_delete: boolean;
    }>(
      `select
         has_table_privilege('authenticated', 'public.ai_evaluations', 'insert') as can_insert,
         has_table_privilege('authenticated', 'public.ai_evaluations', 'update') as can_update,
         has_table_privilege('authenticated', 'public.ai_evaluations', 'delete') as can_delete`,
    );
    expect(aiEvaluationsPrivileges.rows[0]).toEqual({
      can_insert: false,
      can_update: false,
      can_delete: false,
    });

    // `submissions`, `responses` y `groups` ya eran de lectura y escritura
    // completas para el docente antes de este bloque (el cargador solo agrega
    // lecturas nuevas, ninguna escritura). `students` es la excepción: el
    // bloque de endurecimiento de límites de entrada (anterior a este,
    // `20260906180000_atomic_roster_import.sql`) ya le había revocado
    // `INSERT` directo a `authenticated` — la nómina solo se escribe vía la
    // RPC `import_students_to_group`. Confirmamos que ese estado preexistente
    // (heredado, no introducido por este bloque) sigue exactamente igual.
    const fullReadWriteTables = ['submissions', 'responses', 'groups'];
    for (const table of fullReadWriteTables) {
      const privileges = await db.query<{
        can_insert: boolean;
        can_update: boolean;
        can_delete: boolean;
      }>(
        `select
           has_table_privilege('authenticated', $1, 'insert') as can_insert,
           has_table_privilege('authenticated', $1, 'update') as can_update,
           has_table_privilege('authenticated', $1, 'delete') as can_delete`,
        [`public.${table}`],
      );
      expect(
        privileges.rows[0],
        `privilegios de escritura de authenticated sobre ${table}`,
      ).toEqual({
        can_insert: true,
        can_update: true,
        can_delete: true,
      });
    }

    const studentsPrivileges = await db.query<{
      can_insert: boolean;
      can_update: boolean;
      can_delete: boolean;
    }>(
      `select
         has_table_privilege('authenticated', 'public.students', 'insert') as can_insert,
         has_table_privilege('authenticated', 'public.students', 'update') as can_update,
         has_table_privilege('authenticated', 'public.students', 'delete') as can_delete`,
    );
    expect(
      studentsPrivileges.rows[0],
      'privilegios de escritura de authenticated sobre students',
    ).toEqual({
      can_insert: false,
      can_update: true,
      can_delete: true,
    });

    // Ninguna de las cinco tablas concede nada a anon, en ningún privilegio.
    for (const table of DIAGNOSTIC_TABLES) {
      const anonPrivileges = await db.query<{
        can_select: boolean;
        can_insert: boolean;
        can_update: boolean;
        can_delete: boolean;
      }>(
        `select
           has_table_privilege('anon', $1, 'select') as can_select,
           has_table_privilege('anon', $1, 'insert') as can_insert,
           has_table_privilege('anon', $1, 'update') as can_update,
           has_table_privilege('anon', $1, 'delete') as can_delete`,
        [`public.${table}`],
      );
      expect(anonPrivileges.rows[0], `privilegios de anon sobre ${table}`).toEqual({
        can_select: false,
        can_insert: false,
        can_update: false,
        can_delete: false,
      });
    }
  });

  it('authenticated sin rol docente tampoco puede escribir en estas tablas (además de no poder leer)', async () => {
    await setUntrustedClaims();
    await db.exec('set role authenticated');

    await expect(
      db.query(`insert into public.groups (name, school_year) values ('intruso', '2026-2027')`),
    ).rejects.toThrow(/row-level security/);

    await db.exec('reset role');
  });
});
