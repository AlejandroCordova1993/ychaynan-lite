// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDatabase } from './pgliteFixture';

let db: PGlite;

const TEACHER_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000002';

beforeEach(async () => {
  db = await createTestDatabase();
});

afterEach(async () => {
  await db.close();
});

async function insertGroup(): Promise<string> {
  const result = await db.query<{ id: string }>(
    `insert into public.groups (name, school_year) values ('3ro BGU A', '2026-2027') returning id`,
  );
  return result.rows[0].id;
}

async function insertStudent(groupId: string, name = 'Ana Ruiz'): Promise<string> {
  const result = await db.query<{ id: string }>(
    `insert into public.students (group_id, full_name_original, full_name_normalized)
     values ($1, $2, $2) returning id`,
    [groupId, name],
  );
  return result.rows[0].id;
}

async function insertAssessment(status: 'draft' | 'open' = 'draft'): Promise<string> {
  const result = await db.query<{ id: string }>(
    `insert into public.assessments (slug, title, purpose, reading_text, status, rubric_snapshot, rubric_schema_version, rubric_hash)
     values ($1, 'Diagnóstico', 'piloto', 'lectura', $2, '{}'::jsonb, '1.0', 'hash')
     returning id`,
    [`diagnostico-${Math.random()}`, status],
  );
  return result.rows[0].id;
}

async function insertQuestion(assessmentId: string): Promise<string> {
  const result = await db.query<{ id: string }>(
    `insert into public.questions (assessment_id, position, prompt) values ($1, 1, 'consigna') returning id`,
    [assessmentId],
  );
  return result.rows[0].id;
}

async function insertSubmission(assessmentId: string, studentId: string): Promise<string> {
  const result = await db.query<{ id: string }>(
    `insert into public.submissions (assessment_id, student_id, client_submission_key)
     values ($1, $2, 'key-1') returning id`,
    [assessmentId, studentId],
  );
  return result.rows[0].id;
}

async function setTeacherClaims(): Promise<void> {
  await db.exec(
    `select set_config('request.jwt.claims', '{"sub":"${TEACHER_ID}","app_metadata":{"role":"teacher"}}', false)`,
  );
}

async function setUntrustedClaims(): Promise<void> {
  await db.exec(`select set_config('request.jwt.claims', '{}', false)`);
}

describe('esquema y roles base', () => {
  it('crea las diez tablas esperadas', async () => {
    const result = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    expect(result.rows.map((row) => row.table_name)).toEqual(
      [
        'ai_evaluations',
        'assessment_access',
        'assessments',
        'access_rate_limits',
        'groups',
        'questions',
        'responses',
        'student_sessions',
        'students',
        'submissions',
      ].sort(),
    );
  });
});

