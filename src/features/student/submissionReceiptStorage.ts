import { z } from 'zod';
import type { SubmissionReceipt } from '../../lib/api/studentSubmission';

const receiptSchema = z.object({
  receiptId: z.string().min(1),
  submittedAt: z.string().datetime(),
  finalDraftVersion: z.number().int().nonnegative(),
});
const key = (slug: string) => `ychaynan-lite:v1:receipt:${slug}`;

export function saveSubmissionReceipt(slug: string, receipt: SubmissionReceipt): void {
  sessionStorage.setItem(key(slug), JSON.stringify(receiptSchema.parse(receipt)));
}
export function loadSubmissionReceipt(slug: string): SubmissionReceipt | null {
  try {
    const raw = sessionStorage.getItem(key(slug));
    return raw ? receiptSchema.parse(JSON.parse(raw)) : null;
  } catch {
    clearSubmissionReceipt(slug);
    return null;
  }
}
export function clearSubmissionReceipt(slug: string): void {
  sessionStorage.removeItem(key(slug));
}
