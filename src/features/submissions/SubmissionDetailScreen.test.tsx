import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { getSubmissionEvaluation, requestSubmissionEvaluation } from '../../lib/api/evaluations';
import { getSubmissionDetail } from '../../lib/api/submissions';
import { SubmissionDetailScreen } from './SubmissionDetailScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/submissions');
vi.mock('../../lib/api/evaluations');
beforeEach(() => {
  vi.mocked(getSubmissionDetail).mockResolvedValue({
    id: 'sub1',
    studentName: 'Ana Ruiz',
    assessmentTitle: 'Diagnóstico',
    readingText: 'Lectura base',
    startedAt: '2026-09-01T10:00:00Z',
    submittedAt: '2026-09-01T11:00:00Z',
    responses: [
      {
        questionId: 'q1',
        position: 1,
        prompt: 'Pregunta',
        instructions: '',
        originalText: '  Texto original\ncon error  ',
        wordCount: 4,
        submittedAt: '2026-09-01T11:00:00Z',
        suggestedMinWords: 30,
        suggestedMaxWords: 80,
        activeCriteria: ['core.pertinencia'],
        activeModules: [],
      },
    ],
  });
  vi.mocked(getSubmissionEvaluation).mockResolvedValue(null);
  vi.mocked(requestSubmissionEvaluation).mockResolvedValue({ reused: false });
});

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/docente/respuestas/sub1']}>
      <Routes>
        <Route path="/docente/respuestas/:submissionId" element={<SubmissionDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

it('muestra texto original y permite solicitar una evaluación IA', async () => {
  renderScreen();
  expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument();
  expect(screen.getByText(/Texto original/)).toHaveTextContent('Texto original con error');
  expect(screen.getByText('4 palabras')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Evaluar con IA' })).toBeInTheDocument();
});

it('solicita la evaluación y muestra el resultado provisional', async () => {
  const user = userEvent.setup();
  vi.mocked(getSubmissionEvaluation)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({
      id: 'evaluation-id',
      status: 'completed',
      result: {
        questionResults: [
          {
            position: 1,
            criteria: [
              {
                criterionId: 'core.pertinencia',
                level: 3,
                reason: 'Responde a la consigna.',
                evidences: ['Texto original'],
                confidence: 0.8,
                review: 'none',
              },
            ],
            modules: [],
            observations: [],
            strengths: ['Mantiene el foco.'],
            priorities: ['Desarrollar la evidencia.'],
          },
        ],
        dimensionSummaries: [
          {
            dimension: 'comprension_lectora',
            applicableCriteria: 0,
            scoredCriteria: 0,
            averageLevel: null,
            confidence: 0,
            strengths: [],
            priorities: [],
          },
          {
            dimension: 'respuesta_razonamiento',
            applicableCriteria: 1,
            scoredCriteria: 1,
            averageLevel: 3,
            confidence: 0.8,
            strengths: ['Pertinencia.'],
            priorities: [],
          },
          {
            dimension: 'organizacion_discursiva',
            applicableCriteria: 0,
            scoredCriteria: 0,
            averageLevel: null,
            confidence: 0,
            strengths: [],
            priorities: [],
          },
          {
            dimension: 'convenciones_escritura',
            applicableCriteria: 0,
            scoredCriteria: 0,
            averageLevel: null,
            confidence: 0,
            strengths: [],
            priorities: [],
          },
        ],
        globalConfidence: 0.8,
        limitations: ['La respuesta es breve.'],
      },
      confidence: 0.8,
      requestedAt: '2026-09-03T10:00:00Z',
      completedAt: '2026-09-03T10:01:00Z',
      errorCode: null,
      errorMessage: null,
    });
  renderScreen();

  await user.click(await screen.findByRole('button', { name: 'Evaluar con IA' }));

  expect(requestSubmissionEvaluation).toHaveBeenCalledWith({}, 'sub1', false);
  expect(await screen.findByText(/Resultado provisional/)).toBeInTheDocument();
  expect(screen.getByText('Responde a la consigna.')).toBeInTheDocument();
  expect(screen.getByText('La respuesta es breve.')).toBeInTheDocument();
});

it('reintenta solamente una evaluación fallida', async () => {
  const user = userEvent.setup();
  vi.mocked(getSubmissionEvaluation).mockResolvedValue({
    id: 'evaluation-id',
    status: 'failed',
    result: null,
    confidence: null,
    requestedAt: '2026-09-03T10:00:00Z',
    completedAt: null,
    errorCode: 'ai_timeout',
    errorMessage: 'La evaluación tardó demasiado.',
  });
  renderScreen();

  await user.click(await screen.findByRole('button', { name: 'Reintentar evaluación con IA' }));

  expect(requestSubmissionEvaluation).toHaveBeenCalledWith({}, 'sub1', true);
});
