import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDraftAssessment } from '../../lib/api/assessments';
import {
  generateAssessmentDraft,
  type GeneratedAssessmentDraft,
} from '../../lib/api/assessmentGeneration';
import { AssessmentEditorScreen } from './AssessmentEditorScreen';

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => ({ kind: 'fake-client' }),
}));

vi.mock('../../lib/api/assessments', () => ({
  getDraftAssessment: vi.fn(),
  saveAssessmentDraft: vi.fn(),
}));

vi.mock('../../lib/api/assessmentGeneration', () => ({
  generateAssessmentDraft: vi.fn(),
}));

const getDraftMock = vi.mocked(getDraftAssessment);
const generateDraftMock = vi.mocked(generateAssessmentDraft);

const generatedDraft: GeneratedAssessmentDraft = {
  title: 'El agua y la comunidad',
  purpose: 'Observar comprensión y razonamiento escrito.',
  generalInstructions: 'Responde con tus propias palabras y apóyate en la lectura.',
  questions: [
    {
      position: 1,
      prompt: '¿Cuál es la idea central de la lectura?',
      instructions: 'Explica tu respuesta con información del texto.',
      suggestedMinWords: 35,
      suggestedMaxWords: 80,
      activeCriteria: ['core.comprension_explicita'],
      activeModules: [],
      curriculumLinks: {},
    },
  ],
};

beforeEach(() => {
  getDraftMock.mockReset().mockResolvedValue(null);
  generateDraftMock.mockReset();
});

async function completeMinimumForm() {
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Crear evaluación' });
  await user.type(screen.getByLabelText('Lectura'), 'Texto de lectura para analizar.');
  await user.type(screen.getByRole('textbox', { name: 'Pregunta 1' }), '¿Qué sostiene el autor?');
  return user;
}

describe('AssessmentEditorScreen · asistente IA', () => {
  it('genera una propuesta sin modificar el formulario hasta que el docente la aplique', async () => {
    generateDraftMock.mockResolvedValue(generatedDraft);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.selectOptions(screen.getByLabelText('Foco diagnóstico'), 'reading_comprehension');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    expect(await screen.findByRole('heading', { name: 'Propuesta de IA' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Pregunta 1' })).toHaveValue(
      '¿Qué sostiene el autor?',
    );
    expect(generateDraftMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        readingText: 'Texto de lectura para analizar.',
        questionCount: 1,
        focus: 'reading_comprehension',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Aplicar borrador generado' }));

    expect(screen.getByLabelText('Título')).toHaveValue('El agua y la comunidad');
    expect(screen.getByRole('textbox', { name: 'Pregunta 1' })).toHaveValue(
      '¿Cuál es la idea central de la lectura?',
    );
  });

  it('conserva el formulario y muestra un error seguro si falla la IA', async () => {
    generateDraftMock.mockRejectedValue(new Error('proveedor caído'));
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos generar una propuesta. Inténtalo nuevamente.',
    );
    expect(screen.getByRole('textbox', { name: 'Pregunta 1' })).toHaveValue(
      '¿Qué sostiene el autor?',
    );
  });
});
