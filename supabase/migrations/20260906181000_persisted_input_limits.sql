-- Limites de entrada aplicados en PostgreSQL: ultima linea de defensa.
-- El navegador y las funciones Edge ya rechazan estas mismas entradas; aqui se
-- persisten como restricciones y validaciones previas a cualquier mutacion, de
-- modo que un cliente que evite la funcion Edge tampoco pueda guardar una
-- respuesta desmedida, una quinta respuesta, una pregunta duplicada ni una
-- evaluacion fuera de rango.
--
-- Compuerta de compatibilidad: esta migracion nunca trunca, reescribe ni borra
-- datos. Si la base ya contiene informacion incompatible el bloque siguiente
-- lanza una excepcion y aborta la migracion completa, para que la correccion la
-- decida una persona y no un script. Sobre una base vacia pasa en silencio.
-- Los mensajes son fijos y no interpolan ningun valor almacenado.
do $$
begin
  if exists (select 1 from public.responses where pg_catalog.char_length(original_text) > 5000) then raise exception 'preflight: responses exceed 5000 characters'; end if;
  if exists (select 1 from public.groups where pg_catalog.char_length(name) > 80) then raise exception 'preflight: group names exceed 80 characters'; end if;
  if exists (select 1 from public.students group by group_id having pg_catalog.count(*) > 50) then raise exception 'preflight: groups exceed 50 students'; end if;
  if exists (select 1 from public.assessments where pg_catalog.char_length(slug) > 200 or pg_catalog.char_length(title) > 160 or pg_catalog.char_length(purpose) > 1000 or pg_catalog.char_length(reading_text) > 30000 or pg_catalog.char_length(general_instructions) > 6000 or pg_catalog.char_length(coalesce(curriculum_version, '')) > 80) then raise exception 'preflight: assessments exceed input limits'; end if;
  if exists (select 1 from public.questions where pg_catalog.char_length(prompt) > 2000 or pg_catalog.char_length(instructions) > 4000) then raise exception 'preflight: questions exceed input limits'; end if;
  if exists (select 1 from public.students where exists (select 1 from pg_catalog.unnest(authorized_variants) value where pg_catalog.char_length(value) > 160)) then raise exception 'preflight: student variants exceed 160 characters'; end if;
end;
$$;

-- char_length cuenta puntos de codigo, no bytes: un emoji vale uno.
create or replace function public.text_array_values_within(p_values text[], p_max integer)
returns boolean language sql immutable strict set search_path = ''
as $$ select coalesce(pg_catalog.bool_and(pg_catalog.char_length(value) <= p_max), true) from pg_catalog.unnest(p_values) value $$;
revoke all on function public.text_array_values_within(text[], integer) from public, anon, authenticated;

alter table public.groups add constraint groups_name_length check (pg_catalog.char_length(name) <= 80);
alter table public.students add constraint students_authorized_variants_length check (public.text_array_values_within(authorized_variants, 160));
alter table public.assessments
  add constraint assessments_slug_length check (pg_catalog.char_length(slug) <= 200),
  add constraint assessments_title_length check (pg_catalog.char_length(title) <= 160),
  add constraint assessments_purpose_length check (pg_catalog.char_length(purpose) <= 1000),
  add constraint assessments_reading_length check (pg_catalog.char_length(reading_text) <= 30000),
  add constraint assessments_instructions_length check (pg_catalog.char_length(general_instructions) <= 6000),
  add constraint assessments_curriculum_length check (pg_catalog.char_length(coalesce(curriculum_version, '')) <= 80);
alter table public.questions
  add constraint questions_prompt_length check (pg_catalog.char_length(prompt) <= 2000),
  add constraint questions_instructions_length check (pg_catalog.char_length(instructions) <= 4000);
