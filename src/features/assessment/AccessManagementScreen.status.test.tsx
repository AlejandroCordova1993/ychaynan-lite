import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessOverview, regenerateAccess, unblockAccess } from '../../lib/api/assessmentAccess';
import { getDraftAssessment } from '../../lib/api/assessments';
import { listGroups } from '../../lib/api/groups';
import { AccessManagementScreen } from './AccessManagementScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/assessments');
vi.mock('../../lib/api/assessmentAccess');
vi.mock('../../lib/api/groups');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDraftAssessment).mockResolvedValue(null);
  vi.mocked(listGroups).mockResolvedValue([]);
  vi.mocked(getAccessOverview).mockResolvedValue({
    assessmentId: 'assessment-1',
    title: 'Diagnóstico inicial',
    accesses: [
      {
        id: 'access-1',
        studentId: 'student-1',
        fullName: 'Ana Ruiz',
        state: 'blocked',
        failedAttempts: 5,
        cooldownUntil: null,
      },
    ],
  });
  vi.mocked(regenerateAccess).mockResolvedValue('WXYZ6789');
  vi.mocked(unblockAccess).mockResolvedValue(undefined);
});

describe('AccessManagementScreen status', () => {
  it('muestra estados al recargar sin volver a revelar códigos', async () => {
    render(<AccessManagementScreen />);
    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
    expect(screen.queryByText('ABCD2345')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerar código para Ana Ruiz' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Desbloquear acceso de Ana Ruiz' })).toBeEnabled();
  });

  it('revela solamente el código recién regenerado y permite desbloquear', async () => {
    const user = userEvent.setup();
    render(<AccessManagementScreen />);
    await screen.findByText('Ana Ruiz');
    await user.click(screen.getByRole('button', { name: 'Desbloquear acceso de Ana Ruiz' }));
    expect(unblockAccess).toHaveBeenCalledWith(expect.anything(), 'access-1');
    await user.click(screen.getByRole('button', { name: 'Regenerar código para Ana Ruiz' }));
    expect(await screen.findByText('WXYZ6789')).toBeInTheDocument();
    expect(screen.getByText(/este código nuevo se muestra una sola vez/i)).toBeInTheDocument();
  });
});
