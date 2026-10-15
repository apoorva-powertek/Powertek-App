-- Apply to the existing Powertek Supabase schema, after the earlier migrations.
-- Auth: separately disable "Allow new users to sign up" in Supabase settings.
begin;

alter table public.portal_users add column if not exists permissions jsonb not null default '{"manageClients":false}'::jsonb;
alter table public.portal_users add column if not exists invitation_status text not null default 'pending' check (invitation_status in ('pending','sent','accepted','failed'));
alter table public.portal_users add column if not exists invited_at timestamptz;
alter table public.user_projects add column if not exists can_upload boolean not null default false;

-- Preserve unrelated constraints; replace the existing role check only.
do $$
declare item record;
begin
  for item in select conname from pg_constraint
    where conrelid = 'public.portal_users'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ~ '\mrole\M'
  loop execute format('alter table public.portal_users drop constraint %I', item.conname); end loop;
end $$;
alter table public.portal_users add constraint portal_users_role_check check (role in ('admin','staff','client'));

create or replace function portal_private.can_read_project(target text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.portal_users u
    where u.supabase_user_id = auth.uid() and u.status = 'active'
      and (u.role = 'admin' or exists (select 1 from public.user_projects a where a.user_id = u.id and a.project_id = target))
  );
$$;
create or replace function portal_private.can_edit_project(p_project_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.portal_users u
    where u.supabase_user_id = auth.uid() and u.status = 'active'
      and (u.role = 'admin' or (u.role = 'staff' and exists (select 1 from public.user_projects a where a.user_id = u.id and a.project_id = p_project_id and a.can_upload)))
  );
$$;
create or replace function portal_private.can_manage_clients()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.portal_users u where u.supabase_user_id = auth.uid() and u.status = 'active'
    and (u.role = 'admin' or (u.role = 'staff' and u.permissions->>'manageClients' = 'true')));
$$;
revoke all on function portal_private.can_edit_project(text), portal_private.can_manage_clients() from public, anon;
grant execute on function portal_private.can_edit_project(text), portal_private.can_manage_clients() to authenticated;

-- A single transaction saves both the profile and its assignments. No partial
-- deletion of assignments if a project ID is invalid. Serialize admin changes
-- so two requests cannot concurrently remove the last administrator.
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
  if p_role = 'client' and jsonb_array_length(p_assignments) = 0 then raise exception 'Assign at least one project' using errcode = '22023'; end if;
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


