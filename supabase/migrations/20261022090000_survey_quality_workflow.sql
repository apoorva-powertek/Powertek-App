begin;

alter table public.poles add column review_stage text not null default 'uploaded'
  check (review_stage in ('draft','uploaded','needs_review','approved','delivered'));
-- Existing data has been uploaded, but has never been formally reviewed.
alter table public.poles alter column review_stage set default 'draft';

create table public.survey_imports (
  id uuid primary key,
  project_id text not null references public.projects(id),
  created_by uuid not null,
  source_name text not null,
  status text not null default 'pending' check (status in ('pending','completed')),
  payload jsonb not null,
  files jsonb not null,
  result jsonb,
  base_revision timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.survey_imports enable row level security;
revoke all on public.survey_imports from anon, authenticated;
grant select on public.survey_imports to authenticated;
create policy imports_editors on public.survey_imports for select to authenticated
  using (portal_private.can_edit_project(project_id));

create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_name text not null,
  project_id text,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  details jsonb not null default '{}'
);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from public, anon, authenticated;
grant select on public.audit_events to authenticated;
create policy audit_editors on public.audit_events for select to authenticated
  using (portal_private.is_admin() or (project_id is not null and portal_private.can_edit_project(project_id)));

-- Staged source files are visible to editors until a successful commit links
-- them to the project. Published originals cannot be overwritten in place.
create policy staged_import_read_guard on storage.objects as restrictive for select to authenticated
  using (bucket_id<>'project-files' or split_part(name,'/',2)<>'imports'
    or portal_private.can_edit_project(split_part(name,'/',1))
    or exists(select 1 from public.project_files f where f.object_key=storage.objects.name));
create policy published_original_update_guard on storage.objects as restrictive for update to authenticated
  using (bucket_id<>'project-files' or (not exists(select 1 from public.project_files f where f.object_key=storage.objects.name)
    and not exists(select 1 from public.poles p where p.image_key=storage.objects.name)));
create policy published_original_delete_guard on storage.objects as restrictive for delete to authenticated
  using (bucket_id<>'project-files' or (not exists(select 1 from public.project_files f where f.object_key=storage.objects.name)
    and not exists(select 1 from public.poles p where p.image_key=storage.objects.name)));

