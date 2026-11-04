begin;
alter table public.projects add column requires_approval boolean not null default false;
alter table public.projects add column published_at timestamptz;

create function portal_private.can_start_project(p_client_id text) returns boolean
language sql stable security definer set search_path='' as $$
 select portal_private.is_admin() or exists(
  select 1 from public.portal_users u where u.supabase_user_id=auth.uid() and u.status='active' and u.role='staff'
   and (u.permissions->>'manageClients'='true' or exists(select 1 from public.user_projects a join public.projects p on p.id=a.project_id where a.user_id=u.id and a.can_upload and p.client_id=p_client_id and p.status='active'))
 );
$$;
revoke all on function portal_private.can_start_project(text) from public,anon;
grant execute on function portal_private.can_start_project(text) to authenticated;

create or replace function public.save_portal_project(p_project_id text,p_client_id text,p_name text,p_code text,p_location_label text,p_status text)
returns text language plpgsql security definer set search_path='' as $$
declare target_id text; chosen_status text; old_project public.projects%rowtype; profile public.portal_users%rowtype; admin boolean:=portal_private.is_admin();
begin
 select * into profile from public.portal_users where supabase_user_id=auth.uid() and status='active';
 if not found or profile.role not in ('admin','staff') then raise exception 'Project management permission required' using errcode='42501'; end if;
 if p_name is null or length(trim(p_name)) not between 1 and 160 or p_code is null or p_code!~'^[A-Z0-9][A-Z0-9_-]{0,31}$'
  or p_location_label is null or length(p_location_label)>160 or p_status is null or p_status not in ('active','archived') then raise exception 'Invalid project details' using errcode='22023'; end if;
 select status into chosen_status from public.clients where id=p_client_id for share;
 if not found then raise exception 'Client not found' using errcode='P0002'; end if;
 if p_project_id is not null then
  select * into old_project from public.projects where id=p_project_id for update;
  if not found then raise exception 'Project not found' using errcode='P0002'; end if;
  if not admin and (not portal_private.can_edit_project(p_project_id) or p_client_id<>old_project.client_id or p_status<>old_project.status) then raise exception 'Only an administrator can change project ownership or archive a project' using errcode='42501'; end if;
 else
  if not portal_private.can_start_project(p_client_id) then raise exception 'Project creation requires upload access for this client' using errcode='42501'; end if;
 end if;
 if chosen_status<>'active' and (p_project_id is null or old_project.client_id<>p_client_id) then raise exception 'Choose an active client' using errcode='22023'; end if;
 if p_project_id is null then
  if p_status<>'active' then raise exception 'New projects must start active' using errcode='22023'; end if;
  target_id:=gen_random_uuid()::text;
  insert into public.projects(id,client_id,name,code,location_label,status,requires_approval) values(target_id,p_client_id,trim(p_name),p_code,trim(p_location_label),'active',true);
  if profile.role='staff' then insert into public.user_projects(user_id,project_id,can_upload) values(profile.id,target_id,true); end if;
 else
  update public.projects set client_id=p_client_id,name=trim(p_name),code=p_code,location_label=trim(p_location_label),status=p_status where id=p_project_id returning id into target_id;
 end if;
 return target_id;
end;
$$;

-- Existing projects keep their visibility. Newly created projects need an
-- administrator release before clients can read their records or stored files.
create or replace function portal_private.can_read_project(target text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_users u where u.supabase_user_id=auth.uid() and u.status='active' and
  (u.role='admin' or exists(select 1 from public.user_projects a join public.projects p on p.id=a.project_id where a.user_id=u.id and a.project_id=target
   and (u.role='staff' or (u.role='client' and (not p.requires_approval or p.published_at is not null))))));
$$;

create table public.project_releases(id uuid primary key,project_id text not null references public.projects(id),created_by uuid not null,recipient_ids text[] not null,message text not null default '',created_at timestamptz not null default now());
alter table public.project_releases enable row level security;
revoke all on public.project_releases from public,anon,authenticated;
grant select on public.project_releases to authenticated;
create policy releases_editors on public.project_releases for select to authenticated using(portal_private.can_edit_project(project_id));

