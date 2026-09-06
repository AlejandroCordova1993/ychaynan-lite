import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { BatchEvaluationPanel } from './BatchEvaluationPanel';
import { requestSubmissionEvaluation } from '../../lib/api/evaluations';
import type { SubmissionOverviewRow } from '../../lib/api/submissions';
vi.mock('../../lib/api/evaluations');
vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
const rows: SubmissionOverviewRow[] = [
  {
    accessId: 'x1',
    studentId: 's1',
    studentName: 'Ana',
    submissionId: 'sub1',
    status: 'entregado',
    startedAt: null,
    submittedAt: null,
    groupId: 'g1',
    groupName: '1A',
    schoolYear: '2026',
    evaluationStatus: null,
  },
];
beforeEach(() => {
  vi.mocked(requestSubmissionEvaluation).mockReset().mockResolvedValue({ reused: false });
});
it('requiere elegir un paralelo y confirmar antes de consumir IA', async () => {
  const user = userEvent.setup();
  const finished = vi.fn().mockResolvedValue(undefined);
  const { rerender } = render(
    <BatchEvaluationPanel
      rows={rows}
      groupLabel={null}
      onBusyChange={vi.fn()}
      onFinished={finished}
    />,
  );
  expect(screen.getByRole('button', { name: 'Evaluar entregas pendientes' })).toBeDisabled();
  rerender(
    <BatchEvaluationPanel
      rows={rows}
      groupLabel="1A"
      onBusyChange={vi.fn()}
      onFinished={finished}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Evaluar entregas pendientes' }));
  expect(requestSubmissionEvaluation).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Confirmar evaluación del paralelo' }));
  expect(await screen.findByText(/Lote terminado/)).toBeInTheDocument();
  expect(requestSubmissionEvaluation).toHaveBeenCalledWith({}, 'sub1', false);
  expect(finished).toHaveBeenCalledTimes(1);
});
it('muestra los fallos individuales sin afirmar que se evaluaron', async () => {
  vi.mocked(requestSubmissionEvaluation).mockRejectedValue(new Error('fallo'));
  const user = userEvent.setup();
  render(
    <BatchEvaluationPanel
      rows={rows}
      groupLabel="1A"
      onBusyChange={vi.fn()}
      onFinished={vi.fn().mockResolvedValue(undefined)}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Evaluar entregas pendientes' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar evaluación del paralelo' }));
  expect(await screen.findByText('1 de 1 procesados; 0 evaluados.')).toBeInTheDocument();
  expect(screen.getByText(/Ana: Sin confirmar/)).toBeInTheDocument();
});
