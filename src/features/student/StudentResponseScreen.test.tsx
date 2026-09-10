import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadStudentAssessment, saveStudentDraft } from '../../lib/api/studentAssessment';
import { saveStudentSession } from './studentSessionStorage';
import { loadLocalDraft, saveLocalDraft } from './draftStorage';
import { StudentResponseScreen } from './StudentResponseScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/studentAssessment');

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('no guarda en nube por pausa, desenfoque o reconexión', async () => {
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');
  vi.useFakeTimers();
  fireEvent.change(answer, { target: { value: 'Primera versión' } });
  await act(() => vi.advanceTimersByTimeAsync(1000));
  fireEvent.change(answer, { target: { value: 'Versión definitiva' } });
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(saveStudentDraft).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1000));
  fireEvent.blur(answer);
  act(() => window.dispatchEvent(new Event('online')));
  await act(() => vi.advanceTimersByTimeAsync(60000));
  expect(saveStudentDraft).not.toHaveBeenCalled();
  expect(loadLocalDraft('diag', 'sub')?.responses.q1).toBe('Versión definitiva');
});

it('requiere guardar manualmente después de recuperar conexión', async () => {
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  try {
    fireEvent.change(answer, { target: { value: 'Escrito sin internet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await screen.findByText('Sin conexión');
    online.mockReturnValue(true);
    fireEvent(window, new Event('online'));
    expect(saveStudentDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await screen.findByText('Borrador guardado en la nube');
    expect(saveStudentDraft).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ responses: [{ questionId: 'q1', text: 'Escrito sin internet' }] }),
    );
  } finally {
    online.mockRestore();
  }
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
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
      title: 'Diagnóstico',
      readingText: 'Lectura base',
      generalInstructions: '',
      pastePolicy: 'discourage',
      closesAt: null,
      questions: [
        {
          id: 'q1',
          position: 1,
          prompt: '¿Qué piensas?',
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
});

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/evaluacion/diag/responder']}>
      <Routes>
        <Route path="/evaluacion/:slug/responder" element={<StudentResponseScreen />} />
        <Route path="/evaluacion/:slug" element={<p>Acceso</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

it('conserva exactamente el texto al guardar el borrador manualmente', async () => {
  const user = userEvent.setup();
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');
  await user.type(answer, '  Él dijo:{enter}"sí"  ');
  expect(localStorage.getItem('ychaynan-lite:v2:draft:diag:sub')).toContain('Él dijo');
  await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
  expect(saveStudentDraft).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ responses: [{ questionId: 'q1', text: '  Él dijo:\n"sí"  ' }] }),
  );
});

it('no reemplaza con un guardado tardío el borrador local escrito después', async () => {
  let resolveSave: ((value: { ok: true; draftVersion: number }) => void) | undefined;
  vi.mocked(saveStudentDraft).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
  );
  const user = userEvent.setup();
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');

  await user.type(answer, 'A');
  await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
  await user.click(answer);
  await user.type(answer, 'B');
  expect(loadLocalDraft('diag', 'sub')?.responses.q1).toBe('AB');

  await act(async () => {
    resolveSave?.({ ok: true, draftVersion: 1 });
    await Promise.resolve();
  });

  await vi.waitFor(() => {
    expect(loadLocalDraft('diag', 'sub')?.draftVersion).toBe(1);
  });
  expect(answer).toHaveValue('AB');
  expect(loadLocalDraft('diag', 'sub')?.responses.q1).toBe('AB');
  expect(screen.getByText('Guardado en este equipo')).toBeInTheDocument();
});

it('muestra ambas versiones y permite conservar explícitamente la local', async () => {
  vi.mocked(saveStudentDraft)
    .mockResolvedValueOnce({
      ok: false,
      conflict: true,
      draftVersion: 2,
      responses: [{ questionId: 'q1', text: 'texto remoto' }],
    })
    .mockResolvedValueOnce({ ok: true, draftVersion: 3 });
  const user = userEvent.setup();
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');
  await user.type(answer, 'texto local');
  await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
  expect(await screen.findByText('Hay dos versiones del borrador')).toBeInTheDocument();
  expect(screen.getByText('texto remoto')).toBeInTheDocument();
  expect(screen.getAllByText('texto local')).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Conservar versión de este equipo' }));
  expect(screen.queryByText('Hay dos versiones del borrador')).not.toBeInTheDocument();
  expect(saveStudentDraft).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
  expect(saveStudentDraft).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      expectedVersion: 2,
      responses: [{ questionId: 'q1', text: 'texto local' }],
    }),
  );
});

