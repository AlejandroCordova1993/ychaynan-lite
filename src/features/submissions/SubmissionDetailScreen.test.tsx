import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { getSubmissionDetail } from '../../lib/api/submissions';
import { SubmissionDetailScreen } from './SubmissionDetailScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/submissions');
beforeEach(() =>
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
        originalText: '  Texto original\ncon error  ',
        wordCount: 4,
        submittedAt: '2026-09-01T11:00:00Z',
      },
    ],
  }),
);

it('muestra texto original y metadatos sin acciones de IA', async () => {
  render(
    <MemoryRouter initialEntries={['/docente/respuestas/sub1']}>
      <Routes>
        <Route path="/docente/respuestas/:submissionId" element={<SubmissionDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument();
  expect(screen.getByText(/Texto original/)).toHaveTextContent('Texto original con error');
  expect(screen.getByText('4 palabras')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /IA|evaluar/i })).not.toBeInTheDocument();
});