alter table public.responses add constraint responses_original_text_length check (pg_catalog.char_length(original_text) <= 5000);
alter table public.submissions add constraint submissions_client_key_length check (pg_catalog.char_length(client_submission_key) <= 256);
alter table public.student_sessions add constraint student_sessions_token_hash_length check (pg_catalog.char_length(token_hash) <= 128);
alter table public.access_rate_limits add constraint access_rate_fingerprint_hash_length check (pg_catalog.char_length(client_fingerprint_hash) <= 128);

-- save_student_draft: se conservan la busqueda de sesion con "for update of sub",
-- la respuesta de conflicto, el upsert, el borrado de respuestas ausentes y el
-- incremento de version. Solo se antepone una validacion estricta del payload,
-- ubicada antes de la comprobacion de pertenencia porque esa comprobacion casta
-- questionId a uuid y un valor no-uuid abortaria con SQLSTATE 22P02 en lugar de
-- devolver el resultado controlado.
create or replace function public.save_student_draft(
  p_token_hash text, p_client_submission_key text, p_expected_version integer, p_responses jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_submission public.submissions%rowtype;
  v_item jsonb;
  v_current jsonb;
begin
  select sub.* into v_submission
    from public.student_sessions ss
    join public.assessment_access aa on aa.id = ss.assessment_access_id
    join public.assessments a on a.id = aa.assessment_id
    join public.submissions sub on sub.assessment_id = a.id and sub.student_id = aa.student_id
   where ss.token_hash = p_token_hash and ss.revoked_at is null and ss.expires_at > pg_catalog.now()
     and sub.client_submission_key = p_client_submission_key and sub.status = 'in_progress'
     and a.status = 'open' and (a.closes_at is null or a.closes_at > pg_catalog.now())
   for update of sub;
  if not found then return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid session'); end if;

  if v_submission.draft_version <> p_expected_version then
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('questionId',question_id,'text',original_text)), '[]'::jsonb)
      into v_current from public.responses where submission_id = v_submission.id;
    return pg_catalog.jsonb_build_object('ok', false, 'conflict', true, 'draftVersion', v_submission.draft_version, 'responses', v_current);
  end if;

  if p_expected_version < 0
     or pg_catalog.jsonb_typeof(p_responses) is distinct from 'array' then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid responses');
  end if;
  if pg_catalog.jsonb_array_length(p_responses) > 4
     or exists (
       select 1 from pg_catalog.jsonb_array_elements(p_responses) item(value)
        where pg_catalog.jsonb_typeof(item.value) is distinct from 'object'
           or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(item.value)) <> 2
           or not (item.value ?& array['questionId', 'text'])
           or pg_catalog.jsonb_typeof(item.value -> 'questionId') is distinct from 'string'
           or pg_catalog.jsonb_typeof(item.value -> 'text') is distinct from 'string'
           or (item.value ->> 'questionId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
           or pg_catalog.char_length(item.value ->> 'text') > 5000
     )
     or (select pg_catalog.count(*) from pg_catalog.jsonb_array_elements(p_responses))
        <> (select pg_catalog.count(distinct item.value ->> 'questionId') from pg_catalog.jsonb_array_elements(p_responses) item(value))
  then return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid responses'); end if;

  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_responses) item
    where not exists (select 1 from public.questions q where q.id = (item->>'questionId')::uuid and q.assessment_id = v_submission.assessment_id)
  ) then return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid responses'); end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_responses) loop
    insert into public.responses (submission_id, question_id, original_text, word_count, draft_saved_at)
    values (v_submission.id, (v_item->>'questionId')::uuid, v_item->>'text',
      case when pg_catalog.btrim(v_item->>'text') = '' then 0 else pg_catalog.cardinality(pg_catalog.regexp_split_to_array(pg_catalog.btrim(v_item->>'text'), '\s+')) end,
      pg_catalog.now())
    on conflict (submission_id, question_id) do update set
      original_text = excluded.original_text, word_count = excluded.word_count, draft_saved_at = excluded.draft_saved_at;
  end loop;

  delete from public.responses r where r.submission_id = v_submission.id
    and not exists (select 1 from pg_catalog.jsonb_array_elements(p_responses) item where (item->>'questionId')::uuid = r.question_id);
  update public.submissions set draft_version = draft_version + 1, updated_at = pg_catalog.now()
   where id = v_submission.id returning * into v_submission;
  update public.student_sessions set last_seen_at = pg_catalog.now() where token_hash = p_token_hash;
  return pg_catalog.jsonb_build_object('ok', true, 'draftVersion', v_submission.draft_version);
