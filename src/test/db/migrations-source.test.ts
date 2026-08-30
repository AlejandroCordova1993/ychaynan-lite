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
