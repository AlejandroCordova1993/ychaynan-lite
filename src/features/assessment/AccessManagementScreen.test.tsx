import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDraftAssessment } from '../../lib/api/assessments';
import { openAssessment } from '../../lib/api/assessmentAccess';
import { listGroups } from '../../lib/api/groups';
import { AccessManagementScreen } from './AccessManagementScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/assessments');
vi.mock('../../lib/api/assessmentAccess');
vi.mock('../../lib/api/groups');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDraftAssessment).mockResolvedValue({
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Diagnóstico inicial',
    purpose: 'Línea base',
    readingText: 'Lectura',
    generalInstructions: '',
    opensAt: null,
    closesAt: null,
    pastePolicy: 'discourage',
    curriculumVersion: null,
    questions: [
      {
        position: 1,
        prompt: 'Pregunta',
        instructions: '',
        suggestedMinWords: null,
        suggestedMaxWords: null,
        activeCriteria: ['core.pertinencia'],
        activeModules: [],
        curriculumLinks: {},
      },
    ],
  });
  vi.mocked(listGroups).mockResolvedValue([
    { id: 'group-1', name: '3ro BGU A', schoolYear: '2026-2027', status: 'active' },
  ]);
  vi.mocked(openAssessment).mockResolvedValue([
    { studentId: 'student-1', fullName: 'Ana Ruiz', code: 'ABCD2345' },
  ]);
});

describe('AccessManagementScreen', () => {
  it('exige confirmación, abre la evaluación y muestra los códigos una sola vez', async () => {
    render(<AccessManagementScreen />);
    const user = userEvent.setup();

    await screen.findByRole('heading', { name: 'Distribuir accesos' });
    await user.selectOptions(screen.getByLabelText('Paralelo'), 'group-1');
    expect(
      screen.getByRole('button', { name: 'Abrir evaluación y generar códigos' }),
    ).toBeDisabled();
    await user.click(screen.getByLabelText(/Confirmo que la lectura y las preguntas están listas/));
    await user.click(screen.getByRole('button', { name: 'Abrir evaluación y generar códigos' }));

    expect(await screen.findByText('ABCD2345')).toBeInTheDocument();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByText(/guarda o imprime esta lista ahora/i)).toBeInTheDocument();
  });
});
