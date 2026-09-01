import { z } from 'zod';

const schema = z.object({ responses: z.record(z.string()), savedAt: z.string().datetime() });
export type LocalDraft = z.infer<typeof schema>;
const key = (slug: string) => `ychaynan-lite:v1:draft:${slug}`;

export function saveLocalDraft(slug: string, responses: Record<string, string>): void {
  localStorage.setItem(key(slug), JSON.stringify({ responses, savedAt: new Date().toISOString() }));
}
export function loadLocalDraft(slug: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(key(slug));
    return raw ? schema.parse(JSON.parse(raw)) : null;
  } catch {
    clearLocalDraft(slug);
    return null;
  }
}
export function clearLocalDraft(slug: string): void {
  localStorage.removeItem(key(slug));
}
