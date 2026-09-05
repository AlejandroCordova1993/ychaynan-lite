// @vitest-environment node
import { beforeEach, afterEach, it, expect } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDatabase } from './pgliteFixture';
let db: PGlite;
let id: string;
const original = {
  questionResults: [
    { position: 1, criteria: [{ criterionId: 'core.pertinencia', level: 3 }], modules: [] },
  ],
};
beforeEach(async () => {
  db = await createTestDatabase();
  const group = await db.query<{ id: string }>(
    "insert into groups(name,school_year) values ('Prueba','2026') returning id",
  );
  const student = await db.query<{ id: string }>(
    "insert into students(group_id,full_name_original,full_name_normalized) values ($1,'Ana','ana') returning id",
    [group.rows[0].id],
  );
  const assessment = await db.query<{ id: string }>(
    "insert into assessments(slug,title,purpose,reading_text,rubric_snapshot,rubric_schema_version,rubric_hash) values ('test','Test','Test','Texto','{}','1','hash') returning id",
  );
  const submission = await db.query<{ id: string }>(
    "insert into submissions(assessment_id,student_id,client_submission_key) values ($1,$2,'test') returning id",
    [assessment.rows[0].id, student.rows[0].id],
  );
  const result = await db.query<{ id: string }>(
    "insert into ai_evaluations(submission_id,rubric_schema_version,rubric_hash,prompt_version,provider,model,status,result_json) values ($1,'1','hash','1','test','test','completed',$2) returning id",
    [submission.rows[0].id, JSON.stringify(original)],
  );
  id = result.rows[0].id;
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({
      sub: '00000000-0000-0000-0000-000000000001',
      app_metadata: { role: 'teacher' },
    }),
  ]);
});
afterEach(async () => {
  await db.close();
});
function review(decision = 'reviewed', changes: unknown = [], note = '') {
  return db.query('select review_submission_evaluation($1,$2,$3,$4)', [
    id,
    decision,
    JSON.stringify(changes),
    note,
  ]);
}
it('guarda ajustes y autor, conserva original y rechaza una segunda revisión', async () => {
  await review(
    'reviewed',
    [{ position: 1, id: 'core.pertinencia', level: 2, reason: 'Falta justificar.' }],
    'Revisado',
  );
  const result = await db.query<{
    result_json: unknown;
    reviewed_by: string;
    reviewed_at: string;
    status: string;
  }>('select * from ai_evaluations where id=$1', [id]);
  expect(result.rows[0].result_json).toEqual(original);
  expect(result.rows[0].status).toBe('reviewed');
  expect(result.rows[0].reviewed_by).toBe('00000000-0000-0000-0000-000000000001');
  expect(result.rows[0].reviewed_at).toBeTruthy();
  await expect(review()).rejects.toThrow(/already reviewed/);
  await expect(
    db.query("update ai_evaluations set status='completed' where id=$1", [id]),
  ).rejects.toThrow(/finalized/);
});
it('exige motivo para descartar y conserva la salida', async () => {
  await expect(review('discarded')).rejects.toThrow(/note/);
  await review('discarded', [], 'Evidencia incorrecta');
  const result = await db.query<{ status: string; result_json: unknown }>(
    'select status,result_json from ai_evaluations where id=$1',
    [id],
  );
  expect(result.rows[0]).toEqual({ status: 'discarded', result_json: original });
});
it('rechaza criterios inventados, duplicados, niveles inválidos y razones vacías', async () => {
  const item = { position: 1, id: 'core.pertinencia', level: 2, reason: 'Motivo' };
  for (const changes of [
    [{ ...item, id: 'inventado' }],
    [item, item],
    [{ ...item, level: 5 }],
    [{ ...item, level: null }],
    [{ ...item, reason: '  ' }],
  ]) {
    await expect(review('reviewed', changes)).rejects.toThrow();
  }
});
it('rechaza cuentas no docentes y anónimas', async () => {
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({
      sub: '00000000-0000-0000-0000-000000000002',
      user_metadata: { role: 'teacher' },
    }),
  ]);
  await expect(review()).rejects.toThrow(/teacher required/);
  await db.exec('reset role; set role anon');
  await expect(review()).rejects.toThrow(/permission denied/);
});
it('no permite aprobar una evaluación en curso', async () => {
  await db.query("update ai_evaluations set status='running' where id=$1", [id]);
  await expect(review()).rejects.toThrow(/unavailable/);
});
