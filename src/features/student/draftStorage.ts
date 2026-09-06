import { z } from 'zod';

const schema = z.object({
  submissionId: z.string().min(1),
  draftVersion: z.number().int().nonnegative(),
  responses: z.record(z.string()),
  savedAt: z.string().datetime(),
});
export type LocalDraft = z.infer<typeof schema>;
const key = (slug: string, submissionId: string) =>
  `ychaynan-lite:v2:draft:${slug}:${submissionId}`;
const legacyKey = (slug: string) => `ychaynan-lite:v1:draft:${slug}`;

export function saveLocalDraft(
  slug: string,
  submissionId: string,
  draftVersion: number,
  responses: Record<string, string>,
): void {
  localStorage.setItem(
    key(slug, submissionId),
    JSON.stringify({ submissionId, draftVersion, responses, savedAt: new Date().toISOString() }),
  );
}
export function loadLocalDraft(slug: string, submissionId: string): LocalDraft | null {
  localStorage.removeItem(legacyKey(slug));
  try {
    const raw = localStorage.getItem(key(slug, submissionId));
    return raw ? schema.parse(JSON.parse(raw)) : null;
  } catch {
    clearLocalDraft(slug, submissionId);
    return null;
  }
}
export function clearLocalDraft(slug: string, submissionId: string): void {
  localStorage.removeItem(key(slug, submissionId));
  localStorage.removeItem(legacyKey(slug));
}
