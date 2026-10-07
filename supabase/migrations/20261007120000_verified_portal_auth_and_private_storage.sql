create or replace function public.link_current_portal_user()
returns table (id text, email text, display_name text, role text, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  verified_email text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select lower(u.email)
    into verified_email
    from auth.users u
   where u.id = current_user_id
     and u.email_confirmed_at is not null;

  if verified_email is null then
    raise exception 'Confirm your email before requesting portal access' using errcode = '42501';
  end if;

  update public.portal_users pu
     set supabase_user_id = current_user_id,
         updated_at = now()
   where lower(pu.email) = verified_email
     and pu.supabase_user_id is null
     and pu.status = 'active';

  return query
  select pu.id, pu.email, pu.display_name, pu.role, pu.status
    from public.portal_users pu
   where pu.supabase_user_id = current_user_id
     and pu.status = 'active';
end;
$$;

revoke all on function public.link_current_portal_user() from public, anon;
grant execute on function public.link_current_portal_user() to authenticated;
comment on function public.link_current_portal_user() is 'Links the current authenticated Supabase user only to an active, unlinked portal account matching the email confirmed by Supabase Auth.';

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 524288000)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists project_files_read_assigned on storage.objects;
create policy project_files_read_assigned
on storage.objects for select to authenticated
using (
  bucket_id = 'project-files'
  and (portal_private.is_admin() or portal_private.can_read_project((storage.foldername(name))[1]))
);

drop policy if exists project_files_insert_admin on storage.objects;
create policy project_files_insert_admin
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-files'
  and portal_private.is_admin()
  and (storage.foldername(name))[1] is not null
);

drop policy if exists project_files_update_admin on storage.objects;
create policy project_files_update_admin
on storage.objects for update to authenticated
using (bucket_id = 'project-files' and portal_private.is_admin())
with check (bucket_id = 'project-files' and portal_private.is_admin());

drop policy if exists project_files_delete_admin on storage.objects;
create policy project_files_delete_admin
on storage.objects for delete to authenticated
using (bucket_id = 'project-files' and portal_private.is_admin());

