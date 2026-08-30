import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportRosterPanel } from './ImportRosterPanel';

describe('ImportRosterPanel', () => {
  it('muestra una vista previa, detalla los problemas y confirma solo filas válidas', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    render(<ImportRosterPanel onConfirm={onConfirm} />);

    const csv = 'nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n,Sin Nombre\n';
    const file = new File([csv], 'nomina.csv', { type: 'text/csv' });

    await userEvent.upload(screen.getByLabelText('Archivo CSV de la nómina'), file);

    expect(await screen.findByText(/Válidas: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Duplicadas: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Inválidas: 1/)).toBeInTheDocument();
    expect(
      screen.getByText(/Coincide con la fila 2; revisa si es un duplicado accidental/),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('permite importar un homónimo real marcando explícitamente la fila duplicada', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    render(<ImportRosterPanel onConfirm={onConfirm} />);

    const csv = 'nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n';
    const file = new File([csv], 'nomina.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('Archivo CSV de la nómina'), file);

    // Por defecto la fila duplicada queda fuera: el caso frecuente es un pegado
    // accidental, no dos personas distintas con el mismo nombre completo.
    expect(await screen.findByText(/Se omitirá 1 fila duplicada/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: /Importar de todos modos la fila 3: Ana Ruiz/,
      }),
    );

    expect(screen.queryByText(/Se omitirá/)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /Confirmar importación de 2 estudiantes/ }),
    );

    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ rowNumber: 2, status: 'valid' }),
      expect.objectContaining({ rowNumber: 3, status: 'duplicate' }),
    ]);
  });

  it('descarta las aprobaciones de duplicados al cambiar la codificación', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    render(<ImportRosterPanel onConfirm={onConfirm} />);

    const csv = 'nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n';
    const file = new File([csv], 'nomina.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('Archivo CSV de la nómina'), file);

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: /Importar de todos modos la fila 3: Ana Ruiz/,
      }),
    );
    expect(
      screen.getByRole('button', { name: /Confirmar importación de 2 estudiantes/ }),
    ).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Codificación'), 'windows-1252');

    expect(
      await screen.findByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
    ).toBeInTheDocument();
  });

  it('permite cambiar la codificación y recuperar el nombre original', async () => {
    render(<ImportRosterPanel onConfirm={vi.fn(() => Promise.resolve())} />);

    const csv = 'nombres,apellidos\nMaría,Peña\n';
    const file = new File([new TextEncoder().encode(csv)], 'nomina.csv', {
      type: 'text/csv',
    });

    await userEvent.upload(screen.getByLabelText('Archivo CSV de la nómina'), file);
    expect(await screen.findByText('María Peña')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Codificación'), 'windows-1252');
    expect(await screen.findByText('MarÃ­a PeÃ±a')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Codificación'), 'utf-8');
    expect(await screen.findByText('María Peña')).toBeInTheDocument();
  });
});
