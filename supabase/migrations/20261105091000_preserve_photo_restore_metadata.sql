begin;
-- A photo-only restoration must keep the original legacy measurement JSON.
-- Full spreadsheet/measurement imports retain their existing replacement rules.
create or replace function public.commit_survey_import(p_id uuid)
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
      source_json_filename=excluded.source_json_filename,model_version=excluded.model_version,tool_name=excluded.tool_name,raw_json=case when photo is not null and not exists(select 1 from jsonb_array_elements(batch.files) source where source->>'kind'='spreadsheet' or (source->>'kind'='json' and source->>'poleName'=item->>'poleName')) then public.poles.raw_json else null end,
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

commit;
