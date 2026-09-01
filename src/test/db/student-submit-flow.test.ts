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
    `insert into public.assessments (slug,title,purpose,reading_text,status,rubric_snapshot,rubric_schema_version,rubric_hash) values ('diag','D','P','L','draft','{}','1','h') returning id`,
  );
  const question = await db.query<{ id: string }>(
    `insert into public.questions (assessment_id,position,prompt) values ($1,1,'P') returning id`,
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
    `insert into public.student_sessions (assessment_access_id,token_hash,expires_at) values ($1,'token-hash',now()+interval '2 hours')`,
    [access.rows[0].id],
  );
  const submission = await db.query<{ id: string }>(
    `insert into public.submissions (assessment_id,student_id,client_submission_key,draft_version) values ($1,$2,'key',1) returning id`,
    [assessment.rows[0].id, student.rows[0].id],
  );
  await db.query(
    `insert into public.responses (submission_id,question_id,original_text) values ($1,$2,'respuesta')`,
    [submission.rows[0].id, question.rows[0].id],
  );
  return { submissionId: submission.rows[0].id };
}

describe('submit_student_assessment', () => {
  it('entrega una vez y la repetición exacta devuelve el mismo recibo', async () => {
    const seeded = await seed();
    await db.exec('set role service_role');
    const first = await db.query<{
      result: { ok: boolean; receiptId: string; finalDraftVersion: number };
    }>(`select public.submit_student_assessment('token-hash','key',1,true) as result`);
    const repeated = await db.query<{ result: { ok: boolean; receiptId: string } }>(
      `select public.submit_student_assessment('token-hash','key',1,true) as result`,
    );
    expect(first.rows[0].result).toMatchObject({
      ok: true,
      receiptId: seeded.submissionId,
      finalDraftVersion: 1,
    });
    expect(repeated.rows[0].result.receiptId).toBe(first.rows[0].result.receiptId);
  });

  it('rechaza otra clave y deja respuesta y entrega inmutables', async () => {
    const seeded = await seed();
    await db.exec('set role service_role');
    await db.query(`select public.submit_student_assessment('token-hash','key',1,true)`);
    const other = await db.query<{ result: { ok: boolean } }>(
      `select public.submit_student_assessment('token-hash','otra',1,true) as result`,
    );
    expect(other.rows[0].result.ok).toBe(false);
    await expect(
      db.query(`update public.responses set original_text='cambio' where submission_id=$1`, [
        seeded.submissionId,
      ]),
    ).rejects.toThrow(/immutable/i);
  });
});
