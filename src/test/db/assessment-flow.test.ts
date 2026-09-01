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
