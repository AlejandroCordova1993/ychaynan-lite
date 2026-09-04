import { z } from 'zod';

const schema = z.object({
  token: z.string().min(20),
  expiresAt: z.string().datetime({ offset: true }),
  clientSubmissionKey: z.string().min(1),
  submissionId: z.string().min(1),
  draftVersion: z.number().int().nonnegative(),
});
export type StoredStudentSession = z.infer<typeof schema>;
const key = (slug: string) => `ychaynan-lite:v1:session:${slug}`;
const fingerprintKey = 'ychaynan-lite:v1:fingerprint';

export function saveStudentSession(slug: string, value: StoredStudentSession): void {
  sessionStorage.setItem(key(slug), JSON.stringify(schema.parse(value)));
}
export function loadStudentSession(slug: string): StoredStudentSession | null {
  try {
    const raw = sessionStorage.getItem(key(slug));
    if (!raw) return null;
    const parsed = schema.parse(JSON.parse(raw));
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      clearStudentSession(slug);
      return null;
    }
    return parsed;
  } catch {
    clearStudentSession(slug);
    return null;
  }
}
export function clearStudentSession(slug: string): void {
  sessionStorage.removeItem(key(slug));
}
export function getStudentFingerprint(): string {
  const existing = localStorage.getItem(fingerprintKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(fingerprintKey, created);
  return created;
}
