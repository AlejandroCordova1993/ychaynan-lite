import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, it, expect, vi } from 'vitest';
import { GroupManagementPanel } from './GroupManagementPanel';
import { manageGroup } from '../../lib/api/groupLifecycle';
vi.mock('../../lib/api/groupLifecycle');
vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
const group = { id: 'g1', name: '1A', schoolYear: '2026', status: 'active' as const };
beforeEach(() => {
  vi.mocked(manageGroup).mockReset();
});
it('no elimina hasta confirmar y cancelar conserva el curso', async () => {
  const user = userEvent.setup();
  const changed = vi.fn();
  render(<GroupManagementPanel groups={[group]} onChanged={changed} />);
  await user.click(screen.getByRole('button', { name: 'Eliminar 1A' }));
  expect(manageGroup).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(changed).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Eliminar 1A' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar eliminar' }));
  expect(manageGroup).toHaveBeenCalledWith({}, 'g1', 'delete');
  expect(changed).toHaveBeenCalledWith('g1', 'delete');
});
it('muestra el rechazo del servidor y conserva el curso', async () => {
  vi.mocked(manageGroup).mockRejectedValue(new Error('Este curso tiene accesos. Archívalo.'));
  const user = userEvent.setup();
  const changed = vi.fn();
  render(<GroupManagementPanel groups={[group]} onChanged={changed} />);
  await user.click(screen.getByRole('button', { name: 'Eliminar 1A' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar eliminar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Archívalo');
  expect(changed).not.toHaveBeenCalled();
});
it.each(['active', 'archived'] as const)(
  'permite cambiar el estado %s con confirmación',
  async (status) => {
    const user = userEvent.setup();
    const changed = vi.fn();
    render(<GroupManagementPanel groups={[{ ...group, status }]} onChanged={changed} />);
    const label = status === 'active' ? 'Archivar' : 'Restaurar';
    await user.click(screen.getByRole('button', { name: label + ' 1A' }));
    expect(manageGroup).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar ' + label.toLowerCase() }));
    expect(changed).toHaveBeenCalledWith('g1', status === 'active' ? 'archive' : 'restore');
  },
);
