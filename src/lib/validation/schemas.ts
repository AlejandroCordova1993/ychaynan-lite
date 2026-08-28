import { z } from 'zod';

export const groupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(160),
  schoolYear: z.string().min(4).max(9),
  status: z.enum(['active', 'archived']),
});
export type Group = z.infer<typeof groupSchema>;

export const createGroupInputSchema = z.object({
  name: z.string().min(1).max(160),
  schoolYear: z.string().min(4).max(9),
});
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;

export const studentSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  fullNameOriginal: z.string().min(1).max(160),
  fullNameNormalized: z.string().min(1).max(160),
  authorizedVariants: z.array(z.string()),
  status: z.enum(['active', 'inactive']),
});
export type Student = z.infer<typeof studentSchema>;
