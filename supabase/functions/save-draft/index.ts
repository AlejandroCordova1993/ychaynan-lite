import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createSaveDraftHandler } from './handler.ts';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (!supabaseUrl || !serviceRoleKey || allowedOrigins.length === 0)
  throw new Error('Faltan variables obligatorias para save-draft.');
const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const handler = createSaveDraftHandler({
  allowedOrigins,
  async load(input) {
    const { data, error } = await client.rpc('get_student_assessment', {
      p_token_hash: input.tokenHash,
      p_client_submission_key: input.clientSubmissionKey,
    });
    if (error) throw error;
    return data;
  },
  async save(input) {
    const { data, error } = await client.rpc('save_student_draft', {
      p_token_hash: input.tokenHash,
      p_client_submission_key: input.clientSubmissionKey,
      p_expected_version: input.expectedVersion,
      p_responses: input.responses,
    });
    if (error) throw error;
    return data;
  },
});
Deno.serve(handler);
