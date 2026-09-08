import { describe, expect, it } from 'vitest';
import {
  INPUT_LIMITS,
  hasOnlyKeys,
  isPlainRecord,
  isUuid,
  isWithinUnicodeLimit,
  truncateUnicode,
  unicodeLength,
} from './inputLimits.ts';

describe('input limits contract', () => {
  it('publica las cifras aprobadas', () => {
    expect(INPUT_LIMITS.responseChars).toBe(5_000);
    expect(INPUT_LIMITS.roster).toEqual({
      fileBytes: 5 * 1024 * 1024,
      rows: 50,
      cells: 500,
      studentsPerGroup: 50,
      nameChars: 160,
    });
    expect(INPUT_LIMITS.edgeBodyBytes).toEqual({
      validateStudent: 4096,
      saveDraft: 98304,
      submitAssessment: 4096,
      generateAssessmentDraft: 65536,
      evaluateSubmission: 4096,
      manageAssessmentAccess: 8192,
    });
    expect(INPUT_LIMITS.assessment).toEqual({
      slugChars: 200,
      titleChars: 160,
      purposeChars: 1_000,
      readingChars: 30_000,
      generalInstructionsChars: 6_000,
      questionsMin: 1,
      questionsMax: 4,
      promptChars: 2_000,
      questionInstructionsChars: 4_000,
      curriculumVersionChars: 80,
    });
    expect(INPUT_LIMITS.access).toEqual({
      fullNameChars: 160,
      groupNameChars: 80,
      personalCodeChars: 12,
      fingerprintChars: 128,
      tokenChars: 256,
      clientSubmissionKeyChars: 256,
    });
  });
  it('cuenta Unicode por puntos de código', () => {
    expect(unicodeLength('a😀b')).toBe(3);
    expect(isWithinUnicodeLimit('😀'.repeat(5_000), 5_000)).toBe(true);
    expect(isWithinUnicodeLimit('😀'.repeat(5_001), 5_000)).toBe(false);
    expect(truncateUnicode('a😀b', 2)).toBe('a😀');
  });
  it('valida forma, campos y UUID', () => {
    expect(isPlainRecord({ a: 1 })).toBe(true);
    expect(isPlainRecord([])).toBe(false);
    expect(hasOnlyKeys({ a: 1 }, ['a'])).toBe(true);
    expect(hasOnlyKeys({ a: 1, b: 2 }, ['a'])).toBe(false);
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('no-uuid')).toBe(false);
  });
});
