// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';

let db: PGlite;

beforeEach(async () => {
  db = await createTestDatabase();
});

afterEach(async () => {
  await db.close();
});

async function seedDraft() {
  const group = await db.query<{ id: string }>(
    `insert into public.groups (name, school_year) values ('3ro BGU A', '2026-2027') returning id`,
  );
  const students = await db.query<{ id: string }>(
    `insert into public.students (group_id, full_name_original, full_name_normalized)
     values ($1, 'Ana Ruiz', 'ana ruiz'), ($1, 'Luis Peña', 'luis peña') returning id`,
    [group.rows[0].id],
  );
  const assessment = await db.query<{ id: string }>(
    `insert into public.assessments
       (slug, title, purpose, reading_text, rubric_snapshot, rubric_schema_version, rubric_hash)
     values ('diagnostico-acceso', 'Diagnóstico', 'Línea base', 'Lectura', '{}'::jsonb, '1.0', 'hash')
     returning id`,
  );
  await db.query(
    `insert into public.questions (assessment_id, position, prompt, active_criteria)
     values ($1, 1, 'Pregunta', array['core.pertinencia'])`,
    [assessment.rows[0].id],
  );
  return {
    groupId: group.rows[0].id,
    studentIds: students.rows.map(({ id }) => id),
    assessmentId: assessment.rows[0].id,
  };
}

async function openAssessment(
  assessmentId: string,
  groupId: string,
  accesses: Array<{ student_id: string; code_hash: string }>,
) {
  return db.query<{ open_assessment_with_accesses: string }>(
    `select public.open_assessment_with_accesses($1, $2, $3::jsonb)`,
    [assessmentId, groupId, JSON.stringify(accesses)],
  );
}

describe('open_assessment_with_accesses', () => {
  it('abre el borrador y crea exactamente un acceso por estudiante activo', async () => {
    const seeded = await seedDraft();
    await db.exec('set role service_role');

    const result = await openAssessment(seeded.assessmentId, seeded.groupId, [
      { student_id: seeded.studentIds[0], code_hash: 'hash-ana' },
      { student_id: seeded.studentIds[1], code_hash: 'hash-luis' },
    ]);
    const assessment = await db.query<{ status: string; opened_at: string | null }>(
      `select status, opened_at from public.assessments where id = $1`,
      [seeded.assessmentId],
    );
    const accesses = await db.query<{ student_id: string; state: string }>(
      `select student_id, state from public.assessment_access where assessment_id = $1 order by student_id`,
      [seeded.assessmentId],
    );

    expect(result.rows[0].open_assessment_with_accesses).toBe(seeded.assessmentId);
    expect(assessment.rows[0].status).toBe('open');
    expect(assessment.rows[0].opened_at).not.toBeNull();
    expect(accesses.rows).toHaveLength(2);
    expect(accesses.rows.every(({ state }) => state === 'unused')).toBe(true);
  });

  it('revierte la apertura completa si falta un estudiante del paralelo', async () => {
    const seeded = await seedDraft();
    await db.exec('set role service_role');

    await expect(
      openAssessment(seeded.assessmentId, seeded.groupId, [
        { student_id: seeded.studentIds[0], code_hash: 'hash-ana' },
      ]),
    ).rejects.toThrow(/every active student/i);

    const assessment = await db.query<{ status: string }>(
      `select status from public.assessments where id = $1`,
      [seeded.assessmentId],
    );
    const accesses = await db.query<{ count: number }>(
      `select count(*)::integer as count from public.assessment_access`,
    );
    expect(assessment.rows[0].status).toBe('draft');
    expect(accesses.rows[0].count).toBe(0);
  });

  it('no puede ejecutarse desde anon ni authenticated', async () => {
    const privileges = await db.query<{
      anon_execute: boolean;
      authenticated_execute: boolean;
      service_execute: boolean;
    }>(
      `select
         has_function_privilege('anon', 'public.open_assessment_with_accesses(uuid,uuid,jsonb)', 'execute') as anon_execute,
         has_function_privilege('authenticated', 'public.open_assessment_with_accesses(uuid,uuid,jsonb)', 'execute') as authenticated_execute,
         has_function_privilege('service_role', 'public.open_assessment_with_accesses(uuid,uuid,jsonb)', 'execute') as service_execute`,
    );

    expect(privileges.rows[0]).toEqual({
      anon_execute: false,
      authenticated_execute: false,
      service_execute: true,
    });
  });
});
