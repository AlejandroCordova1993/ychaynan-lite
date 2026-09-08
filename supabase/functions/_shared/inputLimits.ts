export const INPUT_LIMITS = {
  responseChars: 5_000,
  assessment: {
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
  },
  roster: {
    fileBytes: 5 * 1024 * 1024,
    rows: 50,
    cells: 500,
    studentsPerGroup: 50,
    nameChars: 160,
  },
  access: {
    fullNameChars: 160,
    groupNameChars: 80,
    personalCodeChars: 12,
    fingerprintChars: 128,
    tokenChars: 256,
    clientSubmissionKeyChars: 256,
  },
  edgeBodyBytes: {
    validateStudent: 4 * 1024,
    saveDraft: 96 * 1024,
    submitAssessment: 4 * 1024,
    evaluateSubmission: 4 * 1024,
    generateAssessmentDraft: 64 * 1024,
    manageAssessmentAccess: 8 * 1024,
  },
} as const;

export const unicodeLength = (value: string) => Array.from(value).length;
export const isWithinUnicodeLimit = (value: string, maximum: number) =>
  unicodeLength(value) <= maximum;
export const truncateUnicode = (value: string, maximum: number) =>
  Array.from(value).slice(0, maximum).join('');
export const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));
export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
