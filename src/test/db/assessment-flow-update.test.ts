// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';

const TEACHER_ID = '00000000-0000-0000-0000-000000000001';

const baseAssessment = {
  title: 'Primer título',
  purpose: 'Diagnóstico inicial.',
  reading_text: 'Lectura inicial.',
  general_instructions: '',
  opens_at: null,
  closes_at: null,
  paste_policy: 'discourage',
  curriculum_version: null,
  rubric_snapshot: { schemaVersion: '1.0', version: '1.1' },
  rubric_schema_version: '1.0',
  rubric_hash: 'hash-prueba',
};

const firstQuestion = {
  position: 1,
  prompt: 'Pregunta inicial',
  instructions: '',
  suggested_min_words: null,
  suggested_max_words: null,
  active_criteria: ['core.pertinencia'],
  active_modules: [],
  curriculum_links: {},
};

let db: PGlite;

beforeEach(async () => {
  db = await createTestDatabase();
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: TEACHER_ID, app_metadata: { role: 'teacher' } }),
  ]);
  await db.exec('set role authenticated');
});

afterEach(async () => {
  await db.close();
});

async function save(
  assessment: Record<string, unknown>,
  questions: Record<string, unknown>[],
): Promise<string> {
  const result = await db.query<{ save_assessment_draft: string }>(
    `select public.save_assessment_draft($1::jsonb, $2::jsonb)`,
    [JSON.stringify(assessment), JSON.stringify(questions)],
  );
  return result.rows[0].save_assessment_draft;
}

describe('edición transaccional del borrador', () => {
  it('actualiza la misma evaluación y reemplaza sus preguntas', async () => {
    const assessmentId = await save(baseAssessment, [firstQuestion]);

    const returnedId = await save(
      { ...baseAssessment, id: assessmentId, title: 'Título corregido' },
      [
        { ...firstQuestion, prompt: 'Nueva primera pregunta' },
        { ...firstQuestion, position: 2, prompt: 'Nueva segunda pregunta' },
      ],
    );

    const assessments = await db.query<{ id: string; title: string }>(
      `select id, title from public.assessments`,
    );
    const questions = await db.query<{ position: number; prompt: string }>(
      `select position, prompt from public.questions where assessment_id = $1 order by position`,
      [assessmentId],
    );
    expect(returnedId).toBe(assessmentId);
    expect(assessments.rows).toEqual([{ id: assessmentId, title: 'Título corregido' }]);
    expect(questions.rows).toEqual([
      { position: 1, prompt: 'Nueva primera pregunta' },
      { position: 2, prompt: 'Nueva segunda pregunta' },
    ]);
  });

  it('no permite editar una evaluación después de abrirla', async () => {
    const assessmentId = await save(baseAssessment, [firstQuestion]);
    await db.query(
      `update public.assessments set status = 'open', opened_at = now() where id = $1`,
      [assessmentId],
    );

    await expect(
      save({ ...baseAssessment, id: assessmentId, title: 'Cambio tardío' }, [firstQuestion]),
    ).rejects.toThrow(/no longer editable/i);

    const assessment = await db.query<{ title: string }>(
      `select title from public.assessments where id = $1`,
      [assessmentId],
    );
    expect(assessment.rows[0].title).toBe('Primer título');
  });
});
