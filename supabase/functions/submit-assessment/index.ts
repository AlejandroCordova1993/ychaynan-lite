import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createSubmitAssessmentHandler } from './handler.ts';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (!supabaseUrl || !serviceRoleKey || allowedOrigins.length === 0)
  throw new Error('Faltan variables obligatorias para submit-assessment.');
const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const handler = createSubmitAssessmentHandler({
  allowedOrigins,
  async submit(input) {
    const { data, error } = await client.rpc('submit_student_assessment', {
      p_token_hash: input.tokenHash,
      p_client_submission_key: input.clientSubmissionKey,
      p_expected_version: input.expectedVersion,
      p_confirmed: input.confirmed,
    });
    if (error) throw error;
    return data;
  },
});
Deno.serve(handler);
