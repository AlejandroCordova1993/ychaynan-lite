// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';

let db: PGlite;

beforeEach(async () => {
  db = await createTestDatabase();
});
afterEach(async () => db.close());

async function seedAccess(state: 'unused' | 'blocked' | 'submitted', suffix = '') {
  const group = await db.query<{ id: string }>(
    `insert into public.groups (name, school_year) values ($1, '2026') returning id`,
    [`3ro BGU A${suffix}`],
  );
  const student = await db.query<{ id: string }>(
    `insert into public.students (group_id, full_name_original, full_name_normalized)
     values ($1, 'Ana Ruiz', 'ana ruiz') returning id`,
    [group.rows[0].id],
  );
  const assessment = await db.query<{ id: string }>(
    `insert into public.assessments
       (slug, title, purpose, reading_text, status, rubric_snapshot, rubric_schema_version, rubric_hash)
     values ($1, 'Diagnóstico', 'Base', 'Lectura', 'draft', '{}'::jsonb, '1.0', 'hash')
     returning id`,
    [`gestion-acceso${suffix.split(' ').join('-')}`],
  );
  const access = await db.query<{ id: string }>(
    `insert into public.assessment_access
       (assessment_id, student_id, code_hash, state, failed_attempts, cooldown_until)
     values ($1, $2, 'hash-anterior', $3, 7, now() + interval '10 minutes') returning id`,
    [assessment.rows[0].id, student.rows[0].id, state],
  );
  return access.rows[0].id;
}

describe('gestión privada de accesos', () => {
  it('regenera un código no entregado y limpia bloqueos anteriores', async () => {
    const accessId = await seedAccess('blocked');
    await db.exec('set role service_role');
    await db.query(`select public.regenerate_assessment_access($1, 'hash-nuevo')`, [accessId]);
    const access = await db.query<{
      code_hash: string;
      state: string;
      failed_attempts: number;
      cooldown_until: string | null;
    }>(
      `select code_hash, state, failed_attempts, cooldown_until from public.assessment_access where id = $1`,
      [accessId],
    );
    expect(access.rows[0]).toEqual({
      code_hash: 'hash-nuevo',
      state: 'unused',
      failed_attempts: 0,
      cooldown_until: null,
    });
  });

  it('desbloquea sin cambiar el código y rechaza cualquier cambio tras la entrega', async () => {
    const blockedId = await seedAccess('blocked');
    await db.exec('set role service_role');
    await db.query(`select public.unblock_assessment_access($1)`, [blockedId]);
    const unblocked = await db.query<{ state: string; code_hash: string }>(
      `select state, code_hash from public.assessment_access where id = $1`,
      [blockedId],
    );
    expect(unblocked.rows[0]).toEqual({ state: 'unused', code_hash: 'hash-anterior' });

    await db.exec('reset role');
    const submittedId = await seedAccess('submitted', ' segundo');
    await db.exec('set role service_role');
    await expect(
      db.query(`select public.regenerate_assessment_access($1, 'otro-hash')`, [submittedId]),
    ).rejects.toThrow(/submitted/i);
    await expect(
      db.query(`select public.unblock_assessment_access($1)`, [submittedId]),
    ).rejects.toThrow(/submitted/i);
  });
});
