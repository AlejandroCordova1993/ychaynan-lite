import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateStudent } from '../../lib/api/studentAssessment';
import { StudentAccessScreen } from './StudentAccessScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/studentAssessment');

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/evaluacion/diagnostico']}>
      <Routes>
        <Route path="/evaluacion/:slug" element={<StudentAccessScreen />} />
        <Route path="/evaluacion/:slug/responder" element={<p>Editor estudiantil</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(validateStudent).mockResolvedValue({
    token: 'token-seguro-de-prueba-con-longitud-suficiente',
    expiresAt: '2099-09-01T12:00:00.000Z',
    clientSubmissionKey: 'key',
    submissionId: 'submission-1',
    draftVersion: 0,
  });
});

describe('StudentAccessScreen', () => {
  it('solicita nombre completo, paralelo y código y continúa con sesión válida', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText('Nombres y apellidos completos'), 'María Peña');
    await user.type(screen.getByLabelText('Paralelo'), '3ro BGU A');
    await user.type(screen.getByLabelText('Código personal'), 'ABCD2345');
    await user.click(screen.getByRole('button', { name: 'Ingresar a la evaluación' }));
    expect(await screen.findByText('Editor estudiantil')).toBeInTheDocument();
    expect(sessionStorage.getItem('ychaynan-lite:v1:session:diagnostico')).toContain(
      'submission-1',
    );
  });

  it('muestra un error genérico sin borrar los campos', async () => {
    vi.mocked(validateStudent).mockRejectedValue(new Error('privado'));
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText('Nombres y apellidos completos'), 'María Peña');
    await user.type(screen.getByLabelText('Paralelo'), '3ro BGU A');
    await user.type(screen.getByLabelText('Código personal'), 'MALO2345');
    await user.click(screen.getByRole('button', { name: 'Ingresar a la evaluación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos validar tus datos');
    expect(screen.getByLabelText('Nombres y apellidos completos')).toHaveValue('María Peña');
  });
});