create or replace function public.touch_portal_project(p_project_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not portal_private.can_edit_project(p_project_id) then raise exception 'Project edit access required' using errcode = '42501'; end if;
  update public.projects set updated_at = now() where id = p_project_id;
end;
$$;
revoke all on function public.touch_portal_project(text) from public, anon;
grant execute on function public.touch_portal_project(text) to authenticated;

-- Profile linking remains tied to the email verified by Supabase Auth.
create or replace function public.link_current_portal_user()
returns table (id text, email text, display_name text, role text, status text)
language plpgsql security definer set search_path = '' as $$
declare verified_email text;
begin
  select lower(u.email) into verified_email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  if verified_email is null then raise exception 'A confirmed sign-in is required' using errcode = '42501'; end if;
  update public.portal_users pu set supabase_user_id = auth.uid(), updated_at = now(), invitation_status = 'accepted'
    where lower(pu.email) = verified_email and (pu.supabase_user_id is null or pu.supabase_user_id = auth.uid()) and pu.status = 'active';
  return query select pu.id,pu.email,pu.display_name,pu.role,pu.status from public.portal_users pu where pu.supabase_user_id = auth.uid() and pu.status = 'active';
end;
$$;

-- Enable RLS even if a previous installation omitted it. Existing permissive
-- policies remain, with restrictive guards enforcing the new access boundary.
alter table public.portal_users enable row level security;
alter table public.user_projects enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.poles enable row level security;
alter table public.attachments enable row level security;
alter table public.project_files enable row level security;

-- Deny anonymous data access even when a legacy policy was public.
do $$
declare tbl text;
begin
  foreach tbl in array array['portal_users','user_projects','clients','projects','poles','attachments','project_files'] loop
    execute format('create policy %I on public.%I as restrictive for all to anon using (false) with check (false)', 'powertek_' || tbl || '_anonymous_guard', tbl);
  end loop;
end $$;
create policy powertek_storage_anonymous_guard on storage.objects as restrictive for all to anon using (bucket_id <> 'project-files') with check (bucket_id <> 'project-files');

create policy powertek_profiles_read on public.portal_users as restrictive for select to authenticated
using (supabase_user_id = auth.uid() or portal_private.is_admin());
create policy powertek_profiles_insert on public.portal_users as restrictive for insert to authenticated with check (portal_private.is_admin());
create policy powertek_profiles_update on public.portal_users as restrictive for update to authenticated using (portal_private.is_admin()) with check (portal_private.is_admin());
create policy powertek_profiles_delete on public.portal_users as restrictive for delete to authenticated using (portal_private.is_admin());
create policy powertek_assignments_read on public.user_projects as restrictive for select to authenticated
using (portal_private.is_admin() or exists (select 1 from public.portal_users u where u.id = user_id and u.supabase_user_id = auth.uid() and u.status = 'active'));
create policy powertek_assignments_insert on public.user_projects as restrictive for insert to authenticated with check (portal_private.is_admin());
create policy powertek_assignments_update on public.user_projects as restrictive for update to authenticated using (portal_private.is_admin()) with check (portal_private.is_admin());
create policy powertek_assignments_delete on public.user_projects as restrictive for delete to authenticated using (portal_private.is_admin());

create policy powertek_clients_visible on public.clients for select to authenticated using (portal_private.can_manage_clients() or exists (select 1 from public.projects p where p.client_id = clients.id and portal_private.can_read_project(p.id)));
create policy powertek_clients_read_guard on public.clients as restrictive for select to authenticated using (portal_private.can_manage_clients() or exists (select 1 from public.projects p where p.client_id = clients.id and portal_private.can_read_project(p.id)));
create policy powertek_clients_create on public.clients for insert to authenticated with check (portal_private.can_manage_clients());
create policy powertek_clients_insert_guard on public.clients as restrictive for insert to authenticated with check (portal_private.can_manage_clients());
create policy powertek_clients_update_guard on public.clients as restrictive for update to authenticated using (portal_private.can_manage_clients()) with check (portal_private.can_manage_clients());
create policy powertek_clients_delete_guard on public.clients as restrictive for delete to authenticated using (portal_private.is_admin());

create policy powertek_projects_visible on public.projects for select to authenticated using (portal_private.can_read_project(id));
create policy powertek_projects_read_guard on public.projects as restrictive for select to authenticated using (portal_private.can_read_project(id));
-- Staff can upload to assigned projects, but cannot change client ownership or
-- create/delete projects. Only the administrator changes project metadata.
create policy powertek_projects_insert_guard on public.projects as restrictive for insert to authenticated with check (portal_private.is_admin());
create policy powertek_projects_update_guard on public.projects as restrictive for update to authenticated using (portal_private.is_admin()) with check (portal_private.is_admin());
create policy powertek_projects_delete_guard on public.projects as restrictive for delete to authenticated using (portal_private.is_admin());

-- Restrictive read guards also prevent old permissive policies from exposing
-- another client's poles, measurements, or files.
create policy powertek_poles_read_guard on public.poles as restrictive for select to authenticated using (portal_private.can_read_project(project_id));
create policy powertek_files_read_guard on public.project_files as restrictive for select to authenticated using (portal_private.can_read_project(project_id));
create policy powertek_attachments_read_guard on public.attachments as restrictive for select to authenticated using (exists (select 1 from public.poles p where p.id = pole_id and portal_private.can_read_project(p.project_id)));

-- Staff write policies and guards apply directly to the Supabase API too.
do $$
declare tbl text; access_expr text; operation text;
begin
  foreach tbl in array array['poles','project_files','attachments'] loop
    access_expr := case when tbl = 'attachments' then 'exists (select 1 from public.poles p where p.id = pole_id and portal_private.can_edit_project(p.project_id))' else 'portal_private.can_edit_project(project_id)' end;
    foreach operation in array array['insert','update','delete'] loop
      execute format('create policy %I on public.%I for %s to authenticated %s', 'powertek_' || tbl || '_' || operation, tbl, operation,
        case when operation = 'insert' then 'with check (' || access_expr || ')' when operation = 'delete' then 'using (' || access_expr || ')' else 'using (' || access_expr || ') with check (' || access_expr || ')' end);
      execute format('create policy %I on public.%I as restrictive for %s to authenticated %s', 'powertek_' || tbl || '_' || operation || '_guard', tbl, operation,
        case when operation = 'insert' then 'with check (' || access_expr || ')' when operation = 'delete' then 'using (' || access_expr || ')' else 'using (' || access_expr || ') with check (' || access_expr || ')' end);
    end loop;
  end loop;
end $$;

drop policy if exists project_files_insert_admin on storage.objects;
drop policy if exists project_files_update_admin on storage.objects;
drop policy if exists project_files_delete_admin on storage.objects;
create policy powertek_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'project-files' and portal_private.can_edit_project((storage.foldername(name))[1]));
create policy powertek_storage_update on storage.objects for update to authenticated using (bucket_id = 'project-files' and portal_private.can_edit_project((storage.foldername(name))[1])) with check (bucket_id = 'project-files' and portal_private.can_edit_project((storage.foldername(name))[1]));
create policy powertek_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'project-files' and portal_private.can_edit_project((storage.foldername(name))[1]));
create policy powertek_storage_read_guard on storage.objects as restrictive for select to authenticated using (bucket_id <> 'project-files' or portal_private.can_read_project((storage.foldername(name))[1]));
create policy powertek_storage_insert_guard on storage.objects as restrictive for insert to authenticated with check (bucket_id <> 'project-files' or portal_private.can_edit_project((storage.foldername(name))[1]));
create policy powertek_storage_update_guard on storage.objects as restrictive for update to authenticated using (bucket_id <> 'project-files' or portal_private.can_edit_project((storage.foldername(name))[1])) with check (bucket_id <> 'project-files' or portal_private.can_edit_project((storage.foldername(name))[1]));
create policy powertek_storage_delete_guard on storage.objects as restrictive for delete to authenticated using (bucket_id <> 'project-files' or portal_private.can_edit_project((storage.foldername(name))[1]));
commit;
