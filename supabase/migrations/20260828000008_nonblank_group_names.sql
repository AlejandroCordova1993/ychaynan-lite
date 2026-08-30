-- La validación del cliente no sustituye la integridad de la base de datos.
alter table public.groups
  add constraint groups_name_not_blank
  check (btrim(name) <> '');

alter table public.groups
  add constraint groups_school_year_not_blank
  check (btrim(school_year) <> '');
