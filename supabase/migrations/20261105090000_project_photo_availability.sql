begin;
create function public.project_photo_availability(p_project_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not portal_private.can_read_project(p_project_id) then raise exception 'Project access required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('pole_id',p.id,'available',p.image_key is not null and exists(select 1 from storage.objects o where o.bucket_id='project-files' and o.name=p.image_key and split_part(o.name,'/',1)=p_project_id))),'[]'::jsonb) into result from public.poles p where p.project_id=p_project_id;
 return result;
end;
$$;
revoke all on function public.project_photo_availability(text) from public,anon;
grant execute on function public.project_photo_availability(text) to authenticated;
notify pgrst,'reload schema';
commit;
