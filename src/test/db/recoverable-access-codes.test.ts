// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';

let db: PGlite;

beforeEach(async () => {
  db = await createTestDatabase();
});
afterEach(async () => db.close());

interface Scenario {
  assessmentId: string;
  groupId: string;
  studentIds: string[];
  questionId: string;
}

async function seedScenario(
  status: 'draft' | 'open',
  studentNames: string[] = ['Ana Ruiz'],
): Promise<Scenario> {
  const group = await db.query<{ id: string }>(
    `insert into public.groups (name, school_year) values ('3ro BGU A', '2026') returning id`,
  );
  const studentIds: string[] = [];
  for (const name of studentNames) {
    const student = await db.query<{ id: string }>(
      `insert into public.students (group_id, full_name_original, full_name_normalized)
       values ($1, $2, public.normalize_lite_identity($2)) returning id`,
      [group.rows[0].id, name],
    );
    studentIds.push(student.rows[0].id);
  }
  const assessment = await db.query<{ id: string }>(
    `insert into public.assessments
       (slug, title, purpose, reading_text, status, rubric_snapshot,
        rubric_schema_version, rubric_hash)
     values ('diagnostico-2026', 'Diagnóstico', 'Base', 'Lectura', 'draft', '{}'::jsonb,
             '1.0', 'hash')
     returning id`,
  );
  // Las preguntas quedan congeladas al abrir, así que se siembran mientras es borrador.
  const question = await db.query<{ id: string }>(
    `insert into public.questions (assessment_id, position, prompt, instructions)
     values ($1, 1, 'Pregunta', '') returning id`,
    [assessment.rows[0].id],
  );
  if (status === 'open') {
    await db.query(
      `update public.assessments set status = 'open', opened_at = now() where id = $1`,
      [assessment.rows[0].id],
    );
  }
  return {
    assessmentId: assessment.rows[0].id,
    groupId: group.rows[0].id,
    studentIds,
    questionId: question.rows[0].id,
  };
}

async function seedAccess(
  scenario: Scenario,
  studentIndex: number,
  state: 'unused' | 'active' | 'blocked' | 'submitted' | 'revoked',
  generation: number,
): Promise<string> {
  const access = await db.query<{ id: string }>(
    `insert into public.assessment_access
       (assessment_id, student_id, code_hash, state, code_generation, first_used_at)
     values ($1, $2, $3, $4, $5, now()) returning id`,
    [
      scenario.assessmentId,
      scenario.studentIds[studentIndex],
      `hash-anterior-${studentIndex}-${state}`,
      state,
      generation,
    ],
  );
  return access.rows[0].id;
}

async function seedSession(accessId: string, tokenHash: string): Promise<void> {
  await db.query(
    `insert into public.student_sessions (assessment_access_id, token_hash, expires_at)
     values ($1, $2, now() + interval '2 hours')`,
    [accessId, tokenHash],
  );
}

async function seedDraft(scenario: Scenario, studentIndex: number): Promise<string> {
  const submission = await db.query<{ id: string }>(
    `insert into public.submissions (assessment_id, student_id, client_submission_key)
     values ($1, $2, 'clave-cliente') returning id`,
    [scenario.assessmentId, scenario.studentIds[studentIndex]],
  );
  await db.query(
    `insert into public.responses
       (submission_id, question_id, original_text, word_count, draft_saved_at)
     values ($1, $2, 'Borrador del estudiante', 3, now())`,
    [submission.rows[0].id, scenario.questionId],
  );
  return submission.rows[0].id;
}

