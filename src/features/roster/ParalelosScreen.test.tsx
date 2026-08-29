import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParalelosScreen } from './ParalelosScreen';
import * as groupsApi from '../../lib/api/groups';
import * as studentsApi from '../../lib/api/students';

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => ({}),
}));
vi.mock('../../lib/api/groups');
vi.mock('../../lib/api/students');

describe('ParalelosScreen', () => {
  beforeEach(() => {
    vi.mocked(groupsApi.listGroups).mockResolvedValue([]);
    vi.mocked(groupsApi.createGroup).mockResolvedValue({
      id: 'group-1',
      name: '3ro BGU A',
      schoolYear: '2026-2027',
      status: 'active',
    });
    vi.mocked(studentsApi.bulkImportStudents).mockResolvedValue({ inserted: 1 });
  });

  it('crea un paralelo, lo selecciona, importa una nómina y reporta cuántos estudiantes se insertaron', async () => {
    render(<ParalelosScreen />);

    await userEvent.type(screen.getByLabelText('Nombre del paralelo'), '3ro BGU A');
    await userEvent.type(screen.getByLabelText('Año lectivo'), '2026-2027');
    await userEvent.click(screen.getByRole('button', { name: 'Crear paralelo' }));

    expect(
      await screen.findByRole('option', { name: '3ro BGU A (2026-2027)' }),
    ).toBeInTheDocument();

    const csv = 'nombres,apellidos\nAna,Ruiz\n';
    const file = new File([csv], 'nomina.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('Archivo CSV de la nómina'), file);

    await userEvent.click(
      await screen.findByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    );

    expect(await screen.findByText('Se importaron 1 estudiantes.')).toBeInTheDocument();
    expect(studentsApi.bulkImportStudents).toHaveBeenCalledWith({}, [
      {
        groupId: 'group-1',
        fullNameOriginal: 'Ana Ruiz',
        fullNameNormalized: 'ana ruiz',
        authorizedVariant: null,
      },
    ]);
  });
});