describe('invariantes de guía §13', () => {
  it('permite homónimos: dos estudiantes con el mismo nombre en paralelos distintos', async () => {
    const groupA = await insertGroup();
    const result = await db.query<{ id: string }>(
      `insert into public.groups (name, school_year) values ('3ro BGU B', '2026-2027') returning id`,
    );
    const groupB = result.rows[0].id;

    await insertStudent(groupA, 'Ana Ruiz');
    await expect(insertStudent(groupB, 'Ana Ruiz')).resolves.toBeTruthy();
  });

  it('rechaza una segunda entrega para el mismo estudiante en la misma evaluación', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();

    await insertSubmission(assessmentId, studentId);
    await expect(
      db.query(
        `insert into public.submissions (assessment_id, student_id, client_submission_key)
         values ($1, $2, 'key-2')`,
        [assessmentId, studentId],
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it('impide más de una evaluación abierta a la vez', async () => {
    await insertAssessment('open');
    await expect(insertAssessment('open')).rejects.toThrow(/duplicate key/);
  });

  it('congela la rúbrica al abrir la evaluación, antes de recibir respuestas', async () => {
    const assessmentId = await insertAssessment('draft');

    await db.query(
      `update public.assessments set status = 'open', opened_at = now() where id = $1`,
      [assessmentId],
    );

    await expect(
      db.query(`update public.assessments set rubric_hash = 'otro-hash' where id = $1`, [
        assessmentId,
      ]),
    ).rejects.toThrow(/immutable once the assessment is open/);
  });

  it('rechaza la reapertura de una entrega: una nueva oportunidad usa otra evaluación', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const submissionId = await insertSubmission(assessmentId, studentId);

    await db.query(
      `update public.submissions set status = 'submitted', submitted_at = now() where id = $1`,
      [submissionId],
    );

    await expect(
      db.query(`update public.submissions set status = 'reopened' where id = $1`, [submissionId]),
    ).rejects.toThrow(/submissions_status_check/);
  });

  it('vuelve inmutable el texto de una respuesta después de entregarla', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const questionId = await insertQuestion(assessmentId);
    const submissionId = await insertSubmission(assessmentId, studentId);

    const response = await db.query<{ id: string }>(
      `insert into public.responses (submission_id, question_id, original_text, submitted_at)
       values ($1, $2, 'texto original', now()) returning id`,
      [submissionId, questionId],
    );
    const responseId = response.rows[0].id;

    await expect(
      db.query(`update public.responses set original_text = 'texto alterado' where id = $1`, [
        responseId,
      ]),
    ).rejects.toThrow(/immutable/);
  });

  it('mantiene inmutable una respuesta aunque se intente limpiar submitted_at antes de editarla', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const questionId = await insertQuestion(assessmentId);
    const submissionId = await insertSubmission(assessmentId, studentId);

    const response = await db.query<{ id: string }>(
      `insert into public.responses (submission_id, question_id, original_text, submitted_at)
       values ($1, $2, 'texto original', now()) returning id`,
      [submissionId, questionId],
    );
    const responseId = response.rows[0].id;

    await expect(
      db.query(`update public.responses set submitted_at = null where id = $1`, [responseId]),
    ).rejects.toThrow(/immutable/);
    await expect(
      db.query(`update public.responses set original_text = 'texto alterado' where id = $1`, [
        responseId,
      ]),
    ).rejects.toThrow(/immutable/);
  });

  it('impide eliminar una respuesta ya entregada', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const questionId = await insertQuestion(assessmentId);
    const submissionId = await insertSubmission(assessmentId, studentId);

    const response = await db.query<{ id: string }>(
      `insert into public.responses (submission_id, question_id, original_text, submitted_at)
       values ($1, $2, 'texto original', now()) returning id`,
      [submissionId, questionId],
    );

    await expect(
      db.query(`delete from public.responses where id = $1`, [response.rows[0].id]),
    ).rejects.toThrow(/immutable/);
  });

  it('impide cambiar la lectura de una evaluación después de la primera entrega', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    await insertSubmission(assessmentId, studentId);

    await expect(
      db.query(`update public.assessments set reading_text = 'otra lectura' where id = $1`, [
        assessmentId,
      ]),
    ).rejects.toThrow(/immutable/);
  });

  it('impide cambiar la huella de la rúbrica después de la primera entrega', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    await insertSubmission(assessmentId, studentId);

    await expect(
      db.query(`update public.assessments set rubric_hash = 'otro-hash' where id = $1`, [
        assessmentId,
      ]),
    ).rejects.toThrow(/immutable/);
  });

  it('impide eliminar una evaluación que ya tiene una entrega', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    await insertSubmission(assessmentId, studentId);

    await expect(
      db.query(`delete from public.assessments where id = $1`, [assessmentId]),
    ).rejects.toThrow(/immutable/);
  });

  it('impide cambiar la consigna de una pregunta después de la primera entrega', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const questionId = await insertQuestion(assessmentId);
    await insertSubmission(assessmentId, studentId);

    await expect(
      db.query(`update public.questions set prompt = 'otra consigna' where id = $1`, [questionId]),
    ).rejects.toThrow(/immutable/);
  });

  it('impide cambiar una pregunta después de abrir la evaluación, aunque no haya entregas', async () => {
    const assessmentId = await insertAssessment('draft');
    const questionId = await insertQuestion(assessmentId);

    await db.query(
      `update public.assessments set status = 'open', opened_at = now() where id = $1`,
      [assessmentId],
    );

    await expect(
      db.query(`update public.questions set prompt = 'otra consigna' where id = $1`, [questionId]),
    ).rejects.toThrow(/immutable once the assessment is open/);
  });

  it('impide agregar una pregunta a una evaluación ya abierta, aunque no haya entregas', async () => {
    const assessmentId = await insertAssessment('draft');
    await insertQuestion(assessmentId);

    await db.query(
      `update public.assessments set status = 'open', opened_at = now() where id = $1`,
      [assessmentId],
    );

    await expect(
      db.query(
        `insert into public.questions (assessment_id, position, prompt) values ($1, 2, 'otra consigna')`,
        [assessmentId],
      ),
    ).rejects.toThrow(/immutable once the assessment is open/);
  });

  it('impide agregar o eliminar preguntas después de la primera entrega', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const questionId = await insertQuestion(assessmentId);
    await insertSubmission(assessmentId, studentId);

    await expect(
      db.query(
        `insert into public.questions (assessment_id, position, prompt) values ($1, 2, 'otra consigna')`,
        [assessmentId],
      ),
    ).rejects.toThrow(/immutable/);
    await expect(
      db.query(`delete from public.questions where id = $1`, [questionId]),
    ).rejects.toThrow(/immutable/);
  });

  it('impide cambiar los criterios activos de una pregunta después de la primera entrega', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const questionId = await insertQuestion(assessmentId);
    await insertSubmission(assessmentId, studentId);

    await expect(
      db.query(`update public.questions set active_criteria = array['criticality'] where id = $1`, [
        questionId,
      ]),
    ).rejects.toThrow(/immutable/);
  });

  it('rechaza una respuesta cuya pregunta pertenece a otra evaluación', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const firstAssessmentId = await insertAssessment();
    const secondAssessmentId = await insertAssessment();
    const foreignQuestionId = await insertQuestion(secondAssessmentId);
    const submissionId = await insertSubmission(firstAssessmentId, studentId);

    await expect(
      db.query(
        `insert into public.responses (submission_id, question_id, original_text)
         values ($1, $2, 'respuesta cruzada')`,
        [submissionId, foreignQuestionId],
      ),
    ).rejects.toThrow(/same assessment/);
  });

  it('impide agregar respuestas a una entrega ya enviada', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const questionId = await insertQuestion(assessmentId);
    const submissionId = await insertSubmission(assessmentId, studentId);

    await db.query(
      `update public.submissions
          set status = 'submitted', submitted_at = now()
        where id = $1`,
      [submissionId],
    );

    await expect(
      db.query(
        `insert into public.responses (submission_id, question_id, original_text)
         values ($1, $2, 'respuesta tardía')`,
        [submissionId, questionId],
      ),
    ).rejects.toThrow(/submitted submission/);
  });

  it('no permite reutilizar un código de acceso en una misma evaluación', async () => {
    const groupId = await insertGroup();
    const firstStudentId = await insertStudent(groupId, 'Ana Ruiz');
    const secondStudentId = await insertStudent(groupId, 'Luis Pérez');
    const assessmentId = await insertAssessment();

    await db.query(
      `insert into public.assessment_access (assessment_id, student_id, code_hash)
       values ($1, $2, 'same-hash')`,
      [assessmentId, firstStudentId],
    );

    await expect(
      db.query(
        `insert into public.assessment_access (assessment_id, student_id, code_hash)
         values ($1, $2, 'same-hash')`,
        [assessmentId, secondStudentId],
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it('impide eliminar un estudiante que ya tiene una entrega', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    await insertSubmission(assessmentId, studentId);

    await expect(
      db.query(`delete from public.students where id = $1`, [studentId]),
    ).rejects.toThrow();

    await expect(
      db.query(`update public.students set status = 'inactive' where id = $1`, [studentId]),
    ).resolves.toBeTruthy();
  });

  it('impide marcar una evaluación de IA como revisada sin reviewed_by', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const submissionId = await insertSubmission(assessmentId, studentId);

    await expect(
      db.query(
        `insert into public.ai_evaluations (submission_id, rubric_schema_version, rubric_hash, prompt_version, provider, model, status)
         values ($1, '1.0', 'hash', 'v1', 'openai', 'modelo', 'reviewed')`,
        [submissionId],
      ),
    ).rejects.toThrow(/reviewed_by is required/);
  });

  it('impide revisar una evaluación con un usuario distinto al autenticado', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId, 'Ana Ruiz');
    const assessmentId = await insertAssessment();
    const submissionId = await insertSubmission(assessmentId, studentId);

    await setTeacherClaims();
    await db.exec('set role authenticated');

    const evaluation = await db.query<{ id: string }>(
      `insert into public.ai_evaluations (submission_id, rubric_schema_version, rubric_hash, prompt_version, provider, model, status)
       values ($1, '1.0', 'hash', 'v1', 'openai', 'modelo', 'completed') returning id`,
      [submissionId],
    );

    await expect(
      db.query(
        `update public.ai_evaluations set status = 'reviewed', reviewed_by = $1 where id = $2`,
        [OTHER_USER_ID, evaluation.rows[0].id],
      ),
    ).rejects.toThrow(/authenticated user/);
    await db.exec('reset role');
  });

  it('impide pasar una evaluación de IA de failed a reviewed directamente', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const submissionId = await insertSubmission(assessmentId, studentId);

    const evaluation = await db.query<{ id: string }>(
      `insert into public.ai_evaluations (submission_id, rubric_schema_version, rubric_hash, prompt_version, provider, model, status)
       values ($1, '1.0', 'hash', 'v1', 'openai', 'modelo', 'failed') returning id`,
      [submissionId],
    );

    await setTeacherClaims();
    await expect(
      db.query(
        `update public.ai_evaluations set status = 'reviewed', reviewed_by = $1 where id = $2`,
        [TEACHER_ID, evaluation.rows[0].id],
      ),
    ).rejects.toThrow(/cannot transition directly to reviewed/);
  });

  it('conserva inmutable la salida original de IA una vez terminada', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();
    const submissionId = await insertSubmission(assessmentId, studentId);

    const evaluation = await db.query<{ id: string }>(
      `insert into public.ai_evaluations
        (submission_id, rubric_schema_version, rubric_hash, prompt_version, provider, model, status, result_json)
       values ($1, '1.0', 'hash', 'v1', 'openai', 'modelo', 'completed', '{"original":true}'::jsonb)
       returning id`,
      [submissionId],
    );

    await expect(
      db.query(
        `update public.ai_evaluations set result_json = '{"alterado":true}'::jsonb where id = $1`,
        [evaluation.rows[0].id],
      ),
    ).rejects.toThrow(/original AI output is immutable/);

    await expect(
      db.query(
        `update public.ai_evaluations set teacher_note = 'revisado por docente' where id = $1`,
        [evaluation.rows[0].id],
      ),
    ).resolves.toBeTruthy();
  });
});

