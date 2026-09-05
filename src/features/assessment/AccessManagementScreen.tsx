import { useEffect, useMemo, useState } from 'react';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  getAccessOverview,
  openAssessment,
  regenerateAccess,
  rotateLegacyAccessCodes,
  unblockAccess,
  type AccessOverview,
  type AccessOverviewItem,
} from '../../lib/api/assessmentAccess';
import { getDraftAssessment } from '../../lib/api/assessments';
import { listGroups } from '../../lib/api/groups';
import { getSupabaseClient } from '../../lib/supabase/client';
import type { Group } from '../../lib/validation/schemas';
import { AccessCodesTable } from './AccessCodesTable';
import { accessCodesFileName, buildAccessCodesCsv } from './accessCodesCsv';
import type { AssessmentDraftInput } from './assessmentSchemas';
import { pluralize, STATE_LABELS } from './accessLabels';
import { LegacyCodesConversion } from './LegacyCodesConversion';
import { OpenAssessmentForm } from './OpenAssessmentForm';
import { currentStudentAssessmentLink } from './studentAssessmentLink';

export function AccessManagementScreen() {
  const client = getSupabaseClient();
  const [assessment, setAssessment] = useState<AssessmentDraftInput | null>(null);
  const [overview, setOverview] = useState<AccessOverview | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [confirmingRotation, setConfirmingRotation] = useState(false);
  const [rotationSummary, setRotationSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busyAccessId, setBusyAccessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getDraftAssessment(client), listGroups(client), getAccessOverview(client)])
      .then(([draft, availableGroups, currentOverview]) => {
        setAssessment(draft);
        setGroups(availableGroups.filter(({ status }) => status === 'active'));
        setOverview(currentOverview);
      })
      .catch((loadError: unknown) => {
        console.error(loadError);
        setError(true);
      })
      .finally(() => setLoading(false));
    // El cliente es un singleton estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const studentLink = useMemo(
    () => (overview ? currentStudentAssessmentLink(overview.slug) : ''),
    [overview],
  );
  const legacyAccesses = useMemo(
    () => overview?.accesses.filter(({ codeStatus }) => codeStatus === 'legacy') ?? [],
    [overview],
  );

  const copyValue = async (value: string, feedback: string) => {
    setError(false);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(feedback);
    } catch (copyError) {
      console.error(copyError);
      setError(true);
    }
  };

  const handleOpen = async () => {
    if (!assessment?.id || !groupId || !confirmed) return;
    setError(false);
    setOpening(true);
    try {
      setOverview(await openAssessment(client, assessment.id, groupId));
    } catch (openError) {
      console.error(openError);
      setError(true);
    } finally {
      setOpening(false);
    }
  };

  const handleDownload = () => {
    if (!overview) return;
    setError(false);
    const csv = buildAccessCodesCsv(
      overview.accesses.map((access) => ({
        fullName: access.fullName,
        groupName: access.groupName,
        code: access.code ?? '',
        state: STATE_LABELS[access.state],
        link: studentLink,
      })),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = accessCodesFileName(overview.slug);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = async (accessId: string) => {
    setError(false);
    setBusyAccessId(accessId);
    try {
      const code = await regenerateAccess(client, accessId);
      setOverview((current) => (current ? replaceCode(current, accessId, code) : current));
    } catch (regenerateError) {
      console.error(regenerateError);
      setError(true);
    } finally {
      setBusyAccessId(null);
    }
  };

  const handleRotateLegacy = async () => {
    if (!overview) return;
    setError(false);
    setRotating(true);
    try {
      const result = await rotateLegacyAccessCodes(client, overview.assessmentId);
      setOverview(result.list);
      setConfirmingRotation(false);
      setRotationSummary(
        `Se regeneraron ${pluralize(result.rotated, 'código', 'códigos')} y se cerraron ${pluralize(
          result.revokedSessions,
          'sesión activa',
          'sesiones activas',
        )}.`,
      );
    } catch (rotateError) {
      console.error(rotateError);
      setError(true);
    } finally {
      setRotating(false);
    }
  };

  const handleUnblock = async (accessId: string) => {
    setError(false);
    setBusyAccessId(accessId);
    try {
      await unblockAccess(client, accessId);
      setOverview((current) => (current ? resetAccessState(current, accessId) : current));
    } catch (unblockError) {
      console.error(unblockError);
      setError(true);
    } finally {
      setBusyAccessId(null);
    }
  };

  return (
    <div className="access-management stack--loose stack">
      <PageHeader
        eyebrow="Diagnóstico · distribución"
        title="Distribuir accesos"
        lead="Abre el borrador para un paralelo y gestiona el acceso de cada estudiante."
      />
      {loading && (
        <p role="status" className="loading">
          Preparando accesos…
        </p>
      )}
      {error && (
        <Notice tone="error">No pudimos completar la operación. Intenta nuevamente.</Notice>
      )}

      {!loading && overview && (
        <section className="stack" aria-labelledby="access-overview-title">
          <div>
            <p className="mono-label">Evaluación abierta</p>
            <h2 id="access-overview-title">{overview.title}</h2>
          </div>

          <div className="stack access-link">
            <label htmlFor="access-student-link">Enlace estudiantil</label>
            <div className="cluster">
              <input id="access-student-link" className="input" readOnly value={studentLink} />
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void copyValue(studentLink, 'Enlace copiado.')}
              >
                Copiar enlace
              </button>
              <button type="button" className="button button--secondary" onClick={handleDownload}>
                Descargar CSV
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => window.print()}
              >
                Imprimir
              </button>
            </div>
          </div>

          {copied && (
            <p role="status" className="mono-label">
              {copied}
            </p>
          )}
          {rotationSummary && <Notice tone="info">{rotationSummary}</Notice>}

          {overview.legacyCount > 0 && (
            <LegacyCodesConversion
              legacyCount={legacyAccesses.length}
              activeSessions={legacyAccesses.filter(({ state }) => state === 'active').length}
              confirming={confirmingRotation}
              rotating={rotating}
              onStart={() => setConfirmingRotation(true)}
              onCancel={() => setConfirmingRotation(false)}
              onConfirm={() => void handleRotateLegacy()}
            />
          )}

          <AccessCodesTable
            accesses={overview.accesses}
            busyAccessId={busyAccessId}
            onCopyCode={(access) =>
              void copyValue(access.code ?? '', `Código de ${access.fullName} copiado.`)
            }
            onRegenerate={(accessId) => void handleRegenerate(accessId)}
            onUnblock={(accessId) => void handleUnblock(accessId)}
          />
        </section>
      )}

      {!loading && !overview && (
        <OpenAssessmentForm
          title={assessment?.title ?? null}
          groups={groups}
          groupId={groupId}
          confirmed={confirmed}
          opening={opening}
          canOpen={Boolean(assessment?.id) && Boolean(groupId) && confirmed}
          onGroupChange={setGroupId}
          onConfirmedChange={setConfirmed}
          onOpen={() => void handleOpen()}
        />
      )}
    </div>
  );
}

function updateAccess(
  overview: AccessOverview,
  accessId: string,
  update: (access: AccessOverviewItem) => AccessOverviewItem,
): AccessOverview {
  const accesses = overview.accesses.map((access) =>
    access.id === accessId ? update(access) : access,
  );
  return {
    ...overview,
    legacyCount: accesses.filter(({ codeStatus }) => codeStatus === 'legacy').length,
    accesses,
  };
}

function replaceCode(overview: AccessOverview, accessId: string, code: string): AccessOverview {
  return updateAccess(overview, accessId, (access) => ({
    ...access,
    code,
    codeStatus: 'available',
    state: 'unused',
    failedAttempts: 0,
    cooldownUntil: null,
  }));
}

function resetAccessState(overview: AccessOverview, accessId: string): AccessOverview {
  return updateAccess(overview, accessId, (access) => ({
    ...access,
    state: 'unused',
    failedAttempts: 0,
    cooldownUntil: null,
  }));
}
