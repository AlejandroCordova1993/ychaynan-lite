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
  // authenticated ya no puede insertar estudiantes directamente: la nómina entra
  // por la RPC atómica, que es como el docente la carga desde el navegador.
  await db.query('select import_students_to_group($1,$2::jsonb)', [
    groupId,
    JSON.stringify([{ full_name_original: 'Ana', authorized_variant: null }]),
  ]);
  const student = await db.query<{ id: string }>('select id from students where group_id=$1', [
    groupId,
  ]);
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

it('borra definitivamente un curso con accesos y borradores, no otro curso ni la lectura', async () => {
  await db.exec('reset role');
  await db.query(
    'insert into assessment_access(assessment_id,student_id,code_hash) values($1,$2,$3)',
    [assessmentId, studentId, 'hash'],
  );
  await db.query(
    "insert into submissions(assessment_id,student_id,client_submission_key) values($1,$2,'draft')",
    [assessmentId, studentId],
  );
  await db.query("insert into groups(name,school_year) values('Otro','2026')");
  await db.exec('set role authenticated');
  await db.query('select delete_group_permanently($1,$2)', [groupId, 'Prueba']);
  expect((await db.query('select name from groups')).rows).toEqual([{ name: 'Otro' }]);
  expect((await db.query('select id from students')).rows).toHaveLength(0);
  expect((await db.query('select id from submissions')).rows).toHaveLength(0);
  expect((await db.query('select id from assessments')).rows).toHaveLength(1);
});

it('elimina curso y nómina sin actividad y conserva evaluaciones no vinculadas', async () => {
  await manage('delete');
  expect((await db.query('select id from groups')).rows).toHaveLength(0);
  expect((await db.query('select id from students')).rows).toHaveLength(0);
  expect((await db.query('select id from assessments')).rows).toHaveLength(1);
});

async function seedSubmittedWork() {
  await db.exec('reset role');
  const access = await db.query<{ id: string }>(
    'insert into assessment_access(assessment_id,student_id,code_hash) values($1,$2,$3) returning id',
    [assessmentId, studentId, 'hash'],
  );
  await db.query(
    "insert into student_sessions(assessment_access_id,token_hash,expires_at) values($1,'token',now()+interval '1 hour')",
    [access.rows[0].id],
  );
  const question = await db.query<{ id: string }>(
    "insert into questions(assessment_id,position,prompt) values($1,1,'Pregunta') returning id",
    [assessmentId],
  );
  await db.query("update assessments set status='open' where id=$1", [assessmentId]);
  const submission = await db.query<{ id: string }>(
    "insert into submissions(assessment_id,student_id,client_submission_key) values($1,$2,'submitted') returning id",
    [assessmentId, studentId],
  );
  await db.query(
    "insert into responses(submission_id,question_id,original_text,submitted_at) values($1,$2,'Respuesta original',now())",
    [submission.rows[0].id, question.rows[0].id],
  );
  await db.query("update submissions set status='submitted',submitted_at=now() where id=$1", [
    submission.rows[0].id,
  ]);
  await db.query(
    "insert into ai_evaluations(submission_id,rubric_schema_version,rubric_hash,prompt_version,provider,model,status) values($1,'1','hash','1','test','test','completed')",
    [submission.rows[0].id],
  );
  await db.exec('set role authenticated');
  return submission.rows[0].id;
}

it('previsualiza sin borrar y elimina respuestas entregadas, evaluaciones y sesiones solo al confirmar', async () => {
  const submissionId = await seedSubmittedWork();
  const preview = await db.query<{ impact: unknown }>(
    'select delete_group_permanently($1,null,true) as impact',
    [groupId],
  );
  expect(preview.rows[0].impact).toEqual({
    students: 1,
    accesses: 1,
    submissions: 1,
    responses: 1,
    evaluations: 1,
  });
  await expect(
    db.query('delete from responses where submission_id=$1', [submissionId]),
  ).rejects.toThrow(/immutable/);
  await expect(
    db.query('select delete_group_permanently($1,$2)', [groupId, 'Otro']),
  ).rejects.toThrow(/confirmation/);
  expect((await db.query('select id from responses')).rows).toHaveLength(1);
  await manage('archive');
  await db.query('select delete_group_permanently($1,$2)', [groupId, 'Prueba']);
  for (const table of ['groups', 'students', 'responses', 'submissions', 'ai_evaluations']) {
    expect((await db.query(`select id from ${table}`)).rows).toHaveLength(0);
  }
  await db.exec('reset role');
  expect((await db.query('select id from student_sessions')).rows).toHaveLength(0);
  expect((await db.query('select * from lite_private.group_deletion_scope')).rows).toHaveLength(0);
  expect((await db.query('select id from questions')).rows).toHaveLength(1);
});

