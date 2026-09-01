import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createValidateStudentHandler } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const pepper = Deno.env.get('ACCESS_CODE_PEPPER') ?? '';
const sessionMinutes = Number(Deno.env.get('STUDENT_SESSION_MAX_MINUTES') ?? '180');
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (!supabaseUrl || !serviceRoleKey || !pepper || allowedOrigins.length === 0)
  throw new Error('Faltan variables obligatorias para validate-student.');

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
const handler = createValidateStudentHandler({
  allowedOrigins,
  pepper,
  sessionMinutes,
  async validate(input) {
    const { data, error } = await serviceClient.rpc('validate_student_access', {
      p_assessment_slug: input.assessmentSlug,
      p_full_name_normalized: input.fullNameNormalized,
      p_group_name_normalized: input.groupNameNormalized,
      p_code_hash: input.codeHash,
      p_fingerprint_hash: input.fingerprintHash,
      p_token_hash: input.tokenHash,
      p_client_submission_key: input.clientSubmissionKey,
      p_session_minutes: input.sessionMinutes,
    });
    if (error || !data?.ok) throw error ?? new Error('invalid access');
    return {
      submissionId: data.submissionId,
      expiresAt: data.expiresAt,
      draftVersion: data.draftVersion,
    };
  },
});
Deno.serve(handler);
