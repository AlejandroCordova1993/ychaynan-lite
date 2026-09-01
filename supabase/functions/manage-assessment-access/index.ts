import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createManageAssessmentAccessHandler } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const pepper = Deno.env.get('ACCESS_CODE_PEPPER') ?? '';
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!supabaseUrl || !anonKey || !serviceRoleKey || !pepper || allowedOrigins.length === 0) {
  throw new Error('Faltan variables obligatorias para manage-assessment-access.');
}

const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const handler = createManageAssessmentAccessHandler({
  allowedOrigins,
  pepper,
  async verifyUser(token) {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, appMetadata: data.user.app_metadata };
  },
  async listActiveStudents(groupId) {
    const { data, error } = await serviceClient
      .from('students')
      .select('id, full_name_original')
      .eq('group_id', groupId)
      .eq('status', 'active')
      .order('full_name_original', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((student) => ({
      id: student.id,
      fullName: student.full_name_original,
    }));
  },
  async openAssessment(assessmentId, groupId, accesses) {
    const { error } = await serviceClient.rpc('open_assessment_with_accesses', {
      p_assessment_id: assessmentId,
      p_group_id: groupId,
      p_accesses: accesses,
    });
    if (error) throw error;
  },
  async regenerateAccess(accessId, codeHash) {
    const { error } = await serviceClient.rpc('regenerate_assessment_access', {
      p_access_id: accessId,
      p_code_hash: codeHash,
    });
    if (error) throw error;
  },
  async unblockAccess(accessId) {
    const { error } = await serviceClient.rpc('unblock_assessment_access', {
      p_access_id: accessId,
    });
    if (error) throw error;
  },
});

Deno.serve(handler);
