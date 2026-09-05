-- Solo ajustes de revisión; el resultado original sigue protegido por su trigger.
create or replace function public.guard_teacher_evaluation_review()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
declare
  item jsonb;
  original jsonb;
begin
  if old.status in ('reviewed', 'discarded') and (
    new.status is distinct from old.status
    or new.teacher_adjustments is distinct from old.teacher_adjustments
    or new.teacher_note is distinct from old.teacher_note
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
  ) then raise exception 'review already finalized'; end if;
  if new.status in ('reviewed', 'discarded') and old.status <> new.status then
    if not public.is_teacher() or auth.uid() is null then
      raise exception 'teacher required';
    end if;
    if old.status <> 'completed' or old.result_json is null then
      raise exception 'completed evaluation required';
    end if;
    if length(coalesce(new.teacher_note, '')) > 1200
      or (new.status = 'discarded' and btrim(coalesce(new.teacher_note, '')) = '') then
      raise exception 'invalid review note';
    end if;
    if jsonb_typeof(new.teacher_adjustments) is distinct from 'array' then
      raise exception 'invalid adjustments';
    end if;
    if jsonb_array_length(new.teacher_adjustments) > 56 then
      raise exception 'too many adjustments';
    end if;
    if new.status = 'discarded' and jsonb_array_length(new.teacher_adjustments) <> 0 then
      raise exception 'discard cannot contain adjustments';
    end if;
    if exists (
      select 1 from jsonb_array_elements(new.teacher_adjustments) a
      group by a->>'position', a->>'id' having count(*) > 1
    ) then raise exception 'duplicate adjustment'; end if;
    for item in select value from jsonb_array_elements(new.teacher_adjustments) loop
      if jsonb_typeof(item) is distinct from 'object' then
        raise exception 'invalid adjustment';
      end if;
      if (select count(*) from jsonb_object_keys(item)) <> 4
        or not (item ?& array['position','id','level','reason'])
        or jsonb_typeof(item->'position') is distinct from 'number'
        or jsonb_typeof(item->'id') is distinct from 'string'
        or jsonb_typeof(item->'reason') is distinct from 'string'
        or length(btrim(item->>'reason')) not between 1 and 1200
        or item->'level' not in ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'"no_aplica"'::jsonb)
      then raise exception 'invalid adjustment'; end if;
      select c into original
        from jsonb_array_elements(old.result_json->'questionResults') q,
        lateral jsonb_array_elements((q->'criteria') || (q->'modules')) c
        where q->'position' = item->'position'
          and coalesce(c->>'criterionId', c->>'moduleId') = item->>'id';
      if original is null then raise exception 'unknown criterion'; end if;
    end loop;
    new.reviewed_by := auth.uid();
    new.reviewed_at := clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger ai_evaluations_teacher_review_guard
before update on public.ai_evaluations
for each row execute function public.guard_teacher_evaluation_review();

create or replace function public.review_submission_evaluation(
  p_evaluation_id uuid, p_decision text, p_adjustments jsonb, p_note text
) returns void language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  if not public.is_teacher() or auth.uid() is null then raise exception 'teacher required'; end if;
  if p_decision is null or p_decision not in ('reviewed', 'discarded') then
    raise exception 'invalid decision';
  end if;
  update public.ai_evaluations set
    status = p_decision, teacher_adjustments = p_adjustments,
    teacher_note = p_note, reviewed_by = auth.uid(), reviewed_at = clock_timestamp()
  where id = p_evaluation_id and status = 'completed';
  if not found then raise exception 'evaluation unavailable or already reviewed'; end if;
end;
$$;
revoke all on function public.guard_teacher_evaluation_review() from public, anon, authenticated;
revoke all on function public.review_submission_evaluation(uuid,text,jsonb,text) from public, anon;
grant execute on function public.review_submission_evaluation(uuid,text,jsonb,text) to authenticated;