describe('códigos recuperables en la base', () => {
  it('marca los accesos existentes como generación heredada y rechaza valores negativos', async () => {
    const scenario = await seedScenario('open');
    const accessId = await seedAccess(scenario, 0, 'unused', 0);

    const stored = await db.query<{ code_generation: number }>(
      `select code_generation from public.assessment_access where id = $1`,
      [accessId],
    );
    expect(stored.rows[0].code_generation).toBe(0);

    await expect(
      db.query(`update public.assessment_access set code_generation = -1 where id = $1`, [
        accessId,
      ]),
    ).rejects.toThrow(/code_generation/i);
  });

  it('abre la evaluación dejando cada acceso en la generación recuperable inicial', async () => {
    const scenario = await seedScenario('draft', ['Ana Ruiz', 'Luis Peña']);
    await db.exec('set role service_role');

    await db.query(`select public.open_assessment_with_recoverable_accesses($1, $2, $3::jsonb)`, [
      scenario.assessmentId,
      scenario.groupId,
      JSON.stringify([
        { student_id: scenario.studentIds[0], code_hash: 'hash-uno' },
        { student_id: scenario.studentIds[1], code_hash: 'hash-dos' },
      ]),
    ]);

    const accesses = await db.query<{ code_generation: number }>(
      `select code_generation from public.assessment_access where assessment_id = $1`,
      [scenario.assessmentId],
    );
    expect(accesses.rows).toHaveLength(2);
    expect(accesses.rows.every((row) => row.code_generation === 1)).toBe(true);
  });

  it('regenera incrementando la generación, revoca la sesión y conserva el borrador', async () => {
    const scenario = await seedScenario('open');
    const accessId = await seedAccess(scenario, 0, 'active', 1);
    await seedSession(accessId, 'token-anterior');
    const submissionId = await seedDraft(scenario, 0);
    await db.exec('set role service_role');

    await db.query(`select public.regenerate_assessment_access_code($1, 'hash-nuevo', 2)`, [
      accessId,
    ]);

    const access = await db.query<{
      code_hash: string;
      code_generation: number;
      state: string;
      failed_attempts: number;
    }>(
      `select code_hash, code_generation, state, failed_attempts
         from public.assessment_access where id = $1`,
      [accessId],
    );
    expect(access.rows[0]).toEqual({
      code_hash: 'hash-nuevo',
      code_generation: 2,
      state: 'unused',
      failed_attempts: 0,
    });

    const sessions = await db.query<{ revoked: number }>(
      `select count(*)::int as revoked from public.student_sessions
        where assessment_access_id = $1 and revoked_at is not null`,
      [accessId],
    );
    expect(sessions.rows[0].revoked).toBe(1);

    const responses = await db.query<{ original_text: string }>(
      `select original_text from public.responses where submission_id = $1`,
      [submissionId],
    );
    expect(responses.rows[0].original_text).toBe('Borrador del estudiante');
  });

  it('no regenera una entrega ya enviada', async () => {
    const scenario = await seedScenario('open');
    const accessId = await seedAccess(scenario, 0, 'submitted', 1);
    await db.exec('set role service_role');

    await expect(
      db.query(`select public.regenerate_assessment_access_code($1, 'hash-nuevo', 2)`, [accessId]),
    ).rejects.toThrow(/submitted/i);
  });

  it('rechaza una generación que ya dejó de ser la siguiente', async () => {
    const scenario = await seedScenario('open');
    const accessId = await seedAccess(scenario, 0, 'unused', 3);
    await db.exec('set role service_role');

    await expect(
      db.query(`select public.regenerate_assessment_access_code($1, 'hash-nuevo', 2)`, [accessId]),
    ).rejects.toThrow(/generation/i);
  });

  it('convierte solo los accesos heredados elegibles y revoca sus sesiones', async () => {
    const scenario = await seedScenario('open', [
      'Ana Ruiz',
      'Luis Peña',
      'Sara Vega',
      'Iván Mora',
    ]);
    const unused = await seedAccess(scenario, 0, 'unused', 0);
    const active = await seedAccess(scenario, 1, 'active', 0);
    const submitted = await seedAccess(scenario, 2, 'submitted', 0);
    const recoverable = await seedAccess(scenario, 3, 'unused', 1);
    await seedSession(active, 'token-activo');
    await seedSession(submitted, 'token-entregado');
    await db.exec('set role service_role');

    const result = await db.query<{ rotate_legacy_assessment_access_codes: unknown }>(
      `select public.rotate_legacy_assessment_access_codes($1, $2::jsonb)`,
      [
        scenario.assessmentId,
        JSON.stringify([
          { access_id: unused, code_hash: 'hash-rotado-1' },
          { access_id: active, code_hash: 'hash-rotado-2' },
          { access_id: submitted, code_hash: 'hash-rotado-3' },
          { access_id: recoverable, code_hash: 'hash-rotado-4' },
        ]),
      ],
    );
    expect(result.rows[0].rotate_legacy_assessment_access_codes).toEqual({
      rotated: 2,
      revokedSessions: 1,
    });

    const rows = await db.query<{ id: string; code_hash: string; code_generation: number }>(
      `select id, code_hash, code_generation from public.assessment_access where assessment_id = $1`,
      [scenario.assessmentId],
    );
    const byId = new Map(rows.rows.map((row) => [row.id, row]));
    expect(byId.get(unused)).toMatchObject({ code_hash: 'hash-rotado-1', code_generation: 1 });
    expect(byId.get(active)).toMatchObject({ code_hash: 'hash-rotado-2', code_generation: 1 });
    expect(byId.get(submitted)).toMatchObject({
      code_hash: 'hash-anterior-2-submitted',
      code_generation: 0,
    });
    expect(byId.get(recoverable)).toMatchObject({
      code_hash: 'hash-anterior-3-unused',
      code_generation: 1,
    });

    const entregada = await db.query<{ revoked: number }>(
      `select count(*)::int as revoked from public.student_sessions
        where assessment_access_id = $1 and revoked_at is not null`,
      [submitted],
    );
    expect(entregada.rows[0].revoked).toBe(0);
  });

  it('mantiene las operaciones de códigos fuera del alcance del cliente', async () => {
    const emptyUuid = '00000000-0000-0000-0000-000000000000';
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await expect(
        db.query(`select public.regenerate_assessment_access_code($1, 'hash', 1)`, [emptyUuid]),
      ).rejects.toThrow(/permission denied/i);
      await expect(
        db.query(`select public.rotate_legacy_assessment_access_codes($1, '[]'::jsonb)`, [
          emptyUuid,
        ]),
      ).rejects.toThrow(/permission denied/i);
      await expect(
        db.query(`select public.open_assessment_with_recoverable_accesses($1, $1, '[]'::jsonb)`, [
          emptyUuid,
        ]),
      ).rejects.toThrow(/permission denied/i);
      await db.exec('reset role');
    }
  });
});
