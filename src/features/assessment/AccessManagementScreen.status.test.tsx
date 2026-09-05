import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAccessOverview,
  regenerateAccess,
  rotateLegacyAccessCodes,
  unblockAccess,
  type AccessOverview,
} from '../../lib/api/assessmentAccess';
import { getDraftAssessment } from '../../lib/api/assessments';
import { listGroups } from '../../lib/api/groups';
import { AccessManagementScreen } from './AccessManagementScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/assessments');
vi.mock('../../lib/api/assessmentAccess');
vi.mock('../../lib/api/groups');

const overview: AccessOverview = {
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
    {
      id: 'access-2',
      studentId: 'student-2',
      fullName: 'Luis Peña',
      groupName: '3ro BGU A',
      state: 'submitted',
      submissionStatus: 'submitted',
      failedAttempts: 0,
      cooldownUntil: null,
      code: null,
      codeStatus: 'hidden',
    },
  ],
};

const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:descarga');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });
  Object.defineProperty(window, 'print', { value: vi.fn(), writable: true });
  vi.mocked(getDraftAssessment).mockResolvedValue(null);
  vi.mocked(listGroups).mockResolvedValue([]);
  vi.mocked(getAccessOverview).mockResolvedValue(overview);
  vi.mocked(regenerateAccess).mockResolvedValue('WXYZ6789');
  vi.mocked(unblockAccess).mockResolvedValue(undefined);
  vi.mocked(rotateLegacyAccessCodes).mockResolvedValue({
    rotated: 0,
    revokedSessions: 0,
    list: overview,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AccessManagementScreen · códigos recuperables', () => {
  it('muestra al recargar el código vigente, el paralelo y el estado de entrega', async () => {
    render(<AccessManagementScreen />);

    const fila = within(await screen.findByRole('row', { name: /Ana Ruiz/ }));
    expect(fila.getByText('ABCD2345')).toBeInTheDocument();
    expect(fila.getByText('3ro BGU A')).toBeInTheDocument();
    expect(fila.getByText('Sin usar')).toBeInTheDocument();
    expect(fila.getByText('Sin iniciar')).toBeInTheDocument();
  });

  it('oculta el código de una entrega ya enviada', async () => {
    render(<AccessManagementScreen />);

    const fila = within(await screen.findByRole('row', { name: /Luis Peña/ }));
    expect(fila.getByText('Entregado')).toBeInTheDocument();
    expect(
      fila.queryByRole('button', { name: 'Copiar código de Luis Peña' }),
    ).not.toBeInTheDocument();
  });

  it('copia el enlace estudiantil de la evaluación', async () => {
    const user = userEvent.setup();
    render(<AccessManagementScreen />);
    await screen.findByText('ABCD2345');

    await user.click(screen.getByRole('button', { name: 'Copiar enlace' }));

    await expect(window.navigator.clipboard.readText()).resolves.toBe(
      `${window.location.origin}/#/evaluacion/diagnostico-2026`,
    );
  });

  it('copia un código individual', async () => {
    const user = userEvent.setup();
    render(<AccessManagementScreen />);
    await screen.findByText('ABCD2345');

    await user.click(screen.getByRole('button', { name: 'Copiar código de Ana Ruiz' }));

    await expect(window.navigator.clipboard.readText()).resolves.toBe('ABCD2345');
  });

  it('descarga la lista completa como CSV protegido para Excel', async () => {
    const user = userEvent.setup();
    // jsdom no implementa descargas: se captura el enlace en lugar de navegar.
    const descargas: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      descargas.push(this);
    });
    render(<AccessManagementScreen />);
    await screen.findByText('ABCD2345');

    await user.click(screen.getByRole('button', { name: 'Descargar CSV' }));

    expect(descargas).toHaveLength(1);
    expect(descargas[0].download).toBe('diagnostico-2026-codigos.csv');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    // Excel necesita el BOM UTF-8 al inicio del archivo real.
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const csv = await blob.text();
    expect(csv.split('\r\n')[0]).toBe(
      'Nombre completo,Paralelo,Código,Estado,Enlace de evaluación',
    );
    expect(csv).toContain('Ana Ruiz,3ro BGU A,ABCD2345,Sin usar,');
    expect(csv).toContain('Luis Peña,3ro BGU A,,Entregado,');
  });

  it('permite imprimir la lista', async () => {
    const user = userEvent.setup();
    render(<AccessManagementScreen />);
    await screen.findByText('ABCD2345');

    await user.click(screen.getByRole('button', { name: 'Imprimir' }));

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('reemplaza el código anterior en la tabla al regenerarlo', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<AccessManagementScreen />);
    await screen.findByText('ABCD2345');

    await user.click(screen.getByRole('button', { name: 'Regenerar código para Ana Ruiz' }));

    expect(await screen.findByText('WXYZ6789')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Ana Ruiz'));
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('se cerrarán sus sesiones activas'),
    );
    expect(regenerateAccess).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('ABCD2345')).not.toBeInTheDocument();
  });

  it('conserva el código si el docente cancela la regeneración', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<AccessManagementScreen />);
    await screen.findByText('ABCD2345');
    await user.click(screen.getByRole('button', { name: 'Regenerar código para Ana Ruiz' }));
    expect(regenerateAccess).not.toHaveBeenCalled();
    expect(screen.getByText('ABCD2345')).toBeInTheDocument();
  });
});

describe('AccessManagementScreen · códigos heredados', () => {
  const legacyOverview: AccessOverview = {
    ...overview,
    legacyCount: 2,
    accesses: [
      { ...overview.accesses[0], code: null, codeStatus: 'legacy' },
      {
        ...overview.accesses[0],
        id: 'access-3',
        studentId: 'student-3',
        fullName: 'Sara Vega',
        state: 'active',
        submissionStatus: 'in_progress',
        code: null,
        codeStatus: 'legacy',
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(getAccessOverview).mockResolvedValue(legacyOverview);
    vi.mocked(rotateLegacyAccessCodes).mockResolvedValue({
      rotated: 2,
      revokedSessions: 1,
      list: overview,
    });
  });

  it('avisa del formato anterior y exige confirmación explícita', async () => {
    const user = userEvent.setup();
    render(<AccessManagementScreen />);
    await screen.findByText('Sara Vega');

    expect(screen.getByText(/no pueden recuperarse/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Regenerar lista completa' }));

    expect(
      screen.getByText(/Se regenerarán 2 códigos y se cerrarán 1 sesión activa/),
    ).toBeInTheDocument();
    expect(rotateLegacyAccessCodes).not.toHaveBeenCalled();
  });

  it('convierte la lista solo después de confirmar', async () => {
    const user = userEvent.setup();
    render(<AccessManagementScreen />);
    await screen.findByText('Sara Vega');

    await user.click(screen.getByRole('button', { name: 'Regenerar lista completa' }));
    await user.click(screen.getByRole('button', { name: 'Sí, regenerar los 2 códigos' }));

    expect(rotateLegacyAccessCodes).toHaveBeenCalledWith(expect.anything(), 'assessment-1');
    expect(await screen.findByText('ABCD2345')).toBeInTheDocument();
    expect(screen.queryByText(/no pueden recuperarse/i)).not.toBeInTheDocument();
  });
});