it('no carga el borrador de otra entrega en un equipo compartido', async () => {
  saveLocalDraft('diag', 'sub-ajena', 0, { q1: 'respuesta de otra estudiante' });
  vi.mocked(loadStudentAssessment).mockResolvedValueOnce({
    assessment: {
      slug: 'diag',
      title: 'Diagnóstico',
      readingText: 'Lectura base',
      generalInstructions: '',
      pastePolicy: 'discourage',
      closesAt: null,
      questions: [
        {
          id: 'q1',
          position: 1,
          prompt: '¿Qué piensas?',
          instructions: '',
          suggestedMinWords: null,
          suggestedMaxWords: null,
        },
      ],
    },
    responses: [{ questionId: 'q1', text: 'respuesta remota propia' }],
    draftVersion: 4,
  });
  renderScreen();
  expect(await screen.findByLabelText('Respuesta a la pregunta 1')).toHaveValue(
    'respuesta remota propia',
  );
});

it('no mezcla un borrador local antiguo con la versión remota nueva', async () => {
  saveLocalDraft('diag', 'sub', 1, { q1: 'texto local antiguo' });
  vi.mocked(loadStudentAssessment).mockResolvedValueOnce({
    assessment: {
      slug: 'diag',
      title: 'Diagnóstico',
      readingText: 'Lectura base',
      generalInstructions: '',
      pastePolicy: 'discourage',
      closesAt: null,
      questions: [
        {
          id: 'q1',
          position: 1,
          prompt: '¿Qué piensas?',
          instructions: '',
          suggestedMinWords: null,
          suggestedMaxWords: null,
        },
      ],
    },
    responses: [{ questionId: 'q1', text: 'texto remoto reciente' }],
    draftVersion: 7,
  });
  const user = userEvent.setup();
  renderScreen();
  expect(await screen.findByLabelText('Respuesta a la pregunta 1')).toHaveValue(
    'texto remoto reciente',
  );
  expect(screen.getByText('Hay dos versiones del borrador')).toBeInTheDocument();
  expect(screen.getByLabelText('Respuesta a la pregunta 1')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Usar versión guardada en línea' }));
  expect(screen.queryByText('Hay dos versiones del borrador')).not.toBeInTheDocument();
  expect(saveStudentDraft).not.toHaveBeenCalled();
});

it('muestra instrucciones generales, orientación de extensión y cierre', async () => {
  vi.mocked(loadStudentAssessment).mockResolvedValueOnce({
    assessment: {
      slug: 'diag',
      title: 'Diagnóstico',
      readingText: 'Lectura base',
      generalInstructions: 'Argumenta con una evidencia de la lectura.',
      pastePolicy: 'discourage',
      closesAt: '2026-09-08T20:00:00.000Z',
      questions: [
        {
          id: 'q1',
          position: 1,
          prompt: '¿Qué piensas?',
          instructions: '',
          suggestedMinWords: 80,
          suggestedMaxWords: 120,
        },
      ],
    },
    responses: [],
    draftVersion: 0,
  });
  renderScreen();
  expect(await screen.findByText('Argumenta con una evidencia de la lectura.')).toBeInTheDocument();
  expect(screen.getByText('Extensión sugerida: entre 80 y 120 palabras.')).toBeInTheDocument();
  expect(screen.getByText(/Fecha de cierre:/)).toBeInTheDocument();
});

it('inserta entre comillas un fragmento pegado desde la lectura', async () => {
  const user = userEvent.setup();
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');

  await user.click(answer);
  await user.paste('Lectura base');

  expect(answer).toHaveValue('“Lectura base”');
});

it('bloquea un pegado externo e informa al estudiante', async () => {
  const user = userEvent.setup();
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');

  await user.click(answer);
  await user.paste('Respuesta generada fuera de la lectura');

  expect(answer).toHaveValue('');
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Solo puedes pegar fragmentos que aparezcan en la lectura',
  );
});

it('mantiene el pegado sin restricciones cuando el docente lo permite', async () => {
  vi.mocked(loadStudentAssessment).mockResolvedValueOnce({
    assessment: {
      slug: 'diag',
      title: 'Diagnóstico',
      readingText: 'Lectura base',
      generalInstructions: '',
      pastePolicy: 'allow',
      closesAt: null,
      questions: [
        {
          id: 'q1',
          position: 1,
          prompt: '¿Qué piensas?',
          instructions: '',
          suggestedMinWords: null,
          suggestedMaxWords: null,
        },
      ],
    },
    responses: [],
    draftVersion: 0,
  });
  const user = userEvent.setup();
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');

  await user.click(answer);
  await user.paste('Texto externo permitido');

  expect(answer).toHaveValue('Texto externo permitido');
});
