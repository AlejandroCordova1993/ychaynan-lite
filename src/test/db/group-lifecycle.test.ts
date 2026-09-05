// @vitest-environment node
import { beforeEach, afterEach, it, expect } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDatabase } from './pgliteFixture';
let db: PGlite;
let groupId: string;
let studentId: string;
let assessmentId: string;
beforeEach(async () => {
  db = await createTestDatabase();
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({
      sub: '00000000-0000-0000-0000-000000000001',
      app_metadata: { role: 'teacher' },
    }),
  ]);
  const group = await db.query<{ id: string }>(
    "insert into groups(name,school_year) values('Prueba','2026') returning id",
  );
  groupId = group.rows[0].id;
  const student = await db.query<{ id: string }>(
    "insert into students(group_id,full_name_original,full_name_normalized) values($1,'Ana','ana') returning id",
    [groupId],
  );
  studentId = student.rows[0].id;
  const assessment = await db.query<{ id: string }>(
    "insert into assessments(slug,title,purpose,reading_text,rubric_snapshot,rubric_schema_version,rubric_hash) values('test','Test','Test','Texto','{}','1','hash') returning id",
  );
  assessmentId = assessment.rows[0].id;
});
afterEach(async () => {
  await db.close();
});
const manage = (action: string) => db.query('select manage_group($1,$2)', [groupId, action]);

it('elimina curso y nómina sin actividad y conserva evaluaciones no vinculadas', async () => {
  await manage('delete');
  expect((await db.query('select id from groups')).rows).toHaveLength(0);
  expect((await db.query('select id from students')).rows).toHaveLength(0);
  expect((await db.query('select id from assessments')).rows).toHaveLength(1);
});
it('rechaza borrado con un acceso aunque no exista entrega', async () => {
  await db.exec('reset role');
  await db.query(
    'insert into assessment_access(assessment_id,student_id,code_hash) values($1,$2,$3)',
    [assessmentId, studentId, 'hash'],
  );
  await db.exec('set role authenticated');
  await expect(manage('delete')).rejects.toThrow(/group has activity/);
  expect((await db.query('select id from students')).rows).toHaveLength(1);
});
it('rechaza borrado con borrador y permite archivar/restaurar sin perderlo', async () => {
  await db.query(
    "insert into submissions(assessment_id,student_id,client_submission_key) values($1,$2,'draft')",
    [assessmentId, studentId],
  );
  await expect(manage('delete')).rejects.toThrow(/group has activity/);
  await manage('archive');
  expect((await db.query<{ status: string }>('select status from groups')).rows[0].status).toBe(
    'archived',
  );
  expect((await db.query('select id from submissions')).rows).toHaveLength(1);
  await manage('restore');
  expect((await db.query<{ status: string }>('select status from groups')).rows[0].status).toBe(
    'active',
  );
});
it('impide importar desde una pestaña antigua y asignar accesos a un curso archivado', async () => {
  await manage('archive');
  await expect(
    db.query(
      "insert into students(group_id,full_name_original,full_name_normalized) values($1,'Luis','luis')",
      [groupId],
    ),
  ).rejects.toThrow(/group is not active/);
  await db.exec('reset role');
  await expect(
    db.query('insert into assessment_access(assessment_id,student_id,code_hash) values($1,$2,$3)', [
      assessmentId,
      studentId,
      'hash',
    ]),
  ).rejects.toThrow(/group is not active/);
});
it('rechaza un usuario no docente y un usuario anónimo', async () => {
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({
      sub: '00000000-0000-0000-0000-000000000002',
      user_metadata: { role: 'teacher' },
    }),
  ]);
  await expect(manage('delete')).rejects.toThrow(/teacher required/);
  await db.exec('reset role; set role anon');
  await expect(manage('archive')).rejects.toThrow(/permission denied/);
});
it('rechaza acciones desconocidas sin cambiar el curso', async () => {
  await expect(manage('invalid')).rejects.toThrow(/invalid group action/);
  expect((await db.query<{ status: string }>('select status from groups')).rows[0].status).toBe(
    'active',
  );
});
