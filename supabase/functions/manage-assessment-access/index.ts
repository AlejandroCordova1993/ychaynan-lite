import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createManageAssessmentAccessHandler, type AccessRow } from './handler.ts';

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
  async loadOpenAssessment() {
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('id, slug, title')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assessmentError) throw assessmentError;
    if (!assessment) return null;

    const { data: accessRows, error: accessError } = await serviceClient
      .from('assessment_access')
      .select(
        'id, student_id, state, failed_attempts, cooldown_until, code_generation, code_hash, students!inner(full_name_original, groups!inner(name))',
      )
      .eq('assessment_id', assessment.id);
    if (accessError) throw accessError;

    const { data: submissionRows, error: submissionError } = await serviceClient
      .from('submissions')
      .select('student_id, status')
      .eq('assessment_id', assessment.id);
    if (submissionError) throw submissionError;

    const submissionByStudent = new Map(
      (submissionRows ?? []).map((row) => [row.student_id as string, row.status as string]),
    );

    const accesses: AccessRow[] = (accessRows ?? []).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      fullName: row.students.full_name_original,
      groupName: row.students.groups.name,
      state: row.state,
      submissionStatus: submissionByStudent.get(row.student_id) ?? 'none',
      failedAttempts: row.failed_attempts,
      cooldownUntil: row.cooldown_until,
      codeGeneration: row.code_generation,
      codeHash: row.code_hash,
    }));
    accesses.sort(
      (left, right) =>
        left.groupName.localeCompare(right.groupName, 'es') ||
        left.fullName.localeCompare(right.fullName, 'es'),
    );

    return {
      assessment: { id: assessment.id, slug: assessment.slug, title: assessment.title },
      accesses,
    };
  },
  async openAssessment(assessmentId, groupId, accesses) {
    const { error } = await serviceClient.rpc('open_assessment_with_recoverable_accesses', {
      p_assessment_id: assessmentId,
      p_group_id: groupId,
      p_accesses: accesses,
    });
    if (error) throw error;
  },
  async regenerateAccess(accessId, codeHash, codeGeneration) {
    const { error } = await serviceClient.rpc('regenerate_assessment_access_code', {
      p_access_id: accessId,
      p_code_hash: codeHash,
      p_code_generation: codeGeneration,
    });
    if (error) throw error;
  },
  async rotateLegacyAccesses(assessmentId, codes) {
    const { data, error } = await serviceClient.rpc('rotate_legacy_assessment_access_codes', {
      p_assessment_id: assessmentId,
      p_codes: codes,
    });
    if (error) throw error;
    return {
      rotated: Number(data?.rotated ?? 0),
      revokedSessions: Number(data?.revokedSessions ?? 0),
    };
  },
  async unblockAccess(accessId) {
    const { error } = await serviceClient.rpc('unblock_assessment_access', {
      p_access_id: accessId,
    });
    if (error) throw error;
  },
});

Deno.serve(handler);
