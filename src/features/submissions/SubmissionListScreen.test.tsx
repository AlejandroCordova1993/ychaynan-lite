import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { listSubmissionOverview } from '../../lib/api/submissions';
import { SubmissionListScreen } from './SubmissionListScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/submissions');
beforeEach(() =>
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
      },
      {
        accessId: 'x2',
        studentId: 's2',
        studentName: 'Luis Paz',
        status: 'esperado',
        submissionId: null,
        startedAt: null,
        submittedAt: null,
      },
    ],
  }),
);

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
