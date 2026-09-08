import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { getSubmissionDetail, mapAccessState } from './submissions';

describe('mapAccessState', () => {
  it('distingue esperado, iniciado y entregado sin inventar una nota', () => {
    expect(mapAccessState({ access: 'unused', submission: null })).toBe('esperado');
    expect(mapAccessState({ access: 'active', submission: 'in_progress' })).toBe('iniciado');
    expect(mapAccessState({ access: 'submitted', submission: 'submitted' })).toBe('entregado');
    expect(mapAccessState({ access: 'blocked', submission: null })).toBe('bloqueado');
  });
});

it('incluye todas las preguntas y marca las omitidas aunque no tengan fila de respuesta', async () => {
  const questions = [
    {
      id: 'q1',
      position: 1,
      prompt: 'Primera',
      instructions: '',
      suggested_min_words: null,
      suggested_max_words: null,
      active_criteria: ['core.pertinencia'],
      active_modules: [],
    },
    {
      id: 'q2',
      position: 2,
      prompt: 'Segunda',
      instructions: '',
      suggested_min_words: null,
      suggested_max_words: null,
      active_criteria: ['core.comprension_explicita'],
      active_modules: [],
    },
  ];
  const header = {
    id: 'sub-1',
    started_at: '2026-09-08T10:00:00Z',
    submitted_at: '2026-09-08T11:00:00Z',
    students: { full_name_original: 'Ana Ruiz' },
    assessments: {
      id: 'assessment-1',
      title: 'Diagnóstico',
      reading_text: 'Lectura',
      questions,
    },
  };
  const responses = [
    {
      question_id: 'q1',
      original_text: 'Respuesta escrita',
      word_count: 2,
      submitted_at: '2026-09-08T11:00:00Z',
      questions: { ...questions[0] },
    },
  ];
  const resultFor = (table: string) =>
    table === 'submissions'
      ? { data: header, error: null }
      : table === 'questions'
        ? { data: questions, error: null }
        : { data: responses, error: null };
  const client = {
    from: vi.fn((table: string) => {
      const terminal = () => Promise.resolve(resultFor(table));
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => terminal()),
        single: vi.fn(() => terminal()),
        then: (resolve: (value: unknown) => unknown) => terminal().then(resolve),
      };
      return chain;
    }),
  } as unknown as SupabaseClient;

  const detail = await getSubmissionDetail(client, 'sub-1');

  expect(detail.responses).toEqual([
    expect.objectContaining({
      questionId: 'q1',
      originalText: 'Respuesta escrita',
      omitted: false,
    }),
    expect.objectContaining({ questionId: 'q2', originalText: null, wordCount: 0, omitted: true }),
  ]);
});
