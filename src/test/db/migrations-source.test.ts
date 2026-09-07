// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schemaPath = resolve(process.cwd(), 'supabase/migrations/20260828000001_schema.sql');

describe('fuente de la migración inicial', () => {
  it('habilita RLS al crear cada tabla expuesta', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    const tables = [
      'groups',
      'students',
      'assessments',
      'questions',
      'assessment_access',
      'student_sessions',
      'access_rate_limits',
      'submissions',
      'responses',
      'ai_evaluations',
    ];

    for (const table of tables) {
      expect(schema).toContain(`alter table public.${table} enable row level security;`);
    }
  });
});

const persistedLimitsPath = resolve(
  process.cwd(),
  'supabase/migrations/20260906181000_persisted_input_limits.sql',
);

describe('fuente de la migración de límites persistidos', () => {
  it('declara cada restricción con nombre estable', () => {
    const migration = readFileSync(persistedLimitsPath, 'utf8');
    const constraints = [
      'groups_name_length',
      'students_authorized_variants_length',
      'assessments_slug_length',
      'assessments_title_length',
      'assessments_purpose_length',
      'assessments_reading_length',
      'assessments_instructions_length',
      'assessments_curriculum_length',
      'questions_prompt_length',
      'questions_instructions_length',
      'responses_original_text_length',
      'submissions_client_key_length',
      'student_sessions_token_hash_length',
      'access_rate_fingerprint_hash_length',
    ];

    for (const constraint of constraints) {
      expect(migration).toContain(`add constraint ${constraint} check`);
    }
  });

  it('aborta con un preflight que nunca repara ni destruye datos existentes', () => {
    const migration = readFileSync(persistedLimitsPath, 'utf8');
    const preflight = migration.slice(0, migration.indexOf('$$;') + 3);

    expect(migration.indexOf('do $$')).toBeGreaterThanOrEqual(0);
    expect(migration.indexOf('do $$')).toBeLessThan(migration.indexOf('alter table'));
    expect(preflight).toMatch(/preflight: responses exceed 5000 characters/);
    expect(preflight).not.toMatch(/\b(update|delete|truncate|insert|alter|drop)\b/i);
    expect(migration).not.toMatch(/\b(truncate|drop\s+table|drop\s+constraint|not\s+valid)\b/i);
  });

  it('mide la longitud en puntos de código con char_length', () => {
    const migration = readFileSync(persistedLimitsPath, 'utf8');
    expect(migration).not.toMatch(/\boctet_length\b/i);
    expect(migration).toMatch(/char_length/);
  });
});
