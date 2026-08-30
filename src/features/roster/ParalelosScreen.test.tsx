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
    // Sin esto el historial de llamadas se acumula entre pruebas del archivo y
    // una aserción "no se llamó" pasaría o fallaría según el orden de ejecución.
    vi.clearAllMocks();
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

  it('conserva la vista previa si se confirma sin haber seleccionado un paralelo', async () => {
    render(<ParalelosScreen />);

    const file = new File(['nombres,apellidos\nAna,Ruiz\n'], 'nomina.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('Archivo CSV de la nómina'), file);

    await userEvent.click(
      await screen.findByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    );

    expect(
      await screen.findByText('Selecciona un paralelo antes de importar.'),
    ).toBeInTheDocument();
    expect(studentsApi.bulkImportStudents).not.toHaveBeenCalled();
    // La vista previa debe seguir ahí: obligar a volver a subir el archivo por
    // haber olvidado seleccionar el paralelo sería una pérdida de trabajo.
    expect(
      screen.getByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    ).toBeInTheDocument();
  });

  it('muestra un mensaje de error genérico si falla la creación del paralelo, sin filtrar detalles técnicos', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(groupsApi.createGroup).mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint "groups_school_year_name_key"'),
    );

    render(<ParalelosScreen />);

    await userEvent.type(screen.getByLabelText('Nombre del paralelo'), '3ro BGU A');
    await userEvent.type(screen.getByLabelText('Año lectivo'), '2026-2027');
    await userEvent.click(screen.getByRole('button', { name: 'Crear paralelo' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ocurrió un problema');
    expect(alert.textContent).not.toContain('constraint');
    consoleErrorSpy.mockRestore();
  });

  it('limpia el mensaje de éxito anterior si una importación posterior falla', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ParalelosScreen />);

    await user.type(screen.getByLabelText('Nombre del paralelo'), '3ro BGU A');
    await user.type(screen.getByLabelText('Año lectivo'), '2026-2027');
    await user.click(screen.getByRole('button', { name: 'Crear paralelo' }));

    const input = screen.getByLabelText('Archivo CSV de la nómina');
    const file = new File(['nombres,apellidos\nAna,Ruiz\n'], 'nomina.csv', {
      type: 'text/csv',
    });
    await user.upload(input, file);
    await user.click(
      await screen.findByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    );
    expect(await screen.findByText('Se importaron 1 estudiantes.')).toBeInTheDocument();

    vi.mocked(studentsApi.bulkImportStudents).mockRejectedValueOnce(new Error('fallo técnico'));
    await user.upload(
      input,
      new File(['nombres,apellidos\nLuis,Pérez\n'], 'nomina-2.csv', { type: 'text/csv' }),
    );
    await user.click(
      await screen.findByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un problema');
    expect(screen.queryByText('Se importaron 1 estudiantes.')).not.toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });
});