end;
$$;

revoke all on function public.save_student_draft(text,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.save_student_draft(text,text,integer,jsonb) to service_role;

-- save_assessment_draft: se conservan el control de rol docente, las posiciones
-- consecutivas, las fechas, la rubrica y toda la logica de escritura. Se anaden
-- comprobaciones de tipo y longitud antes de cualquier insert o update, con
-- mensajes estables que jamas incluyen el contenido rechazado.
create or replace function public.save_assessment_draft(
  p_assessment jsonb,
  p_questions jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_assessment_id uuid;
  v_question jsonb;
  v_question_id uuid;
  v_opens_at timestamptz;
  v_closes_at timestamptz;
begin
  if not public.is_teacher() then
    raise exception 'teacher role required';
  end if;

  if jsonb_typeof(p_assessment) is distinct from 'object' then
    raise exception 'assessment must be a JSON object';
  end if;

  if jsonb_typeof(p_questions) is distinct from 'array'
     or jsonb_array_length(p_questions) not between 1 and 4 then
    raise exception 'assessment must contain between 1 and 4 questions';
  end if;

  if nullif(pg_catalog.btrim(p_assessment ->> 'title'), '') is null
     or nullif(pg_catalog.btrim(p_assessment ->> 'purpose'), '') is null
     or nullif(pg_catalog.btrim(p_assessment ->> 'reading_text'), '') is null then
    raise exception 'title, purpose and reading_text are required';
  end if;

  if jsonb_typeof(p_assessment -> 'title') is distinct from 'string'
     or jsonb_typeof(p_assessment -> 'purpose') is distinct from 'string'
     or jsonb_typeof(p_assessment -> 'reading_text') is distinct from 'string'
     or coalesce(jsonb_typeof(p_assessment -> 'general_instructions'), 'null') not in ('string', 'null')
     or coalesce(jsonb_typeof(p_assessment -> 'curriculum_version'), 'null') not in ('string', 'null')
     or pg_catalog.char_length(p_assessment ->> 'title') > 160
     or pg_catalog.char_length(p_assessment ->> 'purpose') > 1000
     or pg_catalog.char_length(p_assessment ->> 'reading_text') > 30000
     or pg_catalog.char_length(coalesce(p_assessment ->> 'general_instructions', '')) > 6000
     or pg_catalog.char_length(coalesce(p_assessment ->> 'curriculum_version', '')) > 80 then
    raise exception 'assessment fields exceed limits';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_questions) with ordinality as question(value, position)
     where jsonb_typeof(question.value) is distinct from 'object'
        or nullif(question.value ->> 'position', '') is null
        or (question.value ->> 'position')::integer <> question.position
  ) then
    raise exception 'question positions must be consecutive from 1';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_questions) as question(value)
     where nullif(pg_catalog.btrim(question.value ->> 'prompt'), '') is null
        or jsonb_typeof(coalesce(question.value -> 'active_criteria', '[]'::jsonb))
           is distinct from 'array'
        or jsonb_array_length(
             coalesce(question.value -> 'active_criteria', '[]'::jsonb)
           ) = 0
  ) then
    raise exception 'each question requires a prompt and at least one active criterion';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_questions) as question(value)
     where jsonb_typeof(question.value -> 'prompt') is distinct from 'string'
        or coalesce(jsonb_typeof(question.value -> 'instructions'), 'null')
           not in ('string', 'null')
        or pg_catalog.char_length(question.value ->> 'prompt') > 2000
        or pg_catalog.char_length(coalesce(question.value ->> 'instructions', '')) > 4000
  ) then
    raise exception 'question fields exceed limits';
  end if;

  v_opens_at := nullif(p_assessment ->> 'opens_at', '')::timestamptz;
  v_closes_at := nullif(p_assessment ->> 'closes_at', '')::timestamptz;
  if v_opens_at is not null and v_closes_at is not null and v_closes_at <= v_opens_at then
    raise exception 'closes_at must be after opens_at';
  end if;

  v_assessment_id := nullif(p_assessment ->> 'id', '')::uuid;

  if v_assessment_id is null then
    v_assessment_id := gen_random_uuid();
    insert into public.assessments (
      id, slug, title, purpose, reading_text, general_instructions, opens_at, closes_at,
      paste_policy, curriculum_version, rubric_snapshot, rubric_schema_version, rubric_hash
    ) values (
      v_assessment_id,
      'evaluacion-' || pg_catalog.substr(v_assessment_id::text, 1, 8),
      pg_catalog.btrim(p_assessment ->> 'title'),
      pg_catalog.btrim(p_assessment ->> 'purpose'),
      pg_catalog.btrim(p_assessment ->> 'reading_text'),
      coalesce(p_assessment ->> 'general_instructions', ''),
      v_opens_at,
      v_closes_at,
      coalesce(nullif(p_assessment ->> 'paste_policy', ''), 'discourage'),
      nullif(p_assessment ->> 'curriculum_version', ''),
      p_assessment -> 'rubric_snapshot',
      p_assessment ->> 'rubric_schema_version',
      p_assessment ->> 'rubric_hash'
    );
  else
    update public.assessments
       set title = pg_catalog.btrim(p_assessment ->> 'title'),
           purpose = pg_catalog.btrim(p_assessment ->> 'purpose'),
           reading_text = pg_catalog.btrim(p_assessment ->> 'reading_text'),
           general_instructions = coalesce(p_assessment ->> 'general_instructions', ''),
           opens_at = v_opens_at,
           closes_at = v_closes_at,
           paste_policy = coalesce(nullif(p_assessment ->> 'paste_policy', ''), 'discourage'),
           curriculum_version = nullif(p_assessment ->> 'curriculum_version', ''),
           rubric_snapshot = p_assessment -> 'rubric_snapshot',
           rubric_schema_version = p_assessment ->> 'rubric_schema_version',
           rubric_hash = p_assessment ->> 'rubric_hash'
     where id = v_assessment_id
       and status = 'draft';

    if not found then
      raise exception 'draft assessment not found or no longer editable';
    end if;

    delete from public.questions where assessment_id = v_assessment_id;
  end if;

  for v_question in
    select value from jsonb_array_elements(p_questions) with ordinality order by ordinality
  loop
    v_question_id := coalesce(nullif(v_question ->> 'id', '')::uuid, gen_random_uuid());

    insert into public.questions (
      id, assessment_id, position, prompt, instructions, suggested_min_words,
      suggested_max_words, active_criteria, active_modules, curriculum_links
    ) values (
      v_question_id,
      v_assessment_id,
      (v_question ->> 'position')::integer,
      pg_catalog.btrim(v_question ->> 'prompt'),
      coalesce(v_question ->> 'instructions', ''),
      nullif(v_question ->> 'suggested_min_words', '')::integer,
      nullif(v_question ->> 'suggested_max_words', '')::integer,
      array(
        select jsonb_array_elements_text(
          coalesce(v_question -> 'active_criteria', '[]'::jsonb)
        )
      ),
      array(
        select jsonb_array_elements_text(
          coalesce(v_question -> 'active_modules', '[]'::jsonb)
        )
      ),
      coalesce(v_question -> 'curriculum_links', '{}'::jsonb)
    );
  end loop;

  return v_assessment_id;
end;
$$;

revoke all on function public.save_assessment_draft(jsonb, jsonb) from public;
revoke all on function public.save_assessment_draft(jsonb, jsonb) from anon;
grant execute on function public.save_assessment_draft(jsonb, jsonb) to authenticated;