it('revierte todo el borrado si falla una parte de la transacción', async () => {
  await seedSubmittedWork();
  await db.exec(`reset role;
    create function fail_group_delete() returns trigger language plpgsql as $$ begin raise exception 'simulated failure'; end; $$;
    create trigger fail_delete before delete on groups for each row execute function fail_group_delete();
    set role authenticated;`);
  await expect(
    db.query('select delete_group_permanently($1,$2)', [groupId, 'Prueba']),
  ).rejects.toThrow(/simulated failure/);
  expect((await db.query('select id from responses')).rows).toHaveLength(1);
  expect((await db.query('select id from ai_evaluations')).rows).toHaveLength(1);
  await expect(db.query('delete from responses')).rejects.toThrow(/immutable/);
});

it('conserva las respuestas y calificaciones de otro curso en la misma evaluación', async () => {
  await seedSubmittedWork();
  await db.exec('reset role');
  const otherGroup = await db.query<{ id: string }>(
    "insert into groups(name,school_year) values('Otro','2026') returning id",
  );
  const otherStudent = await db.query<{ id: string }>(
    "insert into students(group_id,full_name_original,full_name_normalized) values($1,'Luis','luis') returning id",
    [otherGroup.rows[0].id],
  );
  const otherSubmission = await db.query<{ id: string }>(
    "insert into submissions(assessment_id,student_id,client_submission_key) values($1,$2,'other-key') returning id",
    [assessmentId, otherStudent.rows[0].id],
  );
  const question = await db.query<{ id: string }>(
    'select id from questions where assessment_id=$1',
    [assessmentId],
  );
  await db.query(
    "insert into responses(submission_id,question_id,original_text,submitted_at) values($1,$2,'Otra respuesta intacta',now())",
    [otherSubmission.rows[0].id, question.rows[0].id],
  );
  await db.query(
    "insert into ai_evaluations(submission_id,rubric_schema_version,rubric_hash,prompt_version,provider,model,status) values($1,'1','hash','1','test','test','completed')",
    [otherSubmission.rows[0].id],
  );
  await db.exec('set role authenticated');
  await db.query('select delete_group_permanently($1,$2)', [groupId, 'Prueba']);
  expect((await db.query('select original_text from responses')).rows).toEqual([
    { original_text: 'Otra respuesta intacta' },
  ]);
  expect((await db.query('select submission_id from ai_evaluations')).rows).toEqual([
    { submission_id: otherSubmission.rows[0].id },
  ]);
  await expect(db.query('delete from responses')).rejects.toThrow(/immutable/);
});

it('no permite falsificar el permiso interno ni borrar o previsualizar sin rol docente', async () => {
  await expect(
    db.query('insert into lite_private.group_deletion_scope values(1,$1)', [groupId]),
  ).rejects.toThrow(/permission denied/);
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({
      sub: '00000000-0000-0000-0000-000000000002',
      user_metadata: { role: 'teacher' },
    }),
  ]);
  await expect(
    db.query('select delete_group_permanently($1,$2)', [groupId, 'Prueba']),
  ).rejects.toThrow(/teacher required/);
  await expect(
    db.query('select delete_group_permanently($1,null,true)', [groupId]),
  ).rejects.toThrow(/teacher required/);
  await db.exec('reset role; set role anon');
  await expect(
    db.query('select delete_group_permanently($1,$2)', [groupId, 'Prueba']),
  ).rejects.toThrow(/permission denied/);
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
    db.query('select import_students_to_group($1,$2::jsonb)', [
      groupId,
      JSON.stringify([{ full_name_original: 'Luis', authorized_variant: null }]),
    ]),
  ).rejects.toThrow(/active group not found/);
  await db.exec('reset role');
  // El trigger sigue protegiendo la tabla para cualquier ruta privilegiada.
  await expect(
    db.query(
      "insert into students(group_id,full_name_original,full_name_normalized) values($1,'Luis','luis')",
      [groupId],
    ),
  ).rejects.toThrow(/group is not active/);
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
