import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { loadStudentAssessment, saveStudentDraft } from '../../lib/api/studentAssessment';
import { saveStudentSession } from './studentSessionStorage';
import { StudentResponseScreen } from './StudentResponseScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/studentAssessment');

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

it('conserva exactamente el texto local y sincroniza al salir del campo', async () => {
  const user = userEvent.setup();
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');
  await user.type(answer, '  Él dijo:{enter}"sí"  ');
  expect(localStorage.getItem('ychaynan-lite:v1:draft:diag')).toContain('Él dijo');
  await user.tab();
  expect(saveStudentDraft).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ responses: [{ questionId: 'q1', text: '  Él dijo:\n"sí"  ' }] }),
  );
});

it('muestra ambas versiones ante un conflicto sin fusionarlas', async () => {
  vi.mocked(saveStudentDraft).mockResolvedValue({
    ok: false,
    conflict: true,
    draftVersion: 2,
    responses: [{ questionId: 'q1', text: 'texto remoto' }],
  });
  const user = userEvent.setup();
  renderScreen();
  const answer = await screen.findByLabelText('Respuesta a la pregunta 1');
  await user.type(answer, 'texto local');
  await user.tab();
  expect(await screen.findByText('Hay dos versiones del borrador')).toBeInTheDocument();
  expect(screen.getByText('texto remoto')).toBeInTheDocument();
  expect(screen.getAllByText('texto local')).toHaveLength(2);
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
