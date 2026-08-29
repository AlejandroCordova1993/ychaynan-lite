import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportRosterPanel } from './ImportRosterPanel';

describe('ImportRosterPanel', () => {
  it('muestra una vista previa tras subir un CSV y confirma solo las filas importables', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    render(<ImportRosterPanel onConfirm={onConfirm} />);

    const csv = 'nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n,Sin Nombre\n';
    const file = new File([csv], 'nomina.csv', { type: 'text/csv' });

    await userEvent.upload(screen.getByLabelText('Archivo CSV de la nómina'), file);

    expect(await screen.findByText(/Válidas: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Duplicadas: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Inválidas: 1/)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /Confirmar importación de 2 estudiantes/ }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