describe('privilegios por defecto y mantenimiento de updated_at', () => {
  it('una tabla creada después de las migraciones no hereda privilegios para anon ni authenticated', async () => {
    await db.exec(
      'create table public.future_table (id uuid primary key default gen_random_uuid())',
    );

    const result = await db.query<{ anon_select: boolean; authenticated_select: boolean }>(
      `select
         has_table_privilege('anon', 'public.future_table', 'select') as anon_select,
         has_table_privilege('authenticated', 'public.future_table', 'select') as authenticated_select`,
    );

    expect(result.rows[0]).toEqual({ anon_select: false, authenticated_select: false });
  });

  it('actualiza updated_at automáticamente al modificar un paralelo', async () => {
    const groupId = await insertGroup();
    const before = await db.query<{ updated_at: string }>(
      `select updated_at from public.groups where id = $1`,
      [groupId],
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    await db.query(`update public.groups set name = '3ro BGU A (renombrado)' where id = $1`, [
      groupId,
    ]);

    const after = await db.query<{ updated_at: string }>(
      `select updated_at from public.groups where id = $1`,
      [groupId],
    );

    expect(new Date(after.rows[0].updated_at).getTime()).toBeGreaterThan(
      new Date(before.rows[0].updated_at).getTime(),
    );
  });
});

describe('row level security', () => {
  it('expone únicamente privilegios de tabla para authenticated y no para anon, en las diez tablas', async () => {
    const tables = [
      'groups',
      'students',
      'assessments',
      'questions',
      'assessment_access',
      'student_sessions',
      'access_rate_limits',
      'submissions',
      'responses',
      'ai_evaluations',
    ];

    for (const table of tables) {
      const result = await db.query<{ anon_select: boolean; authenticated_select: boolean }>(
        `select
           has_table_privilege('anon', $1, 'select') as anon_select,
           has_table_privilege('authenticated', $1, 'select') as authenticated_select`,
        [`public.${table}`],
      );

      expect(result.rows[0].anon_select, `anon no debería poder leer ${table}`).toBe(false);
      expect(result.rows[0].authenticated_select, `authenticated debería poder leer ${table}`).toBe(
        true,
      );
    }

    const writable = await db.query<{ authenticated_insert: boolean }>(
      `select has_table_privilege('authenticated', 'public.groups', 'insert') as authenticated_insert`,
    );
    expect(writable.rows[0].authenticated_insert).toBe(true);
  });

  it('impide que el rol anon lea la tabla de estudiantes', async () => {
    const groupId = await insertGroup();
    await insertStudent(groupId);

    await db.exec('set role anon');
    await expect(db.query('select * from public.students')).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  });

  it('impide que el rol anon inserte un paralelo', async () => {
    await db.exec('set role anon');
    await expect(
      db.query(`insert into public.groups (name, school_year) values ('intruso', '2026-2027')`),
    ).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  });

  it('permite que el rol authenticated lea y escriba paralelos y estudiantes', async () => {
    await setTeacherClaims();
    await db.exec('set role authenticated');
    const groupId = await insertGroup();
    await expect(insertStudent(groupId)).resolves.toBeTruthy();
    const result = await db.query('select * from public.students');
    expect(result.rows.length).toBeGreaterThan(0);
    await db.exec('reset role');
  });

  it('impide que una cuenta autenticada sin rol docente lea o escriba datos', async () => {
    await setUntrustedClaims();
    await db.exec('set role authenticated');

    const result = await db.query('select * from public.students');
    expect(result.rows).toHaveLength(0);
    await expect(
      db.query(`insert into public.groups (name, school_year) values ('intruso', '2026-2027')`),
    ).rejects.toThrow(/row-level security/);
    await db.exec('reset role');
  });

  it('deja a authenticated solo con lectura sobre assessment_access', async () => {
    const groupId = await insertGroup();
    const studentId = await insertStudent(groupId);
    const assessmentId = await insertAssessment();

    await db.exec('set role authenticated');
    await expect(
      db.query(
        `insert into public.assessment_access (assessment_id, student_id, code_hash) values ($1, $2, 'hash')`,
        [assessmentId, studentId],
      ),
    ).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  });
});
