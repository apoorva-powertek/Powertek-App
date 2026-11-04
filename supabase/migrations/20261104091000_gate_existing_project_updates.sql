begin;
-- Preserve visibility of untouched legacy projects, but require approval as soon
-- as their survey data or source-file metadata is changed after this release.
create or replace function portal_private.withdraw_project_release() returns trigger
language plpgsql security definer set search_path='' as $$
declare target text;
begin
 if tg_table_name in ('poles','project_files') then
  target:=case when tg_op='DELETE' then old.project_id else new.project_id end;
 else
  select project_id into target from public.poles where id=case when tg_op='DELETE' then old.pole_id else new.pole_id end;
 end if;
 update public.projects set requires_approval=true,published_at=null where id=target and (not requires_approval or published_at is not null);
 return coalesce(new,old);
end;
$$;
commit;
