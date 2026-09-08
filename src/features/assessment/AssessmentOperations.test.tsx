import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { AssessmentOperations } from './AssessmentOperations';
import { closeAssessment, updateAssessmentSchedule } from '../../lib/api/assessments';
import { extendAssessment } from '../../lib/api/assessmentAccess';
vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/assessments');
vi.mock('../../lib/api/assessmentAccess');
afterEach(() => vi.restoreAllMocks());
const overview = {
  assessmentId: 'a',
  slug: 'test',
  title: 'Test',
  opensAt: null,
  closesAt: null,
  legacyCount: 0,
  accesses: [],
};
it('guarda el horario sin cambiar contenido ni identificador', async () => {
  vi.mocked(updateAssessmentSchedule).mockResolvedValue(undefined);
  const changed = vi.fn();
  render(<AssessmentOperations overview={overview} groups={[]} onChanged={changed} />);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));
  expect(await screen.findByText('Horario guardado.')).toBeInTheDocument();
  expect(updateAssessmentSchedule).toHaveBeenCalledWith({}, 'a', null, null);
  expect(changed).toHaveBeenCalledWith(overview);
});
it('cancelar el cierre conserva la evaluación, confirmar la cierra', async () => {
  vi.mocked(closeAssessment).mockClear().mockResolvedValue(undefined);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false),
    changed = vi.fn();
  render(<AssessmentOperations overview={overview} groups={[]} onChanged={changed} />);
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar evaluación' }));
  expect(closeAssessment).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar evaluación' }));
  expect(closeAssessment).toHaveBeenCalledWith({}, 'a');
  expect(changed).toHaveBeenCalledWith(null);
});
it('incorpora el paralelo seleccionado sin regenerar los accesos existentes', async () => {
  vi.mocked(extendAssessment).mockResolvedValue(overview);
  render(
    <AssessmentOperations
      overview={overview}
      groups={[{ id: 'g', name: 'A', schoolYear: '2026', status: 'active' }]}
      onChanged={vi.fn()}
    />,
  );
  await userEvent.selectOptions(screen.getByLabelText('Paralelo para incorporar'), 'g');
  await userEvent.click(screen.getByRole('button', { name: 'Generar accesos faltantes' }));
  expect(
    await screen.findByText('Todos los estudiantes de este paralelo ya tenían acceso.'),
  ).toBeInTheDocument();
  expect(extendAssessment).toHaveBeenCalledWith({}, 'a', 'g');
});
