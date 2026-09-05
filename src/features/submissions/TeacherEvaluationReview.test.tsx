import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { TeacherEvaluationReview } from './TeacherEvaluationReview';
import { reviewEvaluation } from '../../lib/api/evaluationReview';
import type { SubmissionEvaluationView } from '../../lib/api/evaluations';
vi.mock('../../lib/api/evaluationReview', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api/evaluationReview')>()),
  reviewEvaluation: vi.fn(),
}));
vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
const evaluation: SubmissionEvaluationView = {
  id: 'eval',
  status: 'completed',
  confidence: 0.8,
  requestedAt: '2026-09-04',
  completedAt: null,
  errorCode: null,
  errorMessage: null,
  result: {
    questionResults: [
      {
        position: 1,
        criteria: [
          {
            criterionId: 'core.pertinencia',
            level: 3,
            reason: 'Responde',
            evidences: [],
            confidence: 0.8,
            review: 'none',
          },
        ],
        modules: [],
        observations: [],
        strengths: [],
        priorities: [],
      },
    ],
    dimensionSummaries: [],
    globalConfidence: 0.8,
    limitations: [],
  },
};
beforeEach(() => {
  vi.mocked(reviewEvaluation).mockReset();
});
it('confirma ajustes antes de guardarlos y vuelve a cargar el resultado', async () => {
  const saved = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<TeacherEvaluationReview evaluation={evaluation} onSaved={saved} />);
  await user.selectOptions(screen.getByRole('combobox'), '2');
  await user.clear(screen.getByLabelText('Justificación docente'));
  await user.type(screen.getByLabelText('Justificación docente'), 'Falta evidencia');
  await user.click(screen.getByRole('button', { name: 'Aprobar evaluación' }));
  expect(reviewEvaluation).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Confirmar revisión definitiva' }));
  expect(reviewEvaluation).toHaveBeenCalledWith(
    {},
    'eval',
    'reviewed',
    [{ position: 1, id: 'core.pertinencia', level: 2, reason: 'Falta evidencia' }],
    '',
  );
  expect(saved).toHaveBeenCalled();
});
it('exige motivo para descartar y muestra error de persistencia', async () => {
  vi.mocked(reviewEvaluation).mockRejectedValue(new Error('Error al guardar'));
  const user = userEvent.setup();
  render(<TeacherEvaluationReview evaluation={evaluation} onSaved={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Descartar evaluación' })).toBeDisabled();
  await user.type(screen.getByLabelText(/Nota docente/), 'Incorrecta');
  await user.click(screen.getByRole('button', { name: 'Descartar evaluación' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar revisión definitiva' }));
  expect(await screen.findByText('Error al guardar')).toBeInTheDocument();
});
it('muestra ajustes finales después de recargar', () => {
  render(
    <TeacherEvaluationReview
      evaluation={{
        ...evaluation,
        status: 'reviewed',
        teacherAdjustments: [
          { position: 1, id: 'core.pertinencia', level: 2, reason: 'Corregido' },
        ],
      }}
      onSaved={vi.fn()}
    />,
  );
  expect(screen.getByRole('combobox')).toHaveValue('2');
  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Aprobar evaluación' })).not.toBeInTheDocument();
});
