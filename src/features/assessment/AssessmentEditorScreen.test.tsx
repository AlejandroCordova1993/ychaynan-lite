import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDraftAssessment, saveAssessmentDraft } from '../../lib/api/assessments';
import { AssessmentEditorScreen } from './AssessmentEditorScreen';

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => ({ kind: 'fake-client' }),
}));

vi.mock('../../lib/api/assessments', () => ({
  getDraftAssessment: vi.fn(),
  saveAssessmentDraft: vi.fn(),
}));

const getDraftMock = vi.mocked(getDraftAssessment);
const saveDraftMock = vi.mocked(saveAssessmentDraft);

beforeEach(() => {
  getDraftMock.mockReset();
  saveDraftMock.mockReset();
  getDraftMock.mockResolvedValue(null);
});

async function completeMinimumForm() {
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Crear evaluación' });
  await user.type(screen.getByLabelText('Título'), 'Diagnóstico inicial');
  await user.type(screen.getByLabelText('Propósito diagnóstico'), 'Reconocer necesidades.');
  await user.type(screen.getByLabelText('Lectura'), 'Texto de lectura para analizar.');
  await user.type(screen.getByRole('textbox', { name: 'Pregunta 1' }), '¿Qué sostiene el autor?');
  return user;
}

describe('AssessmentEditorScreen', () => {
  it('conserva el formulario y muestra un aviso comprensible si falla el guardado', async () => {
    saveDraftMock.mockRejectedValue(new Error('fallo de red'));
    const user = userEvent.setup();
    render(<AssessmentEditorScreen />);

    await screen.findByRole('heading', { name: 'Crear evaluación' });
    await user.type(screen.getByLabelText('Título'), 'Diagnóstico inicial');
    await user.type(screen.getByLabelText('Propósito diagnóstico'), 'Reconocer necesidades.');
    await user.type(screen.getByLabelText('Lectura'), 'Texto de lectura para analizar.');
    await user.type(screen.getByRole('textbox', { name: 'Pregunta 1' }), '¿Qué sostiene el autor?');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar el borrador. Tus cambios siguen en esta pantalla.',
    );
    expect(screen.getByLabelText('Título')).toHaveValue('Diagnóstico inicial');
    expect(screen.getByRole('textbox', { name: 'Pregunta 1' })).toHaveValue(
      '¿Qué sostiene el autor?',
    );
  });

  it('añade hasta cuatro preguntas, renumera y permite eliminar', async () => {
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();
    const addButton = screen.getByRole('button', { name: 'Añadir pregunta' });

    await user.click(addButton);
    await user.click(addButton);
    await user.click(addButton);

    expect(screen.getByRole('textbox', { name: 'Pregunta 4' })).toBeInTheDocument();
    expect(addButton).toBeDisabled();

    const thirdQuestion = screen.getByRole('group', { name: 'Pregunta 3' });
    await user.click(within(thirdQuestion).getByRole('button', { name: 'Eliminar pregunta 3' }));

    expect(screen.queryByRole('textbox', { name: 'Pregunta 4' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Pregunta 3' })).toBeInTheDocument();
    expect(addButton).toBeEnabled();
  });

  it('recupera el borrador existente y guarda el contrato validado', async () => {
    getDraftMock.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Diagnóstico recuperado',
      purpose: 'Observar comprensión y escritura.',
      readingText: 'Lectura ya guardada.',
      generalInstructions: '',
      opensAt: null,
      closesAt: null,
      pastePolicy: 'discourage',
      curriculumVersion: null,
      questions: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          position: 1,
          prompt: 'Explica la idea central.',
          instructions: '',
          suggestedMinWords: 40,
          suggestedMaxWords: 100,
          activeCriteria: ['core.comprension_explicita'],
          activeModules: [],
          curriculumLinks: {},
        },
      ],
    });
    saveDraftMock.mockResolvedValue('11111111-1111-1111-1111-111111111111');
    render(<AssessmentEditorScreen />);
    const user = userEvent.setup();

    expect(await screen.findByDisplayValue('Diagnóstico recuperado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    await waitFor(() => expect(saveDraftMock).toHaveBeenCalledTimes(1));
    expect(saveDraftMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Diagnóstico recuperado',
        questions: [
          expect.objectContaining({
            position: 1,
            activeCriteria: ['core.comprension_explicita'],
          }),
        ],
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Borrador guardado');
  });
});
