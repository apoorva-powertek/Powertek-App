-- Repair the imported schema's timestamp defaults and decouple invitations
-- from project assignments. Apply after 20261012090000.
begin;

do $$
declare item record;
begin
  for item in select table_name,column_name from information_schema.columns
    where table_schema='public'
      and table_name = any(array['clients','projects','portal_users','user_projects','poles','attachments','project_files'])
      and column_name in ('created_at','updated_at','assigned_at') and column_default is null
      and data_type in ('timestamp with time zone','timestamp without time zone')
  loop execute format('alter table public.%I alter column %I set default now()',item.table_name,item.column_name); end loop;
end $$;

create or replace function public.set_portal_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function public.set_portal_updated_at() from public,anon,authenticated;
do $$
declare tbl text;
begin
  foreach tbl in array array['clients','projects','portal_users','poles'] loop
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name=tbl and column_name='updated_at') then
      execute format('create trigger powertek_updated_at before update on public.%I for each row execute function public.set_portal_updated_at()',tbl);
    end if;
  end loop;
end $$;

create or replace function public.save_portal_access(
  p_email text, p_display_name text, p_role text, p_manage_clients boolean, p_assignments jsonb
) returns text language plpgsql security definer set search_path = '' as $$
declare
  target_id text;
  old_user public.portal_users%rowtype;
  assignment jsonb;
begin
  perform pg_advisory_xact_lock(821047391);
  if not portal_private.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if p_role not in ('admin','staff','client') or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(p_email) > 254 or length(trim(p_display_name)) = 0 or length(p_display_name) > 120 then
    raise exception 'Invalid invitation details' using errcode = '22023';
  end if;
  if jsonb_typeof(p_assignments) is distinct from 'array' or jsonb_array_length(p_assignments) > 100 then
    raise exception 'Invalid project assignments' using errcode = '22023';
  end if;
  select * into old_user from public.portal_users where lower(email) = lower(trim(p_email)) for update;
  if old_user.role = 'admin' and p_role <> 'admin' then
    if old_user.supabase_user_id = auth.uid() then raise exception 'You cannot remove your own administrator access' using errcode = '42501'; end if;
    if not exists (select 1 from public.portal_users where role = 'admin' and status = 'active' and id <> old_user.id) then
      raise exception 'Keep at least one active administrator' using errcode = '42501';
    end if;
  end if;
  for assignment in select value from jsonb_array_elements(p_assignments) loop
    if not exists (select 1 from public.projects where id = assignment->>'projectId') then
      raise exception 'Assigned project does not exist' using errcode = '22023';
    end if;
  end loop;
  target_id := coalesce(old_user.id, gen_random_uuid()::text);
  insert into public.portal_users (id,email,display_name,role,status,permissions)
  values (target_id,lower(trim(p_email)),trim(p_display_name),p_role,'active',jsonb_build_object('manageClients',p_role = 'staff' and coalesce(p_manage_clients,false)))
  on conflict (id) do update set display_name = excluded.display_name, role = excluded.role, status = excluded.status, permissions = excluded.permissions, updated_at = now();
  delete from public.user_projects where user_id = target_id;
  if p_role <> 'admin' then
    insert into public.user_projects (user_id,project_id,can_upload)
    select target_id, value->>'projectId', p_role = 'staff' and coalesce((value->>'canUpload')::boolean,false)
    from jsonb_array_elements(p_assignments);
  end if;
  return target_id;
end;
$$;
revoke all on function public.save_portal_access(text,text,text,boolean,jsonb) from public, anon;
grant execute on function public.save_portal_access(text,text,text,boolean,jsonb) to authenticated;



