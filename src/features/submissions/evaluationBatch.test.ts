import { expect, it, vi } from 'vitest';
import { eligibleBatchJobs, runEvaluationBatch, type BatchJob } from './evaluationBatch';
import type { SubmissionOverviewRow } from '../../lib/api/submissions';

function row(
  id: string,
  evaluationStatus: SubmissionOverviewRow['evaluationStatus'],
): SubmissionOverviewRow {
  return {
    accessId: id,
    studentId: id,
    studentName: id,
    submissionId: id,
    status: 'entregado',
    startedAt: null,
    submittedAt: null,
    groupId: 'g1',
    groupName: '1A',
    schoolYear: '2026',
    evaluationStatus,
  };
}
const jobs = (count: number) =>
  eligibleBatchJobs(Array.from({ length: count }, (_, index) => row(String(index), null)));

it('selecciona solo entregas pendientes o fallidas y evita duplicados', () => {
  const rows = [
    row('1', null),
    row('2', 'failed'),
    row('3', 'completed'),
    row('4', 'reviewed'),
    row('5', 'discarded'),
    row('6', 'running'),
    row('7', 'pending'),
    { ...row('8', null), status: 'iniciado' as const },
    row('1', null),
  ];
  expect(eligibleBatchJobs(rows)).toEqual([
    expect.objectContaining({ submissionId: '1', forceRetry: false }),
    expect.objectContaining({ submissionId: '2', forceRetry: true }),
  ]);
});
it('mantiene como máximo tres llamadas y separa cada entrega', async () => {
  let active = 0;
  let maximum = 0;
  const request = vi.fn(async () => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 0));
    active--;
  });
  const updates: BatchJob[] = [];
  await runEvaluationBatch(jobs(7), request, { stopped: false }, (job) => updates.push(job));
  expect(maximum).toBe(3);
  expect(request.mock.calls).toHaveLength(7);
  expect(updates.filter((job) => job.status === 'completed')).toHaveLength(7);
  expect(request).toHaveBeenCalledWith('0', false);
});
it('un fallo no impide evaluar las demás entregas', async () => {
  const request = vi.fn(async (id: string) => {
    if (id === '1') throw new Error('fallo');
  });
  const updates: BatchJob[] = [];
  await runEvaluationBatch(jobs(5), request, { stopped: false }, (job) => updates.push(job));
  expect(updates.filter((job) => job.status === 'failed')).toHaveLength(1);
  expect(updates.filter((job) => job.status === 'completed')).toHaveLength(4);
});
it('detener no inicia trabajos nuevos', async () => {
  const control = { stopped: false };
  const request = vi.fn().mockResolvedValue(undefined);
  await runEvaluationBatch(jobs(5), request, control, (job) => {
    if (job.status === 'running') control.stopped = true;
  });
  expect(request).toHaveBeenCalledTimes(1);
});
it('marca una solicitud concurrente como en curso, sin reintentar', async () => {
  const updates: BatchJob[] = [];
  const request = vi.fn().mockRejectedValue({ code: 'evaluation_in_progress' });
  await runEvaluationBatch(jobs(1), request, { stopped: false }, (job) => updates.push(job));
  expect(updates[updates.length - 1]?.status).toBe('skipped');
  expect(request).toHaveBeenCalledTimes(1);
});
it('detiene la cola si la sesión ya no es válida', async () => {
  const control = { stopped: false };
  const request = vi.fn().mockRejectedValue({ code: 'invalid_session' });
  await runEvaluationBatch(jobs(8), request, control, () => {});
  expect(control.stopped).toBe(true);
  expect(request).toHaveBeenCalledTimes(3);
});
