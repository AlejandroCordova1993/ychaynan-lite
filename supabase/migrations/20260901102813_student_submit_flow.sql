create or replace function public.submit_student_assessment(
  p_token_hash text,
  p_client_submission_key text,
  p_expected_version integer,
  p_confirmed boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_context record;
  v_submitted_at timestamptz;
begin
  select ss.revoked_at, ss.expires_at, aa.id as access_id, aa.state as access_state,
         sub.id as submission_id, sub.status as submission_status, sub.draft_version,
         sub.submitted_at, a.status as assessment_status, a.closes_at
    into v_context
    from public.student_sessions ss
    join public.assessment_access aa on aa.id = ss.assessment_access_id
    join public.assessments a on a.id = aa.assessment_id
    join public.submissions sub on sub.assessment_id = a.id and sub.student_id = aa.student_id
   where ss.token_hash = p_token_hash
     and sub.client_submission_key = p_client_submission_key
   for update of aa, sub;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid submission');
  end if;

  if v_context.submission_status = 'submitted' then
    return pg_catalog.jsonb_build_object(
      'ok', true, 'receiptId', v_context.submission_id,
      'submittedAt', v_context.submitted_at,
      'finalDraftVersion', v_context.draft_version
    );
  end if;

  if p_confirmed is not true
     or v_context.revoked_at is not null
     or v_context.expires_at <= pg_catalog.now()
     or v_context.access_state <> 'active'
     or v_context.assessment_status <> 'open'
     or (v_context.closes_at is not null and v_context.closes_at <= pg_catalog.now())
     or v_context.draft_version <> p_expected_version then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid submission');
  end if;

  v_submitted_at := pg_catalog.clock_timestamp();
  update public.responses set submitted_at = v_submitted_at
   where submission_id = v_context.submission_id;
  update public.submissions
     set status = 'submitted', submitted_at = v_submitted_at, updated_at = v_submitted_at
   where id = v_context.submission_id;
  update public.assessment_access
     set state = 'submitted', submitted_at = v_submitted_at
   where id = v_context.access_id;
  update public.student_sessions
     set revoked_at = v_submitted_at
   where assessment_access_id = v_context.access_id and revoked_at is null;

  return pg_catalog.jsonb_build_object(
    'ok', true, 'receiptId', v_context.submission_id,
    'submittedAt', v_submitted_at,
    'finalDraftVersion', v_context.draft_version
  );
end;
$$;

revoke all on function public.submit_student_assessment(text,text,integer,boolean)
  from public, anon, authenticated;
grant execute on function public.submit_student_assessment(text,text,integer,boolean)
  to service_role;
