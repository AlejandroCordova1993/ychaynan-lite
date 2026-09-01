// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';

let db: PGlite;
beforeEach(async () => {
  db = await createTestDatabase();
});
afterEach(async () => db.close());

it('usa el código para distinguir homónimos del mismo paralelo', async () => {
  const group = await db.query<{ id: string }>(
    `insert into public.groups (name, school_year) values ('3ro A','2026') returning id`,
  );
  const assessment = await db.query<{ id: string }>(
    `insert into public.assessments (slug,title,purpose,reading_text,status,rubric_snapshot,rubric_schema_version,rubric_hash,opened_at) values ('diag','D','P','L','open','{}','1','h',now()) returning id`,
  );
  for (const [reference, code] of [
    ['uno', 'hash-1'],
    ['dos', 'hash-2'],
  ]) {
    const student = await db.query<{ id: string }>(
      `insert into public.students (group_id,full_name_original,full_name_normalized,external_reference) values ($1,'Ana Ruiz','ana ruiz',$2) returning id`,
      [group.rows[0].id, reference],
    );
    await db.query(
      `insert into public.assessment_access (assessment_id,student_id,code_hash) values ($1,$2,$3)`,
      [assessment.rows[0].id, student.rows[0].id, code],
    );
  }
  await db.exec('set role service_role');
  const result = await db.query<{ result: { ok: boolean } }>(
    `select public.validate_student_access('diag','ana ruiz','3ro a','hash-2','fp','token','key',180) as result`,
  );
  expect(result.rows[0].result.ok).toBe(true);
  const active = await db.query<{ external_reference: string }>(
    `select s.external_reference from public.assessment_access aa join public.students s on s.id=aa.student_id where aa.state='active'`,
  );
  expect(active.rows).toEqual([{ external_reference: 'dos' }]);
});