-- Apply account status and project/role changes in the same transaction.
create or replace function public.manage_portal_user(
  p_email text,p_display_name text,p_role text,p_manage_clients boolean,p_assignments jsonb,p_status text
) returns text language plpgsql security definer set search_path = '' as $$
declare previous public.portal_users%rowtype; target_id text;
begin
  perform pg_advisory_xact_lock(821047391);
  if not portal_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_status is null or p_status not in ('active','disabled') then raise exception 'Invalid user status' using errcode='22023'; end if;
  select * into previous from public.portal_users where lower(email)=lower(trim(p_email)) for update;
  if p_status='disabled' then
    if previous.supabase_user_id=auth.uid() then raise exception 'You cannot disable your own account' using errcode='42501'; end if;
    if previous.role='admin' and not exists(select 1 from public.portal_users where role='admin' and status='active' and id<>previous.id) then
      raise exception 'Keep an active administrator' using errcode='42501';
    end if;
  end if;
  target_id := public.save_portal_access(p_email,p_display_name,p_role,p_manage_clients,p_assignments);
  update public.portal_users set status=p_status where id=target_id;
  return target_id;
end;
$$;
revoke all on function public.manage_portal_user(text,text,text,boolean,jsonb,text) from public,anon;
grant execute on function public.manage_portal_user(text,text,text,boolean,jsonb,text) to authenticated;

create or replace function public.save_portal_client(p_client_id text,p_name text,p_code text,p_status text)
returns text language plpgsql security definer set search_path = '' as $$
declare target_id text;
begin
  if not portal_private.can_manage_clients() then raise exception 'Client management access required' using errcode='42501'; end if;
  if p_name is null or length(trim(p_name))=0 or length(trim(p_name))>120
    or p_code is null or p_code !~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' or length(p_code)>32
    or p_status is null or p_status not in ('active','archived') then raise exception 'Invalid client details' using errcode='22023'; end if;
  if p_client_id is null then
    target_id := gen_random_uuid()::text;
    insert into public.clients(id,name,code,status) values(target_id,trim(p_name),p_code,p_status);
  else
    update public.clients set name=trim(p_name),code=p_code,status=p_status where id=p_client_id returning id into target_id;
    if target_id is null then raise exception 'Client not found' using errcode='P0002'; end if;
  end if;
  return target_id;
end;
$$;
revoke all on function public.save_portal_client(text,text,text,text) from public,anon;
grant execute on function public.save_portal_client(text,text,text,text) to authenticated;

create or replace function public.save_portal_project(p_project_id text,p_client_id text,p_name text,p_code text,p_location_label text,p_status text)
returns text language plpgsql security definer set search_path = '' as $$
declare target_id text; old_client_id text; client_status text;
begin
  if not portal_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_name is null or length(trim(p_name))=0 or length(trim(p_name))>160
    or p_code is null or p_code !~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' or length(p_code)>32
    or p_location_label is null or length(p_location_label)>160
    or p_status is null or p_status not in ('active','archived') then raise exception 'Invalid project details' using errcode='22023'; end if;
  -- Lock the chosen client against a concurrent archive while creating a project.
  select status into client_status from public.clients where id=p_client_id for share;
  if client_status is null then raise exception 'Client not found' using errcode='P0002'; end if;
  if p_project_id is not null then
    select client_id into old_client_id from public.projects where id=p_project_id for update;
    if old_client_id is null then raise exception 'Project not found' using errcode='P0002'; end if;
  end if;
  if client_status<>'active' and (p_project_id is null or old_client_id<>p_client_id) then raise exception 'Choose an active client' using errcode='22023'; end if;
  if p_project_id is null then
    target_id := gen_random_uuid()::text;
    insert into public.projects(id,client_id,name,code,location_label,status) values(target_id,p_client_id,trim(p_name),p_code,trim(p_location_label),p_status);
  else
    update public.projects set client_id=p_client_id,name=trim(p_name),code=p_code,location_label=trim(p_location_label),status=p_status where id=p_project_id returning id into target_id;
  end if;
  return target_id;
end;
$$;
revoke all on function public.save_portal_project(text,text,text,text,text,text) from public,anon;
grant execute on function public.save_portal_project(text,text,text,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
