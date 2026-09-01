// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';

let db: PGlite;
beforeEach(async () => {
  db = await createTestDatabase();
});
afterEach(async () => db.close());

async function seed() {
  const group = await db.query<{ id: string }>(
    `insert into public.groups (name,school_year) values ('3ro A','2026') returning id`,
  );
  const student = await db.query<{ id: string }>(
    `insert into public.students (group_id,full_name_original,full_name_normalized) values ($1,'Ana','ana') returning id`,
    [group.rows[0].id],
  );
  const assessment = await db.query<{ id: string }>(
    `insert into public.assessments (slug,title,purpose,reading_text,status,rubric_snapshot,rubric_schema_version,rubric_hash) values ('diag','Diagnóstico','Base','Lectura','draft','{}','1','h') returning id`,
  );
  const question = await db.query<{ id: string }>(
    `insert into public.questions (assessment_id,position,prompt) values ($1,1,'Pregunta') returning id`,
    [assessment.rows[0].id],
  );
  await db.query(`update public.assessments set status='open', opened_at=now() where id=$1`, [
    assessment.rows[0].id,
  ]);
  const access = await db.query<{ id: string }>(
    `insert into public.assessment_access (assessment_id,student_id,code_hash,state) values ($1,$2,'h','active') returning id`,
    [assessment.rows[0].id, student.rows[0].id],
  );
  await db.query(
    `insert into public.student_sessions (assessment_access_id,token_hash,expires_at) values ($1,'token-hash',now()+interval '2 hours')`,
    [access.rows[0].id],
  );
  const submission = await db.query<{ id: string }>(
    `insert into public.submissions (assessment_id,student_id,client_submission_key) values ($1,$2,'client-key') returning id`,
    [assessment.rows[0].id, student.rows[0].id],
  );
  return { questionId: question.rows[0].id, submissionId: submission.rows[0].id };
}

describe('save_student_draft', () => {
  it('guarda versión 0 como 1 sin alterar el texto original', async () => {
    const seeded = await seed();
    await db.exec('set role service_role');
    const result = await db.query<{ result: { ok: boolean; draftVersion: number } }>(
      `select public.save_student_draft('token-hash','client-key',0,$1::jsonb) as result`,
      [JSON.stringify([{ questionId: seeded.questionId, text: '  Él dijo:\n"sí"  ' }])],
    );
    expect(result.rows[0].result).toMatchObject({ ok: true, draftVersion: 1 });
    const stored = await db.query<{ original_text: string }>(
      `select original_text from public.responses where submission_id=$1`,
      [seeded.submissionId],
    );
    expect(stored.rows[0].original_text).toBe('  Él dijo:\n"sí"  ');
  });

  it('devuelve conflicto y no sobrescribe cuando la versión esperada está atrasada', async () => {
    const seeded = await seed();
    await db.exec('set role service_role');
    await db.query(`select public.save_student_draft('token-hash','client-key',0,$1::jsonb)`, [
      JSON.stringify([{ questionId: seeded.questionId, text: 'primero' }]),
    ]);
    const conflict = await db.query<{
      result: { ok: boolean; conflict: boolean; draftVersion: number };
    }>(`select public.save_student_draft('token-hash','client-key',0,$1::jsonb) as result`, [
      JSON.stringify([{ questionId: seeded.questionId, text: 'segundo' }]),
    ]);
    expect(conflict.rows[0].result).toMatchObject({ ok: false, conflict: true, draftVersion: 1 });
    const stored = await db.query<{ original_text: string }>(
      `select original_text from public.responses where submission_id=$1`,
      [seeded.submissionId],
    );
    expect(stored.rows[0].original_text).toBe('primero');
  });
});
