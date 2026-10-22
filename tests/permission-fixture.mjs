import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.env.POWERTEK_PGLITE_MODULE).href);
export const adminId = '10000000-0000-4000-8000-000000000001';
export const staffId = '10000000-0000-4000-8000-000000000002';
export const clientId = '10000000-0000-4000-8000-000000000003';
export async function createPermissionDatabase() {
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema portal_private; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create table public.portal_users(id text primary key,supabase_user_id uuid,email text unique,display_name text,role text check(role in ('admin','client')),status text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.clients(id text primary key,name text not null,code text not null unique,status text not null default 'active',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.projects(id text primary key,client_id text references public.clients(id),name text,code text not null,status text not null default 'active',location_label text default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(client_id,code));
create table public.user_projects(user_id text references public.portal_users(id),project_id text references public.projects(id),assigned_at timestamptz not null default now(),primary key(user_id,project_id));
create table public.poles(id text primary key,project_id text references public.projects(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.attachments(id text primary key,pole_id text references public.poles(id));
create table public.project_files(id text primary key,project_id text references public.projects(id),created_at timestamptz not null default now());
create table storage.objects(id text primary key,bucket_id text,name text);
alter table storage.objects enable row level security;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
create function portal_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.portal_users where supabase_user_id=auth.uid() and role='admin' and status='active') $$;
create function portal_private.can_read_project(target text) returns boolean language sql stable security definer set search_path='' as $$ select portal_private.is_admin() $$;
grant usage on schema public,auth,portal_private,storage to authenticated,anon;
grant all on all tables in schema public,storage to authenticated,anon;
grant execute on all functions in schema auth,portal_private,storage to authenticated,anon;
insert into auth.users values ('${adminId}','admin@example.com',now()),('${staffId}','staff@example.com',now()),('${clientId}','client@example.com',now());
insert into public.portal_users(id,supabase_user_id,email,display_name,role,status) values ('admin','${adminId}','admin@example.com','Admin','admin','active'),('staff','${staffId}','staff@example.com','Staff','client','active'),('client','${clientId}','client@example.com','Client','client','active');
insert into public.clients(id,name,code) values ('c1','Northline','NORTH'),('c2','Westline','WEST');
insert into public.projects(id,client_id,name,code) values ('p1','c1','Project 1','P1'),('p2','c2','Project 2','P2');
insert into public.poles(id,project_id) values ('pole1','p1'),('pole2','p2');
insert into public.attachments values ('attachment1','pole1'),('attachment2','pole2');
insert into public.project_files(id,project_id) values ('file1','p1'),('file2','p2');
insert into storage.objects values ('object1','project-files','p1/image/one.jpg'),('object2','project-files','p2/image/two.jpg');
-- Deliberately permissive old policies: new guards must still isolate users.
create policy legacy_public_projects on public.projects for all to anon using(true) with check(true);
create policy legacy_public_profiles on public.portal_users for all to anon using(true) with check(true);
create policy old_profiles on public.portal_users for all to authenticated using(true) with check(true);
create policy old_assignments on public.user_projects for all to authenticated using(true) with check(true);
create policy old_clients on public.clients for all to authenticated using(true) with check(true);
create policy old_projects on public.projects for all to authenticated using(true) with check(true);
create policy old_poles on public.poles for all to authenticated using(true) with check(true);
create policy old_attachments on public.attachments for all to authenticated using(true) with check(true);
create policy old_files on public.project_files for all to authenticated using(true) with check(true);
create policy old_storage on storage.objects for all to authenticated using(true) with check(true);
`);
await db.exec(await readFile(new URL('../supabase/migrations/20261007120000_verified_portal_auth_and_private_storage.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20261012090000_invites_and_staff_permissions.sql',import.meta.url),'utf8'));
// Model the imported live schema: all legacy timestamps are required but
// originally had no defaults. New management operations must survive that shape.
for (const [table,column] of [['clients','created_at'],['clients','updated_at'],['projects','created_at'],['projects','updated_at'],['portal_users','created_at'],['portal_users','updated_at'],['user_projects','assigned_at'],['poles','created_at'],['poles','updated_at'],['project_files','created_at']]) {
 await db.exec(`alter table public.${table} alter column ${column} drop default`);
}
await db.exec(await readFile(new URL('../supabase/migrations/20261016090000_management_flow_and_defaults.sql',import.meta.url),'utf8'));
return db;
}
