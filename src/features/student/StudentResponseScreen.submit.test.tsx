import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { loadStudentAssessment, saveStudentDraft } from '../../lib/api/studentAssessment';
import { submitAssessment } from '../../lib/api/studentSubmission';
import { saveStudentSession } from './studentSessionStorage';
import { StudentResponseScreen } from './StudentResponseScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/studentAssessment');
vi.mock('../../lib/api/studentSubmission');

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.clearAllMocks();
  saveStudentSession('diag', {
    token: 'token-seguro-de-prueba-con-longitud-suficiente',
    expiresAt: '2099-09-01T00:00:00.000Z',
    clientSubmissionKey: 'key',
    submissionId: 'sub',
    draftVersion: 0,
  });
  vi.mocked(loadStudentAssessment).mockResolvedValue({
    assessment: {
      slug: 'diag',
      title: 'D',
      readingText: 'L',
      generalInstructions: '',
      pastePolicy: 'discourage',
      closesAt: null,
      questions: [
        {
          id: 'q1',
          position: 1,
          prompt: 'Pregunta',
          instructions: '',
          suggestedMinWords: null,
          suggestedMaxWords: null,
        },
      ],
    },
    responses: [],
    draftVersion: 0,
  });
  vi.mocked(saveStudentDraft).mockResolvedValue({ ok: true, draftVersion: 1 });
  vi.mocked(submitAssessment).mockResolvedValue({
    receiptId: 'sub',
    submittedAt: '2026-09-01T12:00:00.000Z',
    finalDraftVersion: 1,
  });
});

it('confirma el resumen, sincroniza y entrega antes de navegar al recibo', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/evaluacion/diag/responder']}>
      <Routes>
        <Route path="/evaluacion/:slug/responder" element={<StudentResponseScreen />} />
        <Route path="/evaluacion/:slug/entregada" element={<p>Recibo visible</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await user.type(await screen.findByLabelText('Respuesta a la pregunta 1'), 'Mi respuesta');
  await user.click(screen.getByRole('button', { name: 'Revisar y entregar' }));
  expect(screen.getByRole('dialog', { name: 'Confirmar entrega' })).toHaveAttribute(
    'aria-modal',
    'true',
  );
  expect(screen.getByText('1 de 1 preguntas respondidas')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Confirmar entrega definitiva' }));
  expect(await screen.findByText('Recibo visible')).toBeInTheDocument();
  expect(saveStudentDraft).toHaveBeenCalled();
  expect(submitAssessment).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ expectedVersion: 1, confirmed: true }),
  );
  expect(sessionStorage.getItem('ychaynan-lite:v1:receipt:diag')).toContain('sub');
});

it('distingue un resultado de entrega incierto de un fallo de guardado', async () => {
  vi.mocked(submitAssessment).mockRejectedValueOnce(new Error('respuesta ilegible'));
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/evaluacion/diag/responder']}>
      <Routes>
        <Route path="/evaluacion/:slug/responder" element={<StudentResponseScreen />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.type(await screen.findByLabelText('Respuesta a la pregunta 1'), 'Mi respuesta');
  await user.click(screen.getByRole('button', { name: 'Revisar y entregar' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar entrega definitiva' }));

  expect(
    await screen.findByText(/No pudimos confirmar si la entrega se registró/i),
  ).toBeInTheDocument();
  expect(screen.queryByText('No se pudo sincronizar')).not.toBeInTheDocument();
});

it('explica que las respuestas locales se conservan cuando falla el guardado final', async () => {
  vi.mocked(saveStudentDraft)
    .mockResolvedValueOnce({ ok: true, draftVersion: 1 })
    .mockRejectedValueOnce(new Error('sin conexión'));
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/evaluacion/diag/responder']}>
      <Routes>
        <Route path="/evaluacion/:slug/responder" element={<StudentResponseScreen />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.type(await screen.findByLabelText('Respuesta a la pregunta 1'), 'Mi respuesta');
  await user.click(screen.getByRole('button', { name: 'Revisar y entregar' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar entrega definitiva' }));

  expect(await screen.findByText(/No pudimos guardar la última versión/i)).toBeInTheDocument();
  expect(screen.getByText(/siguen guardadas en este equipo/i)).toBeInTheDocument();
  expect(submitAssessment).not.toHaveBeenCalled();
});

it('espera el autoguardado en curso antes de sincronizar la entrega definitiva', async () => {
  let completeAutosave: ((value: { ok: true; draftVersion: number }) => void) | undefined;
  vi.mocked(saveStudentDraft)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeAutosave = resolve;
        }),
    )
    .mockResolvedValueOnce({ ok: true, draftVersion: 2 });
  vi.mocked(submitAssessment).mockResolvedValue({
    receiptId: 'sub',
    submittedAt: '2026-09-01T12:00:00.000Z',
    finalDraftVersion: 2,
  });

  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/evaluacion/diag/responder']}>
      <Routes>
        <Route path="/evaluacion/:slug/responder" element={<StudentResponseScreen />} />
        <Route path="/evaluacion/:slug/entregada" element={<p>Recibo visible</p>} />
      </Routes>
    </MemoryRouter>,
  );

  await user.type(await screen.findByLabelText('Respuesta a la pregunta 1'), 'Mi respuesta');
  await user.click(screen.getByRole('button', { name: 'Revisar y entregar' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar entrega definitiva' }));

  expect(saveStudentDraft).toHaveBeenCalledTimes(1);
  expect(submitAssessment).not.toHaveBeenCalled();

  completeAutosave?.({ ok: true, draftVersion: 1 });

  expect(await screen.findByText('Recibo visible')).toBeInTheDocument();
  expect(saveStudentDraft).toHaveBeenNthCalledWith(
    2,
    expect.anything(),
    expect.objectContaining({ expectedVersion: 1 }),
  );
  expect(submitAssessment).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ expectedVersion: 2, confirmed: true }),
  );
});
