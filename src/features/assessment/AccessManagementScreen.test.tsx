import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDraftAssessment } from '../../lib/api/assessments';
import { getAccessOverview, openAssessment } from '../../lib/api/assessmentAccess';
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
  vi.mocked(getAccessOverview).mockResolvedValue(null);
  vi.mocked(openAssessment).mockResolvedValue({
    assessmentId: 'assessment-1',
    slug: 'diagnostico-2026',
    title: 'Diagnóstico inicial',
    legacyCount: 0,
    accesses: [
      {
        id: 'access-1',
        studentId: 'student-1',
        fullName: 'Ana Ruiz',
        groupName: '3ro BGU A',
        state: 'unused',
        submissionStatus: 'none',
        failedAttempts: 0,
        cooldownUntil: null,
        code: 'ABCD2345',
        codeStatus: 'available',
      },
    ],
  });
});

describe('AccessManagementScreen', () => {
  it('exige confirmación y entrega la lista consultable tras abrir la evaluación', async () => {
    render(<AccessManagementScreen />);
    const user = userEvent.setup();

    // El encabezado se renderiza antes que el fetch de paralelos; usarlo como
    // señal de "ya cargó" es una carrera con el estado `loading` (ver
    // ImportRosterPanel/App para el otro origen de la intermitencia). El
    // selector de paralelo sí está condicionado a que el fetch termine, así
    // que es a él a quien hay que esperarle con find, no con get.
    await screen.findByRole('heading', { name: 'Distribuir accesos' });
    await user.selectOptions(await screen.findByLabelText('Paralelo'), 'group-1');
    expect(
      screen.getByRole('button', { name: 'Abrir evaluación y generar códigos' }),
    ).toBeDisabled();
    await user.click(screen.getByLabelText(/Confirmo que la lectura y las preguntas están listas/));
    await user.click(screen.getByRole('button', { name: 'Abrir evaluación y generar códigos' }));

    expect(await screen.findByText('ABCD2345')).toBeInTheDocument();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar CSV' })).toBeInTheDocument();
  });
});
