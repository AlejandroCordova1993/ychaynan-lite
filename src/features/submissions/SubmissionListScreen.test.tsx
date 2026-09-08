import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { listAppliedAssessments, listSubmissionOverview } from '../../lib/api/submissions';
import { SubmissionListScreen } from './SubmissionListScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/submissions');
beforeEach(() => {
  vi.mocked(listAppliedAssessments).mockResolvedValue([
    { id: 'a1', title: 'Diagnóstico', status: 'open', opened_at: null },
  ]);
  vi.mocked(listSubmissionOverview).mockResolvedValue({
    assessmentId: 'a1',
    title: 'Diagnóstico',
    rows: [
      {
        accessId: 'x1',
        studentId: 's1',
        studentName: 'Ana Ruiz',
        status: 'entregado',
        submissionId: 'sub1',
        startedAt: '2026-09-01T10:00:00Z',
        submittedAt: '2026-09-01T11:00:00Z',
        groupId: 'g1',
        groupName: '1A',
        schoolYear: '2026',
        evaluationStatus: null,
        evaluationRetryable: false,
      },
      {
        accessId: 'x2',
        studentId: 's2',
        studentName: 'Luis Paz',
        status: 'esperado',
        submissionId: null,
        startedAt: null,
        submittedAt: null,
        groupId: 'g2',
        groupName: '1B',
        schoolYear: '2026',
        evaluationStatus: null,
        evaluationRetryable: false,
      },
    ],
  });
});

it('filtra estados y enlaza únicamente las entregas existentes', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <SubmissionListScreen />
    </MemoryRouter>,
  );
  expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver respuesta de Ana Ruiz' })).toHaveAttribute(
    'href',
    '/docente/respuestas/sub1',
  );
  await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'esperado');
  expect(screen.getByText('Luis Paz')).toBeInTheDocument();
  expect(screen.queryByText('Ana Ruiz')).not.toBeInTheDocument();
});

it('separa estudiantes y resumen por paralelo y exige seleccionar uno para evaluar', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <SubmissionListScreen />
    </MemoryRouter>,
  );
  await screen.findByText('Ana Ruiz');
  expect(screen.getByRole('button', { name: 'Evaluar entregas pendientes' })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText('Filtrar por paralelo'), 'g1');
  expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
  expect(screen.queryByText('Luis Paz')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Resumen del paralelo')).toHaveTextContent(
    '1 estudiantes · 1 entregas',
  );
  expect(screen.getByRole('button', { name: 'Evaluar entregas pendientes' })).toBeEnabled();
  await user.selectOptions(screen.getByLabelText('Filtrar por paralelo'), 'g2');
  expect(screen.queryByText('Ana Ruiz')).not.toBeInTheDocument();
  expect(screen.getByText('Luis Paz')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Evaluar entregas pendientes' })).toBeDisabled();
});

it('consulta la evaluación histórica seleccionada sin conservar las filas anteriores', async () => {
  vi.mocked(listAppliedAssessments).mockResolvedValue([
    { id: 'a1', title: 'Diagnóstico', status: 'open', opened_at: null },
    { id: 'a2', title: 'Anterior', status: 'closed', opened_at: null },
  ]);
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <SubmissionListScreen />
    </MemoryRouter>,
  );
  await screen.findByText('Ana Ruiz');
  vi.mocked(listSubmissionOverview).mockResolvedValue({
    assessmentId: 'a2',
    title: 'Anterior',
    rows: [],
  });
  await user.selectOptions(screen.getByLabelText('Evaluación'), 'a2');
  await waitFor(() =>
    expect(listSubmissionOverview).toHaveBeenLastCalledWith(expect.anything(), 'a2'),
  );
  expect(screen.queryByText('Ana Ruiz')).not.toBeInTheDocument();
});