create function portal_private.record_audit(p_project text, p_type text, p_id text, p_action text, p_details jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_events(actor_id,actor_name,project_id,entity_type,entity_id,action,details)
  values(auth.uid(),coalesce((select display_name from public.portal_users where supabase_user_id=auth.uid()),'System'),p_project,p_type,p_id,p_action,p_details);
$$;
revoke all on function portal_private.record_audit(text,text,text,text,jsonb) from public,anon,authenticated;

create function portal_private.audit_management_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare before_row jsonb; after_row jsonb; entity jsonb; project text;
begin
  before_row := case when tg_op <> 'INSERT' then to_jsonb(old) else '{}'::jsonb end;
  after_row := case when tg_op <> 'DELETE' then to_jsonb(new) else '{}'::jsonb end;
  -- Store only useful management fields; never raw survey payloads or credentials.
  select coalesce(jsonb_object_agg(key,value),'{}') into before_row from jsonb_each(before_row)
    where key in ('name','code','status','role','display_name','permissions','client_id','user_id','project_id','can_upload','invitation_status');
  select coalesce(jsonb_object_agg(key,value),'{}') into after_row from jsonb_each(after_row)
    where key in ('name','code','status','role','display_name','permissions','client_id','user_id','project_id','can_upload','invitation_status');
  entity := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  project := case when tg_table_name='projects' then entity->>'id' when tg_table_name='user_projects' then entity->>'project_id' else null end;
  if before_row is distinct from after_row then
    perform portal_private.record_audit(project,tg_table_name,coalesce(entity->>'id',entity->>'user_id'),lower(tg_op),jsonb_build_object('before',before_row,'after',after_row));
  end if;
  return coalesce(new,old);
end;
$$;
do $$ declare tbl text; begin
  foreach tbl in array array['clients','projects','portal_users','user_projects'] loop
    execute format('create trigger audit_management after insert or update or delete on public.%I for each row execute function portal_private.audit_management_change()',tbl);
  end loop;
end $$;

-- Review fields must be protected even when accessed through the Supabase API.
create function portal_private.guard_survey_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' and (to_jsonb(new)-'review_stage'-'updated_at') is distinct from (to_jsonb(old)-'review_stage'-'updated_at') then
    update public.projects set updated_at=clock_timestamp() where id=new.project_id;
    new.review_stage := case when old.review_stage='draft' and new.review_stage='draft' then 'draft' else 'uploaded' end;
    perform set_config('powertek.review_note','Survey data changed; review required again.',true);
  end if;
  if tg_op='INSERT' then
    if new.review_stage not in ('draft','uploaded') then raise exception 'New surveys must start as draft or uploaded' using errcode='42501'; end if;
  elsif new.review_stage is distinct from old.review_stage then
    if new.review_stage='uploaded' and old.review_stage<>'draft' and length(trim(coalesce(current_setting('powertek.review_note',true),'')))=0 then
      raise exception 'Add a reason for returning this survey to uploaded' using errcode='22023';
    end if;
    if new.review_stage in ('approved','delivered') and not portal_private.is_admin() then
      raise exception 'Administrator review required' using errcode='42501';
    end if;
    if not ((old.review_stage='draft' and new.review_stage='uploaded')
      or (old.review_stage='uploaded' and new.review_stage='needs_review')
      or (old.review_stage='needs_review' and new.review_stage in ('uploaded','approved'))
      or (old.review_stage='approved' and new.review_stage in ('uploaded','delivered'))
      or (old.review_stage='delivered' and new.review_stage='uploaded')) then
      raise exception 'Invalid review transition' using errcode='22023';
    end if;
    if new.review_stage='approved' and (new.image_key is null
      or not exists(select 1 from storage.objects where bucket_id='project-files' and name=new.image_key)
      or not exists(select 1 from public.attachments where pole_id=new.id)
      or exists(select 1 from public.attachments where pole_id=new.id and (not(height_m>0 and height_m<=100) or length(trim(name))=0))) then
      raise exception 'Upload a photo and measured attachments before approval' using errcode='22023';
    end if;
    update public.projects set updated_at=clock_timestamp() where id=new.project_id;
    perform portal_private.record_audit(new.project_id,'survey',new.id,'review_changed',jsonb_build_object('pole',new.pole_name,'from',old.review_stage,'to',new.review_stage,'note',left(coalesce(current_setting('powertek.review_note',true),''),1000)));
  end if;
  return new;
end;
$$;
create trigger guard_survey_review before insert or update on public.poles for each row execute function portal_private.guard_survey_review();

create function portal_private.invalidate_attachment_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('powertek.review_note','Attachment data changed; review required again.',true);
  if tg_op<>'INSERT' then
    update public.poles set review_stage='uploaded',updated_at=clock_timestamp() where id=old.pole_id and review_stage in ('needs_review','approved','delivered');
  end if;
  if tg_op<>'DELETE' then
    update public.poles set review_stage='uploaded',updated_at=clock_timestamp() where id=new.pole_id and review_stage in ('needs_review','approved','delivered');
  end if;
  return coalesce(new,old);
end;
$$;
create trigger invalidate_attachment_review after insert or update or delete on public.attachments for each row execute function portal_private.invalidate_attachment_review();

create function public.transition_survey_review(p_pole_id text,p_stage text,p_expected_updated_at timestamptz,p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare pole public.poles%rowtype;
begin
  select * into pole from public.poles where id=p_pole_id for update;
  if not found or not portal_private.can_edit_project(pole.project_id) then raise exception 'Project edit permission required' using errcode='42501'; end if;
  if pole.updated_at is distinct from p_expected_updated_at then raise exception 'Survey changed. Refresh before reviewing.' using errcode='40001'; end if;
  if p_stage not in ('uploaded','needs_review','approved','delivered') or length(p_note)>1000 then raise exception 'Invalid review details' using errcode='22023'; end if;
  if p_stage='uploaded' and pole.review_stage<>'draft' and length(trim(p_note))=0 then raise exception 'Add a reason for returning this survey to uploaded' using errcode='22023'; end if;
  perform set_config('powertek.review_note',trim(p_note),true);
  update public.poles set review_stage=p_stage,updated_at=clock_timestamp() where id=p_pole_id;
  update public.projects set updated_at=clock_timestamp() where id=pole.project_id;
end;
$$;

create function public.prepare_survey_import(p_id uuid,p_project_id text,p_source_name text,p_poles jsonb,p_files jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare revision timestamptz; existing public.survey_imports%rowtype; item jsonb; names text[] := '{}'; keys text[] := '{}'; label text;
begin
  if not portal_private.can_edit_project(p_project_id) then raise exception 'Project upload permission required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_project_id,220026));
  select updated_at into revision from public.projects where id=p_project_id and status='active' for update;
  if not found then raise exception 'Choose an active project' using errcode='22023'; end if;
  select * into existing from public.survey_imports where id=p_id;
  if found then
    if existing.project_id<>p_project_id or existing.created_by<>auth.uid() or existing.payload<>p_poles or existing.files<>p_files then raise exception 'Import identifier already used' using errcode='22023'; end if;
    return jsonb_build_object('id',existing.id,'status',existing.status);
  end if;
  if jsonb_typeof(p_poles) is distinct from 'array' or jsonb_array_length(p_poles) not between 1 and 5000
    or jsonb_typeof(p_files) is distinct from 'array' or jsonb_array_length(p_files) not between 1 and 10000
    or octet_length(p_poles::text)>3000000 or length(p_source_name) not between 1 and 180 then raise exception 'Invalid import package' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_poles) loop
    label:=trim(item->>'poleName');
    if label is null or length(label) not between 1 and 120 or label=any(names)
      or jsonb_typeof(item->'latitude') is distinct from 'number' or (item->>'latitude')::numeric not between -90 and 90
      or jsonb_typeof(item->'longitude') is distinct from 'number' or (item->>'longitude')::numeric not between -180 and 180
      or jsonb_typeof(item->'elevationM') is distinct from 'number'
      or jsonb_typeof(item->'attachments') is distinct from 'array' or jsonb_array_length(item->'attachments')>500 then
      raise exception 'Invalid or duplicate pole record' using errcode='22023'; end if;
    names:=array_append(names,label);
  end loop;
  for item in select value from jsonb_array_elements(p_files) loop
    label:=item->>'objectKey';
    if label is null or label not like p_project_id||'/imports/'||p_id::text||'/%' or label=any(keys)
      or item->>'kind' not in ('image','json','spreadsheet') or item->>'kind' is null
      or length(item->>'name') not between 1 and 180 or item->>'name' is null
      or jsonb_typeof(item->'size') is distinct from 'number' or (item->>'size')::bigint not between 1 and 52428800
      or (item->>'poleName' is not null and not (item->>'poleName'=any(names))) then
      raise exception 'Invalid file manifest' using errcode='22023'; end if;
    keys:=array_append(keys,label);
  end loop;
  insert into public.survey_imports(id,project_id,created_by,source_name,payload,files,base_revision)
    values(p_id,p_project_id,auth.uid(),p_source_name,p_poles,p_files,revision);
  perform portal_private.record_audit(p_project_id,'import',p_id::text,'import_prepared',jsonb_build_object('source',p_source_name,'poles',jsonb_array_length(p_poles),'files',jsonb_array_length(p_files)));
  return jsonb_build_object('id',p_id,'status','pending');
end;
$$;

create function public.commit_survey_import(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare batch public.survey_imports%rowtype; item jsonb; attachment jsonb; file jsonb; saved_pole_id text; photo jsonb; attachment_count integer:=0; revision timestamptz; idx integer;
begin
  select * into batch from public.survey_imports where id=p_id;
  if not found or not portal_private.can_edit_project(batch.project_id) then raise exception 'Project upload permission required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(batch.project_id,220026));
  select * into batch from public.survey_imports where id=p_id for update;
  if batch.status='completed' then return batch.result || jsonb_build_object('alreadyCompleted',true); end if;
  select updated_at into revision from public.projects where id=batch.project_id and status='active' for update;
  if not found or revision is distinct from batch.base_revision then raise exception 'Project changed since validation. Validate the package again.' using errcode='40001'; end if;
  for file in select value from jsonb_array_elements(batch.files) loop
    if not exists(select 1 from storage.objects where bucket_id='project-files' and name=file->>'objectKey'
      and (metadata->>'size')::bigint=(file->>'size')::bigint) then
      raise exception 'Some source files are missing. Retry the upload.' using errcode='22023'; end if;
  end loop;
  perform set_config('powertek.review_note','Survey replaced by a new import; review required again.',true);
  for item in select value from jsonb_array_elements(batch.payload) loop
    select value into photo from jsonb_array_elements(batch.files) where value->>'kind'='image' and value->>'poleName'=item->>'poleName' limit 1;
    insert into public.poles(id,project_id,pole_name,normalized_name,latitude,longitude,elevation_m,top_height_m,pole_height_ft,pole_class,status,
      image_key,image_filename,image_width,image_height,source_json_filename,model_version,tool_name,base_x,base_y,top_x,top_y,raw_json,review_stage)
    values(gen_random_uuid()::text,batch.project_id,item->>'poleName',regexp_replace(upper(item->>'poleName'),'[^A-Z0-9]','','g'),
      (item->>'latitude')::float8,(item->>'longitude')::float8,(item->>'elevationM')::float8,(item->>'topHeightM')::float8,(item->>'poleHeightFt')::float8,item->>'poleClass',
      case when photo is not null or jsonb_array_length(item->'attachments')>0 then 'complete' else 'location_only' end,
      photo->>'objectKey',photo->>'name',(item->>'imageWidth')::bigint,(item->>'imageHeight')::bigint,item->>'sourceJsonFilename',item->>'modelVersion',item->>'toolName',
      (item->>'baseX')::float8,(item->>'baseY')::float8,(item->>'topX')::float8,(item->>'topY')::float8,null,'uploaded')
    on conflict(project_id,pole_name) do update set latitude=excluded.latitude,longitude=excluded.longitude,elevation_m=excluded.elevation_m,
      top_height_m=excluded.top_height_m,pole_height_ft=excluded.pole_height_ft,pole_class=excluded.pole_class,
      status=case when coalesce(excluded.image_key,public.poles.image_key) is not null or jsonb_array_length(item->'attachments')>0 then 'complete' else 'location_only' end,
      image_key=coalesce(excluded.image_key,public.poles.image_key),image_filename=coalesce(excluded.image_filename,public.poles.image_filename),
      image_width=coalesce(excluded.image_width,public.poles.image_width),image_height=coalesce(excluded.image_height,public.poles.image_height),
      source_json_filename=excluded.source_json_filename,model_version=excluded.model_version,tool_name=excluded.tool_name,raw_json=null,
      base_x=excluded.base_x,base_y=excluded.base_y,top_x=excluded.top_x,top_y=excluded.top_y,review_stage='uploaded',updated_at=clock_timestamp()
    returning id into saved_pole_id;
    delete from public.attachments where attachments.pole_id=saved_pole_id;
    idx:=0;
    for attachment in select value from jsonb_array_elements(item->'attachments') loop
      if jsonb_typeof(attachment->'heightM') is distinct from 'number' or (attachment->>'heightM')::numeric not between 0.001 and 100 then
        raise exception 'Invalid attachment height' using errcode='22023'; end if;
      insert into public.attachments(id,pole_id,name,height_m,photo_x,photo_y,side,color,kind,sort_order)
        values(gen_random_uuid()::text,saved_pole_id,coalesce(nullif(trim(attachment->>'name'),''),'Attachment'),(attachment->>'heightM')::float8,
          (attachment->>'photoX')::float8,(attachment->>'photoY')::float8,case when attachment->>'side'='left' then 'left' else 'right' end,
          attachment->>'color',coalesce(attachment->>'kind','attachment'),idx);
      idx:=idx+1; attachment_count:=attachment_count+1;
    end loop;
  end loop;
  for file in select value from jsonb_array_elements(batch.files) loop
    select id into saved_pole_id from public.poles where project_id=batch.project_id and pole_name=file->>'poleName';
    insert into public.project_files(id,project_id,pole_id,kind,object_key,filename,content_type,size_bytes)
      values(gen_random_uuid()::text,batch.project_id,saved_pole_id,file->>'kind',file->>'objectKey',file->>'name',coalesce(file->>'type','application/octet-stream'),(file->>'size')::bigint);
  end loop;
  update public.survey_imports set status='completed',completed_at=clock_timestamp(),result=jsonb_build_object('importedPoles',jsonb_array_length(batch.payload),'importedAttachments',attachment_count) where id=p_id;
  perform portal_private.record_audit(batch.project_id,'import',p_id::text,'import_completed',jsonb_build_object('source',batch.source_name,'poles',jsonb_array_length(batch.payload),'attachments',attachment_count,'files',jsonb_array_length(batch.files)));
  update public.projects set updated_at=clock_timestamp() where id=batch.project_id;
  return jsonb_build_object('importedPoles',jsonb_array_length(batch.payload),'importedAttachments',attachment_count);
end;
$$;

revoke all on function public.transition_survey_review(text,text,timestamptz,text),public.prepare_survey_import(uuid,text,text,jsonb,jsonb),public.commit_survey_import(uuid) from public,anon;
grant execute on function public.transition_survey_review(text,text,timestamptz,text),public.prepare_survey_import(uuid,text,text,jsonb,jsonb),public.commit_survey_import(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