create table public.portal_notifications(id uuid primary key default gen_random_uuid(),user_id text not null references public.portal_users(id),project_id text not null references public.projects(id),release_id uuid references public.project_releases(id),title text not null,message text not null default '',created_at timestamptz not null default now(),read_at timestamptz,unique(release_id,user_id));
alter table public.portal_notifications enable row level security;
revoke all on public.portal_notifications from public,anon,authenticated;
grant select on public.portal_notifications to authenticated;
grant update(read_at) on public.portal_notifications to authenticated;
create policy notifications_own_read on public.portal_notifications for select to authenticated using(exists(select 1 from public.portal_users u where u.id=user_id and u.supabase_user_id=auth.uid() and u.status='active'));
create policy notifications_own_update on public.portal_notifications for update to authenticated using(exists(select 1 from public.portal_users u where u.id=user_id and u.supabase_user_id=auth.uid() and u.status='active')) with check(exists(select 1 from public.portal_users u where u.id=user_id and u.supabase_user_id=auth.uid() and u.status='active'));

create function portal_private.withdraw_project_release() returns trigger
language plpgsql security definer set search_path='' as $$
declare target text;
begin
 if tg_table_name in ('poles','project_files') then
  target:=case when tg_op='DELETE' then old.project_id else new.project_id end;
 else
  select project_id into target from public.poles where id=case when tg_op='DELETE' then old.pole_id else new.pole_id end;
 end if;
 update public.projects set published_at=null where id=target and requires_approval and published_at is not null;
 return coalesce(new,old);
end;
$$;
create trigger withdraw_pole_release after insert or update or delete on public.poles for each row execute function portal_private.withdraw_project_release();
create trigger withdraw_source_file_release after insert or update or delete on public.project_files for each row execute function portal_private.withdraw_project_release();
create trigger withdraw_attachment_release after insert or update or delete on public.attachments for each row execute function portal_private.withdraw_project_release();

