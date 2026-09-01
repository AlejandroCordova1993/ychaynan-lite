import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportRosterPanel } from './ImportRosterPanel';
import { MAX_ROSTER_FILE_BYTES } from './parseRoster';

describe('ImportRosterPanel', () => {
  const fileLabel = 'Archivo CSV o Excel de la nómina';

  async function xlsxFile(): Promise<File> {
    const bytes = await readFile(
      resolve('src/features/roster/fixtures/nomina-nombre-completo.xlsx'),
    );
    return new File([new Uint8Array(bytes)], 'nomina.xlsx');
  }

  it('muestra una vista previa, detalla los problemas y confirma solo filas válidas', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    render(<ImportRosterPanel onConfirm={onConfirm} />);

    const csv = 'nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n,Sin Nombre\n';
    const file = new File([csv], 'nomina.csv', { type: 'text/csv' });

    await userEvent.upload(screen.getByLabelText(fileLabel), file);

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
    await userEvent.upload(screen.getByLabelText(fileLabel), file);

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
    await userEvent.upload(screen.getByLabelText(fileLabel), file);

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

    await userEvent.upload(screen.getByLabelText(fileLabel), file);
    expect(await screen.findByText('María Peña')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Codificación'), 'windows-1252');
    expect(await screen.findByText('MarÃ­a PeÃ±a')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Codificación'), 'utf-8');
    expect(await screen.findByText('María Peña')).toBeInTheDocument();
  });

  it('bloquea la confirmación mientras la importación está en curso', async () => {
    let finish: (() => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<ImportRosterPanel onConfirm={onConfirm} />);

    await userEvent.upload(
      screen.getByLabelText(fileLabel),
      new File(['nombres,apellidos\nAna,Ruiz\n'], 'nomina.csv', { type: 'text/csv' }),
    );
    const button = await screen.findByRole('button', {
      name: /Confirmar importación de 1 estudiantes/,
    });

    await userEvent.click(button);
    expect(button).toBeDisabled();

    finish?.();
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Confirmar importación de 1 estudiantes/ }),
      ).not.toBeInTheDocument(),
    );
  });

  it('conserva la vista previa del último archivo seleccionado si una lectura anterior termina después', async () => {
    render(<ImportRosterPanel onConfirm={vi.fn(() => Promise.resolve())} />);
    const input = screen.getByLabelText(fileLabel);
    const first = new File(['pendiente'], 'primero.csv', { type: 'text/csv' });
    let resolveFirst: ((buffer: ArrayBuffer) => void) | undefined;
    vi.spyOn(first, 'arrayBuffer').mockReturnValue(
      new Promise<ArrayBuffer>((resolve) => {
        resolveFirst = resolve;
      }),
    );

    await userEvent.upload(input, first);
    expect(screen.getByRole('status')).toHaveTextContent(/leyendo la nómina/i);
    expect(screen.getByRole('region', { name: 'Importar nómina' })).toHaveAttribute(
      'aria-busy',
      'true',
    );

    await userEvent.upload(
      input,
      new File(['nombres,apellidos\nLuis,Pérez\n'], 'segundo.csv', { type: 'text/csv' }),
    );
    expect(await screen.findByText('Luis Pérez')).toBeInTheDocument();

    const staleBytes = new TextEncoder().encode('nombres,apellidos\nAna,Ruiz\n');
    resolveFirst?.(staleBytes.buffer as ArrayBuffer);
    await waitFor(() => expect(screen.queryByText('Ana Ruiz')).not.toBeInTheDocument());
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  });

  it('rechaza un archivo demasiado grande antes de leerlo en memoria', async () => {
    render(<ImportRosterPanel onConfirm={vi.fn(() => Promise.resolve())} />);
    const file = new File(['x'], 'enorme.xlsx');
    Object.defineProperty(file, 'size', { value: MAX_ROSTER_FILE_BYTES + 1 });
    const read = vi.spyOn(file, 'arrayBuffer');

    await userEvent.upload(screen.getByLabelText(fileLabel), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(/supera el máximo/i);
    expect(read).not.toHaveBeenCalled();
  });

  it('acepta XLSX, muestra su vista previa y oculta el selector de codificación', async () => {
    render(<ImportRosterPanel onConfirm={vi.fn(() => Promise.resolve())} />);
    const input = screen.getByLabelText(fileLabel);
    expect(input).toHaveAttribute('accept', '.csv,.xlsx');
    await userEvent.upload(input, await xlsxFile());
    expect(await screen.findByText('Ana Sofía Ruiz Pérez')).toBeInTheDocument();
    expect(screen.queryByLabelText('Codificación')).not.toBeInTheDocument();
    expect(screen.getByText('Formato: Excel')).toBeInTheDocument();
  });
});
