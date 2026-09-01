import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { getAccessOverview } from './assessmentAccess';

describe('getAccessOverview', () => {
  it('carga el resumen abierto sin solicitar hashes ni códigos', async () => {
    const assessmentQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'assessment-1', title: 'Diagnóstico inicial' },
        error: null,
      }),
    };
    assessmentQuery.select.mockReturnValue(assessmentQuery);
    assessmentQuery.eq.mockReturnValue(assessmentQuery);
    assessmentQuery.order.mockReturnValue(assessmentQuery);
    assessmentQuery.limit.mockReturnValue(assessmentQuery);

    const accessQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'access-1',
            student_id: 'student-1',
            state: 'blocked',
            failed_attempts: 5,
            cooldown_until: '2026-09-01T12:00:00.000Z',
            students: { full_name_original: 'Ana Ruiz' },
          },
        ],
        error: null,
      }),
    };
    accessQuery.select.mockReturnValue(accessQuery);
    accessQuery.eq.mockReturnValue(accessQuery);

    const fake = {
      from: vi.fn((table: string) => (table === 'assessments' ? assessmentQuery : accessQuery)),
    } as unknown as SupabaseClient;

    await expect(getAccessOverview(fake)).resolves.toEqual({
      assessmentId: 'assessment-1',
      title: 'Diagnóstico inicial',
      accesses: [
        {
          id: 'access-1',
          studentId: 'student-1',
          fullName: 'Ana Ruiz',
          state: 'blocked',
          failedAttempts: 5,
          cooldownUntil: '2026-09-01T12:00:00.000Z',
        },
      ],
    });
    expect(accessQuery.select).toHaveBeenCalledWith(
      'id, student_id, state, failed_attempts, cooldown_until, students!inner(full_name_original)',
    );
  });
});
