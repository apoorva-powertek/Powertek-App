import {readFile} from "node:fs/promises";
import {createPermissionDatabase} from "./permission-fixture.mjs";
export async function createSurveyDatabase(){
const db=await createPermissionDatabase();
await db.exec(`
alter table public.projects add column description text default '';
alter table storage.objects add column metadata jsonb;
alter table public.poles add column pole_name text,add column normalized_name text,add column latitude float8,add column longitude float8,add column elevation_m float8,add column top_height_m float8,add column pole_height_ft float8,add column pole_class text,add column status text default 'location_only',add column image_key text,add column image_filename text,add column image_width bigint,add column image_height bigint,add column source_json_filename text,add column model_version text,add column tool_name text,add column base_x float8,add column base_y float8,add column top_x float8,add column top_y float8,add column raw_json text,add unique(project_id,pole_name);
alter table public.attachments add column name text not null default 'Fixture',add column height_m float8 not null default 1,add column photo_x float8,add column photo_y float8,add column side text not null default 'right',add column color text,add column kind text not null default 'attachment',add column sort_order bigint not null default 0;
alter table public.project_files add column pole_id text,add column kind text,add column object_key text,add column filename text,add column content_type text,add column size_bytes bigint;
update public.poles set pole_name=id,normalized_name=upper(id),latitude=1,longitude=2,elevation_m=3;
`);
await db.exec(await readFile(new URL('../supabase/migrations/20261022090000_survey_quality_workflow.sql',import.meta.url),'utf8'));
return db;
}
