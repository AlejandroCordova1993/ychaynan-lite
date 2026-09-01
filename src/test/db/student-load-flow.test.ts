// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';

let db: PGlite;
beforeEach(async () => {
  db = await createTestDatabase();
});
afterEach(async () => db.close());

it('carga lectura, preguntas y respuestas sin exponer la rúbrica', async () => {
  const group = await db.query<{ id: string }>(
    `insert into public.groups (name,school_year) values ('3ro A','2026') returning id`,
  );
  const student = await db.query<{ id: string }>(
    `insert into public.students (group_id,full_name_original,full_name_normalized) values ($1,'Ana','ana') returning id`,
    [group.rows[0].id],
  );
  const assessment = await db.query<{ id: string }>(
    `insert into public.assessments (slug,title,purpose,reading_text,status,rubric_snapshot,rubric_schema_version,rubric_hash) values ('diag','D','P','Lectura','draft','{"secreto":true}','1','h') returning id`,
  );
  const question = await db.query<{ id: string }>(
    `insert into public.questions (assessment_id,position,prompt) values ($1,1,'Pregunta') returning id`,
    [assessment.rows[0].id],
  );
  await db.query(`update public.assessments set status='open',opened_at=now() where id=$1`, [
    assessment.rows[0].id,
  ]);
  const access = await db.query<{ id: string }>(
    `insert into public.assessment_access (assessment_id,student_id,code_hash,state) values ($1,$2,'h','active') returning id`,
    [assessment.rows[0].id, student.rows[0].id],
  );
  await db.query(
    `insert into public.student_sessions (assessment_access_id,token_hash,expires_at) values ($1,'token',now()+interval '1 hour')`,
    [access.rows[0].id],
  );
  const submission = await db.query<{ id: string }>(
    `insert into public.submissions (assessment_id,student_id,client_submission_key) values ($1,$2,'key') returning id`,
    [assessment.rows[0].id, student.rows[0].id],
  );
  await db.query(
    `insert into public.responses (submission_id,question_id,original_text) values ($1,$2,'Texto')`,
    [submission.rows[0].id, question.rows[0].id],
  );
  await db.exec('set role service_role');
  const result = await db.query<{ result: Record<string, unknown> }>(
    `select public.get_student_assessment('token','key') as result`,
  );
  expect(result.rows[0].result).toMatchObject({
    ok: true,
    draftVersion: 0,
    assessment: { title: 'D', readingText: 'Lectura' },
    responses: [{ text: 'Texto' }],
  });
  expect(JSON.stringify(result.rows[0].result)).not.toContain('secreto');
});
