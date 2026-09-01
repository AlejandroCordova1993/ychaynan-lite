import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { AssessmentDraftInput } from '../../features/assessment/assessmentSchemas';
import { getDraftAssessment, saveAssessmentDraft } from './assessments';

const assessmentId = '11111111-1111-1111-1111-111111111111';

function validDraft(): AssessmentDraftInput {
  return {
    title: 'Diagnóstico de lectura crítica',
    purpose: 'Reconocer fortalezas y necesidades iniciales.',
    readingText: 'Una lectura breve para el diagnóstico.',
    generalInstructions: 'Lee antes de responder.',
    opensAt: null,
    closesAt: null,
    pastePolicy: 'discourage',
    curriculumVersion: 'Currículo priorizado BGU 2021',
    questions: [
      {
        position: 1,
        prompt: '¿Cuál es la idea principal?',
        instructions: '',
        suggestedMinWords: 30,
        suggestedMaxWords: 80,
        activeCriteria: ['core.comprension_explicita'],
        activeModules: [],
        curriculumLinks: {},
      },
    ],
  };
}

function saveClient(error: { message: string } | null = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: error ? null : assessmentId, error }),
  } as unknown as SupabaseClient;
}

function readClient(hasDraft = true) {
  const assessmentRow = hasDraft
    ? {
        id: assessmentId,
        title: 'Diagnóstico de lectura crítica',
        purpose: 'Reconocer fortalezas y necesidades iniciales.',
        reading_text: 'Una lectura breve para el diagnóstico.',
        general_instructions: 'Lee antes de responder.',
        opens_at: null,
        closes_at: null,
        paste_policy: 'discourage',
        curriculum_version: 'Currículo priorizado BGU 2021',
      }
    : null;
  const questionRows = [
    {
      id: '22222222-2222-2222-2222-222222222222',
      position: 1,
      prompt: '¿Cuál es la idea principal?',
      instructions: '',
      suggested_min_words: 30,
      suggested_max_words: 80,
      active_criteria: ['core.comprension_explicita'],
      active_modules: [],
      curriculum_links: {},
    },
  ];

  const assessmentsChain = {
    select: vi.fn(() => assessmentsChain),
    eq: vi.fn(() => assessmentsChain),
    order: vi.fn(() => assessmentsChain),
    limit: vi.fn(() => assessmentsChain),
    maybeSingle: vi.fn().mockResolvedValue({ data: assessmentRow, error: null }),
  };
  const questionsChain = {
    select: vi.fn(() => questionsChain),
    eq: vi.fn(() => questionsChain),
    order: vi.fn().mockResolvedValue({ data: questionRows, error: null }),
  };
  return {
    from: vi.fn((table: string) => (table === 'assessments' ? assessmentsChain : questionsChain)),
  } as unknown as SupabaseClient;
}

describe('saveAssessmentDraft', () => {
  it('valida, toma la instantánea de rúbrica y envía el contrato SQL en snake_case', async () => {
    const client = saveClient();

    await expect(saveAssessmentDraft(client, validDraft())).resolves.toBe(assessmentId);
    expect(client.rpc).toHaveBeenCalledWith(
      'save_assessment_draft',
      expect.objectContaining({
        p_assessment: expect.objectContaining({
          title: 'Diagnóstico de lectura crítica',
          reading_text: 'Una lectura breve para el diagnóstico.',
          rubric_schema_version: '1.0',
          rubric_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
        p_questions: [
          expect.objectContaining({
            position: 1,
            suggested_min_words: 30,
            active_criteria: ['core.comprension_explicita'],
          }),
        ],
      }),
    );
  });

  it('rechaza un borrador inválido antes de llamar a Supabase', async () => {
    const client = saveClient();
    const invalid = { ...validDraft(), title: '' };

    await expect(saveAssessmentDraft(client, invalid)).rejects.toThrow();
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

describe('getDraftAssessment', () => {
  it('reconstruye el borrador en camelCase con sus preguntas ordenadas', async () => {
    const client = readClient();

    const result = await getDraftAssessment(client);

    expect(result).toEqual({
      ...validDraft(),
      id: assessmentId,
      questions: [
        {
          ...validDraft().questions[0],
          id: '22222222-2222-2222-2222-222222222222',
        },
      ],
    });
  });

  it('devuelve null cuando todavía no existe un borrador', async () => {
    await expect(getDraftAssessment(readClient(false))).resolves.toBeNull();
  });
});