create function public.project_workflow_context(p_project_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.projects%rowtype; recipients jsonb; counts jsonb;
begin
 if not portal_private.can_edit_project(p_project_id) then raise exception 'Project edit permission required' using errcode='42501'; end if;
 select * into p from public.projects where id=p_project_id;
 if not found then raise exception 'Project not found' using errcode='22023'; end if;
 select jsonb_build_object('total',count(*),'uploaded',count(*) filter(where review_stage in ('draft','uploaded')),'needsReview',count(*) filter(where review_stage='needs_review'),'approved',count(*) filter(where review_stage in ('approved','delivered')),
  'missingPhotos',count(*) filter(where image_key is null or not exists(select 1 from storage.objects o where o.bucket_id='project-files' and o.name=poles.image_key)),
  'missingMeasurements',count(*) filter(where not exists(select 1 from public.attachments a where a.pole_id=poles.id))) into counts from public.poles where project_id=p_project_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',u.display_name,'email',u.email) order by u.display_name),'[]') into recipients from public.portal_users u where u.role='client' and u.status='active'
  and (portal_private.is_admin() or exists(select 1 from public.user_projects a where a.project_id=p_project_id and a.user_id=u.id));
 return jsonb_build_object('project',jsonb_build_object('id',p.id,'name',p.name,'updatedAt',p.updated_at,'publishedAt',p.published_at,'status',p.status),'counts',counts,'recipients',recipients,'admin',portal_private.is_admin());
end;
$$;

create function public.advance_project_workflow(p_project_id text,p_action text,p_expected_updated_at timestamptz,p_request_id uuid,p_recipient_ids text[] default '{}',p_message text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.projects%rowtype; pole public.poles%rowtype; actor public.portal_users%rowtype; recipient text; ids text[]; prior public.project_releases%rowtype; total integer;
begin
 if not portal_private.can_edit_project(p_project_id) then raise exception 'Project edit permission required' using errcode='42501'; end if;
 select * into actor from public.portal_users where supabase_user_id=auth.uid() and status='active';
 perform pg_advisory_xact_lock(hashtextextended(p_project_id,220026));
 select * into p from public.projects where id=p_project_id for update;
 if not found or p.status<>'active' then raise exception 'Choose an active project' using errcode='22023'; end if;
 if p_action not in ('submit','approve','release') or p_action is null or p_message is null or length(p_message)>1000 then raise exception 'Invalid project action' using errcode='22023'; end if;
 if p_action<>'submit' and not portal_private.is_admin() then raise exception 'Administrator approval is required before sharing' using errcode='42501'; end if;
 if p_action='release' then
  select array_agg(distinct x order by x) into ids from unnest(p_recipient_ids) x;
  if coalesce(cardinality(ids),0) not between 1 and 100 or p_request_id is null then raise exception 'Select at least one client account' using errcode='22023'; end if;
  select * into prior from public.project_releases where id=p_request_id;
  if found then
   if prior.project_id<>p_project_id or prior.created_by<>auth.uid() or prior.recipient_ids<>ids or prior.message<>trim(p_message) then raise exception 'This release identifier was already used' using errcode='22023'; end if;
   return jsonb_build_object('released',true,'alreadyCompleted',true);
  end if;
 end if;
 if p.updated_at is distinct from p_expected_updated_at then raise exception 'Project changed. Refresh the workflow before continuing.' using errcode='40001'; end if;
 select count(*) into total from public.poles where project_id=p_project_id;
 if total=0 then raise exception 'Upload project records before submitting for review' using errcode='22023'; end if;
 if p_action='submit' then
  perform set_config('powertek.review_note','Submitted for administrator review.',true);
  for pole in select * from public.poles where project_id=p_project_id and review_stage in ('draft','uploaded') order by id for update loop
   if pole.review_stage='draft' then update public.poles set review_stage='uploaded' where id=pole.id; end if;
   update public.poles set review_stage='needs_review' where id=pole.id;
  end loop;
  insert into public.portal_notifications(user_id,project_id,title,message) select id,p_project_id,'Project ready for review',p.name||' was submitted by '||actor.display_name from public.portal_users where role='admin' and status='active' and id<>actor.id;
 elsif p_action='approve' then
  if exists(select 1 from public.poles where project_id=p_project_id and review_stage in ('draft','uploaded')) then raise exception 'Submit all records for review before approving' using errcode='22023'; end if;
  perform set_config('powertek.review_note','Project reviewed and approved by administrator.',true);
  update public.poles set review_stage='approved' where project_id=p_project_id and review_stage='needs_review';
 else
  if exists(select 1 from public.poles where project_id=p_project_id and review_stage not in ('approved','delivered')) then raise exception 'Approve every record before notifying clients' using errcode='22023'; end if;
  foreach recipient in array ids loop
   if not exists(select 1 from public.portal_users where id=recipient and role='client' and status='active') then raise exception 'Choose active client accounts only' using errcode='22023'; end if;
  end loop;
  perform set_config('powertek.review_note','Released to client accounts by administrator.',true);
  update public.poles set review_stage='delivered' where project_id=p_project_id and review_stage='approved';
  insert into public.project_releases(id,project_id,created_by,recipient_ids,message) values(p_request_id,p_project_id,auth.uid(),ids,trim(p_message));
  foreach recipient in array ids loop
   insert into public.user_projects(user_id,project_id,can_upload) values(recipient,p_project_id,false) on conflict(user_id,project_id) do nothing;
   insert into public.portal_notifications(user_id,project_id,release_id,title,message) values(recipient,p_project_id,p_request_id,'Project ready to view and download',p.name||case when length(trim(p_message))>0 then E'\n'||trim(p_message) else '' end);
  end loop;
  update public.projects set requires_approval=true,published_at=clock_timestamp() where id=p_project_id;
 end if;
 update public.projects set updated_at=clock_timestamp() where id=p_project_id;
 perform portal_private.record_audit(p_project_id,'project',p_project_id,'project_'||p_action,jsonb_build_object('name',p.name,'recipients',coalesce(cardinality(ids),0)));
 return jsonb_build_object('saved',true,'released',p_action='release');
end;
$$;

-- Return assigned project metadata even while an update is under review;
-- working survey records remain protected by can_read_project and table RLS.
create function public.list_client_projects() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'code',p.code,'client_id',p.client_id,'client_name',c.name,'location_label',p.location_label,'status',p.status,'can_view',not p.requires_approval or p.published_at is not null,'published_at',p.published_at) order by p.name),'[]')
 from public.projects p join public.clients c on c.id=p.client_id join public.user_projects a on a.project_id=p.id join public.portal_users u on u.id=a.user_id where u.supabase_user_id=auth.uid() and u.role='client' and u.status='active';
$$;
revoke all on function public.project_workflow_context(text),public.advance_project_workflow(text,text,timestamptz,uuid,text[],text),public.list_client_projects() from public,anon;
grant execute on function public.project_workflow_context(text),public.advance_project_workflow(text,text,timestamptz,uuid,text[],text),public.list_client_projects() to authenticated;
notify pgrst,'reload schema';
commit;
