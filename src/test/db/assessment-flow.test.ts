// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';

const TEACHER_ID = '00000000-0000-0000-0000-000000000001';

const assessment = {
  title: 'Diagnóstico de lectura crítica',
  purpose: 'Reconocer fortalezas y necesidades iniciales.',
  reading_text: 'Una lectura breve para el diagnóstico.',
  general_instructions: 'Lee antes de responder.',
  opens_at: null,
  closes_at: null,
  paste_policy: 'discourage',
  curriculum_version: 'Currículo priorizado BGU 2021',
  rubric_snapshot: { schemaVersion: '1.0', version: '1.1' },
  rubric_schema_version: '1.0',
  rubric_hash: 'hash-prueba',
};

const questions = [
  {
    position: 1,
    prompt: '¿Cuál es la idea principal?',
    instructions: '',
    suggested_min_words: 30,
    suggested_max_words: 80,
    active_criteria: ['core.comprension_explicita'],
    active_modules: [],
    curriculum_links: {},
  },
  {
    position: 2,
    prompt: '¿Qué postura sostendrías frente al texto?',
    instructions: 'Justifica con evidencia.',
    suggested_min_words: 80,
    suggested_max_words: 180,
    active_criteria: ['core.lectura_critica', 'core.evidencia_razonamiento'],
    active_modules: ['optional.proposito_punto_vista'],
    curriculum_links: { destreza: 'LL.5.3.4' },
  },
];

let db: PGlite;

beforeEach(async () => {
  db = await createTestDatabase();
});

afterEach(async () => {
  await db.close();
});

async function assumeAuthenticated(claims: Record<string, unknown>): Promise<void> {
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(claims)]);
  await db.exec('set role authenticated');
}

async function saveDraft(
  rawAssessment: Record<string, unknown> = assessment,
  rawQuestions: Record<string, unknown>[] = questions,
): Promise<string> {
  const result = await db.query<{ save_assessment_draft: string }>(
    `select public.save_assessment_draft($1::jsonb, $2::jsonb)`,
    [JSON.stringify(rawAssessment), JSON.stringify(rawQuestions)],
  );
  return result.rows[0].save_assessment_draft;
}

describe('save_assessment_draft', () => {
  it('guarda la evaluación y todas sus preguntas en una sola operación', async () => {
    await assumeAuthenticated({ sub: TEACHER_ID, app_metadata: { role: 'teacher' } });

    const assessmentId = await saveDraft();
    const savedAssessment = await db.query<{
      title: string;
      status: string;
      rubric_hash: string;
    }>(`select title, status, rubric_hash from public.assessments where id = $1`, [assessmentId]);
    const savedQuestions = await db.query<{ position: number; prompt: string }>(
      `select position, prompt from public.questions where assessment_id = $1 order by position`,
      [assessmentId],
    );

    expect(savedAssessment.rows[0]).toEqual({
      title: assessment.title,
      status: 'draft',
      rubric_hash: assessment.rubric_hash,
    });
    expect(savedQuestions.rows).toEqual(
      questions.map(({ position, prompt }) => ({ position, prompt })),
    );
  });

  it('revierte todo si las posiciones de las preguntas no son consecutivas', async () => {
    await assumeAuthenticated({ sub: TEACHER_ID, app_metadata: { role: 'teacher' } });

    await expect(
      saveDraft(assessment, [questions[0], { ...questions[1], position: 1 }]),
    ).rejects.toThrow(/consecutive/i);

    const assessments = await db.query<{ count: number }>(
      `select count(*)::integer as count from public.assessments`,
    );
    const savedQuestions = await db.query<{ count: number }>(
      `select count(*)::integer as count from public.questions`,
    );
    expect(assessments.rows[0].count).toBe(0);
    expect(savedQuestions.rows[0].count).toBe(0);
  });

  it('rechaza una cuenta autenticada que no tenga el rol docente', async () => {
    await assumeAuthenticated({ sub: TEACHER_ID, app_metadata: { role: 'student' } });

    await expect(saveDraft()).rejects.toThrow(/teacher role required/i);
  });

  it('solo concede la función al rol authenticated', async () => {
    await db.exec('reset role');
    const privileges = await db.query<{ anon_execute: boolean; authenticated_execute: boolean }>(
      `select
         has_function_privilege(
           'anon',
           'public.save_assessment_draft(jsonb,jsonb)',
           'execute'
         ) as anon_execute,
         has_function_privilege(
           'authenticated',
           'public.save_assessment_draft(jsonb,jsonb)',
           'execute'
         ) as authenticated_execute`,
    );

    expect(privileges.rows[0]).toEqual({ anon_execute: false, authenticated_execute: true });
  });
});

type AssessmentTextField =
  'title' | 'purpose' | 'reading_text' | 'general_instructions' | 'curriculum_version';

const assessmentLimits: { field: AssessmentTextField; max: number }[] = [
  { field: 'title', max: 160 },
  { field: 'purpose', max: 1_000 },
  { field: 'reading_text', max: 30_000 },
  { field: 'general_instructions', max: 6_000 },
  { field: 'curriculum_version', max: 80 },
];

