import type { SubmissionOverviewRow } from '../../lib/api/submissions';

export type BatchJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
export interface BatchJob {
  submissionId: string;
  studentName: string;
  forceRetry: boolean;
  status: BatchJobStatus;
  error?: string;
}

export function eligibleBatchJobs(rows: SubmissionOverviewRow[]): BatchJob[] {
  const ids = new Set<string>();
  return rows.flatMap((row) => {
    if (
      row.status !== 'entregado' ||
      !row.submissionId ||
      ids.has(row.submissionId) ||
      (row.evaluationStatus !== null && row.evaluationStatus !== 'failed')
    )
      return [];
    ids.add(row.submissionId);
    return [
      {
        submissionId: row.submissionId,
        studentName: row.studentName,
        forceRetry: row.evaluationStatus === 'failed',
        status: 'queued' as const,
      },
    ];
  });
}

/** Cada trabajo invoca el endpoint individual, sin compartir respuestas ni contexto. */
export async function runEvaluationBatch(
  jobs: BatchJob[],
  request: (submissionId: string, forceRetry: boolean) => Promise<unknown>,
  control: { stopped: boolean },
  onChange: (job: BatchJob) => void,
) {
  let index = 0;
  async function worker() {
    while (!control.stopped && index < jobs.length) {
      const job = jobs[index++];
      onChange({ ...job, status: 'running' });
      try {
        await request(job.submissionId, job.forceRetry);
        onChange({ ...job, status: 'completed' });
      } catch (error) {
        const code = (error as { code?: string } | null)?.code;
        if (code === 'invalid_session' || code === 'forbidden') control.stopped = true;
        onChange({
          ...job,
          status: code === 'evaluation_in_progress' ? 'skipped' : 'failed',
          error:
            code === 'evaluation_in_progress'
              ? 'Ya se está evaluando desde otra solicitud.'
              : 'No se confirmó el resultado. Actualiza y reintenta los pendientes.',
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, () => worker()));
}
