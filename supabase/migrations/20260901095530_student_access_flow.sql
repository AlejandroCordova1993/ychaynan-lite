create or replace function public.normalize_lite_identity(p_value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.regexp_replace(
        pg_catalog.lower(pg_catalog.translate(p_value, 'ÁÉÍÓÚÜáéíóúü', 'AEIOUUaeiouu')),
        '[^a-z0-9ñ]+', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  )
$$;

revoke all on function public.normalize_lite_identity(text) from public, anon, authenticated;
grant execute on function public.normalize_lite_identity(text) to service_role;

create or replace function public.validate_student_access(
  p_assessment_slug text,
  p_full_name_normalized text,
  p_group_name_normalized text,
  p_code_hash text,
  p_fingerprint_hash text,
  p_token_hash text,
  p_client_submission_key text,
  p_session_minutes integer
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_assessment public.assessments%rowtype;
  v_access record;
  v_rate public.access_rate_limits%rowtype;
  v_failed integer;
  v_expires_at timestamptz;
  v_submission public.submissions%rowtype;
begin
  select * into v_assessment
    from public.assessments
   where slug = p_assessment_slug
     and status = 'open'
     and (opens_at is null or opens_at <= pg_catalog.now())
     and (closes_at is null or closes_at > pg_catalog.now());

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid access');
  end if;

  select * into v_rate
    from public.access_rate_limits
   where assessment_id = v_assessment.id
     and client_fingerprint_hash = p_fingerprint_hash
     and window_started_at > pg_catalog.now() - interval '5 minutes'
   order by window_started_at desc
   limit 1
   for update;

  if not found then
    insert into public.access_rate_limits (assessment_id, client_fingerprint_hash, attempt_count)
    values (v_assessment.id, p_fingerprint_hash, 1)
    returning * into v_rate;
  else
    update public.access_rate_limits
       set attempt_count = attempt_count + 1,
           blocked_until = case when attempt_count + 1 > 200 then pg_catalog.now() + interval '5 minutes' else blocked_until end
     where id = v_rate.id
    returning * into v_rate;
  end if;

  if v_rate.attempt_count > 200 or v_rate.blocked_until > pg_catalog.now() then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid access');
  end if;

  select aa.id, aa.student_id, aa.state, aa.failed_attempts, aa.cooldown_until
    into v_access
    from public.assessment_access aa
    join public.students s on s.id = aa.student_id and s.status = 'active'
    join public.groups g on g.id = s.group_id and g.status = 'active'
   where aa.assessment_id = v_assessment.id
     and (s.full_name_normalized = p_full_name_normalized or p_full_name_normalized = any(s.authorized_variants))
     and public.normalize_lite_identity(g.name) = p_group_name_normalized
   order by (aa.code_hash = p_code_hash) desc, aa.id
   limit 1
   for update of aa;

  if not found or v_access.state in ('submitted', 'revoked', 'blocked')
     or v_access.cooldown_until > pg_catalog.now() then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid access');
  end if;

  if not exists (
    select 1 from public.assessment_access
     where id = v_access.id and code_hash = p_code_hash
  ) then
    v_failed := v_access.failed_attempts + 1;
    update public.assessment_access
       set failed_attempts = v_failed,
           cooldown_until = case
             when v_failed >= 7 then pg_catalog.now() + interval '10 minutes'
             when v_failed >= 5 then pg_catalog.now() + interval '2 minutes'
             when v_failed >= 3 then pg_catalog.now() + interval '30 seconds'
             else null
           end,
           state = case when v_failed >= 7 then 'blocked' else state end
     where id = v_access.id;
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid access');
  end if;

  update public.student_sessions
     set revoked_at = pg_catalog.now()
   where assessment_access_id = v_access.id and revoked_at is null;

  insert into public.submissions (assessment_id, student_id, client_submission_key)
  values (v_assessment.id, v_access.student_id, p_client_submission_key)
  on conflict (assessment_id, student_id) do update
    set client_submission_key = excluded.client_submission_key,
        updated_at = pg_catalog.now()
    where submissions.status = 'in_progress'
  returning * into v_submission;

  if v_submission.id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid access');
  end if;

  v_expires_at := least(
    pg_catalog.now() + pg_catalog.make_interval(mins => least(180, greatest(1, p_session_minutes))),
    coalesce(v_assessment.closes_at, pg_catalog.now() + interval '180 minutes')
  );

  insert into public.student_sessions (assessment_access_id, token_hash, expires_at)
  values (v_access.id, p_token_hash, v_expires_at);

  update public.assessment_access
     set state = 'active', failed_attempts = 0, cooldown_until = null,
         first_used_at = coalesce(first_used_at, pg_catalog.now())
   where id = v_access.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'submissionId', v_submission.id,
    'expiresAt', v_expires_at,
    'draftVersion', v_submission.draft_version
  );
end;
$$;

revoke all on function public.validate_student_access(text,text,text,text,text,text,text,integer)
  from public, anon, authenticated;
grant execute on function public.validate_student_access(text,text,text,text,text,text,text,integer)
  to service_role;