const questionLimits: { field: 'prompt' | 'instructions'; max: number }[] = [
  { field: 'prompt', max: 2_000 },
  { field: 'instructions', max: 4_000 },
];

describe('límites de entrada persistidos en save_assessment_draft', () => {
  beforeEach(async () => {
    await assumeAuthenticated({ sub: TEACHER_ID, app_metadata: { role: 'teacher' } });
  });

  it.each(assessmentLimits)(
    'acepta $field con exactamente $max caracteres',
    async ({ field, max }) => {
      const assessmentId = await saveDraft({ ...assessment, [field]: 'a'.repeat(max) });
      const saved = await db.query<Record<AssessmentTextField, string>>(
        `select title, purpose, reading_text, general_instructions, curriculum_version
           from public.assessments where id = $1`,
        [assessmentId],
      );
      expect(saved.rows[0][field]).toHaveLength(max);
    },
  );

  it.each(assessmentLimits)('rechaza $field con $max + 1 caracteres', async ({ field, max }) => {
    await expect(saveDraft({ ...assessment, [field]: 'a'.repeat(max + 1) })).rejects.toThrow(
      /assessment fields exceed limits/i,
    );
    const stored = await db.query<{ count: number }>(
      `select count(*)::integer as count from public.assessments`,
    );
    expect(stored.rows[0].count).toBe(0);
  });

  it.each(questionLimits)(
    'acepta $field de una pregunta con exactamente $max caracteres',
    async ({ field, max }) => {
      const assessmentId = await saveDraft(assessment, [
        { ...questions[0], [field]: 'a'.repeat(max) },
        questions[1],
      ]);
      const saved = await db.query<{ prompt: string; instructions: string }>(
        `select prompt, instructions from public.questions
          where assessment_id = $1 and position = 1`,
        [assessmentId],
      );
      expect(saved.rows[0][field]).toHaveLength(max);
    },
  );

  it.each(questionLimits)(
    'rechaza $field de una pregunta con $max + 1 caracteres',
    async ({ field, max }) => {
      await expect(
        saveDraft(assessment, [{ ...questions[0], [field]: 'a'.repeat(max + 1) }, questions[1]]),
      ).rejects.toThrow(/question fields exceed limits/i);
      const stored = await db.query<{ count: number }>(
        `select count(*)::integer as count from public.assessments`,
      );
      expect(stored.rows[0].count).toBe(0);
    },
  );
});

describe('límites de entrada persistidos en las tablas', () => {
  async function seedSubmission(): Promise<{ submissionId: string; questionId: string }> {
    const group = await db.query<{ id: string }>(
      `insert into public.groups (name, school_year) values ('3ro A', '2026') returning id`,
    );
    const student = await db.query<{ id: string }>(
      `insert into public.students (group_id, full_name_original, full_name_normalized)
       values ($1, 'Ana', 'ana') returning id`,
      [group.rows[0].id],
    );
    const created = await db.query<{ id: string }>(
      `insert into public.assessments
         (slug, title, purpose, reading_text, rubric_snapshot, rubric_schema_version, rubric_hash)
       values ('diag', 'Diagnóstico', 'Base', 'Lectura', '{}'::jsonb, '1.0', 'hash') returning id`,
    );
    const question = await db.query<{ id: string }>(
      `insert into public.questions (assessment_id, position, prompt)
       values ($1, 1, 'Pregunta') returning id`,
      [created.rows[0].id],
    );
    const submission = await db.query<{ id: string }>(
      `insert into public.submissions (assessment_id, student_id, client_submission_key)
       values ($1, $2, 'client-key') returning id`,
      [created.rows[0].id, student.rows[0].id],
    );
    return { submissionId: submission.rows[0].id, questionId: question.rows[0].id };
  }

  const insertResponse = async (
    seeded: { submissionId: string; questionId: string },
    text: string,
  ) =>
    db.query(
      `insert into public.responses (submission_id, question_id, original_text)
       values ($1, $2, $3)`,
      [seeded.submissionId, seeded.questionId, text],
    );

  it('rechaza una respuesta de 5.001 caracteres y acepta una de 5.000', async () => {
    const seeded = await seedSubmission();
    await expect(insertResponse(seeded, 'a'.repeat(5_001))).rejects.toThrow(
      /responses_original_text_length/,
    );
    await insertResponse(seeded, 'a'.repeat(5_000));
    const stored = await db.query<{ length: number }>(
      `select char_length(original_text) as length from public.responses where submission_id = $1`,
      [seeded.submissionId],
    );
    expect(stored.rows[0].length).toBe(5_000);
  });

  it('rechaza un nombre de paralelo de 81 caracteres y acepta uno de 80', async () => {
    await expect(
      db.query(`insert into public.groups (name, school_year) values ($1, '2026')`, [
        'a'.repeat(81),
      ]),
    ).rejects.toThrow(/groups_name_length/);
    await db.query(`insert into public.groups (name, school_year) values ($1, '2026')`, [
      'a'.repeat(80),
    ]);
    const stored = await db.query<{ length: number }>(
      `select char_length(name) as length from public.groups`,
    );
    expect(stored.rows[0].length).toBe(80);
  });
});
