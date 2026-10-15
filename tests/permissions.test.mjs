// Run with POWERTEK_PGLITE_MODULE pointing to an installed @electric-sql/pglite
// entry point. No cloud database or credentials are used by these tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.POWERTEK_PGLITE_MODULE).href);
const adminId = '10000000-0000-4000-8000-000000000001';
const staffId = '10000000-0000-4000-8000-000000000002';
const clientId = '10000000-0000-4000-8000-000000000003';
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema portal_private; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create table public.portal_users(id text primary key,supabase_user_id uuid,email text unique,display_name text,role text check(role in ('admin','client')),status text,updated_at timestamptz default now());
create table public.clients(id text primary key,name text);
create table public.projects(id text primary key,client_id text references public.clients(id),name text,updated_at timestamptz default now());
create table public.user_projects(user_id text references public.portal_users(id),project_id text references public.projects(id),primary key(user_id,project_id));
create table public.poles(id text primary key,project_id text references public.projects(id));
create table public.attachments(id text primary key,pole_id text references public.poles(id));
create table public.project_files(id text primary key,project_id text references public.projects(id));
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
insert into public.clients values ('c1','Northline'),('c2','Westline');
insert into public.projects(id,client_id,name) values ('p1','c1','Project 1'),('p2','c2','Project 2');
insert into public.poles values ('pole1','p1'),('pole2','p2');
insert into public.attachments values ('attachment1','pole1'),('attachment2','pole2');
insert into public.project_files values ('file1','p1'),('file2','p2');
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
async function asUser(id) { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`); }
async function save(email,role,assignments,manage=false) { return db.query('select public.save_portal_access($1,$2,$3,$4,$5::jsonb) as id',[email,email.split('@')[0],role,manage,JSON.stringify(assignments)]); }
await asUser(adminId);
await save('staff@example.com','staff',[{projectId:'p1',canUpload:true}],true);
await save('client@example.com','client',[{projectId:'p1',canUpload:true}],true);

test('migration executes and admin access persists', async () => { await asUser(adminId); assert.equal((await db.query('select * from public.projects')).rows.length,2); });
test('atomic assignment changes roll back on an invalid project', async () => {
 await asUser(adminId); await assert.rejects(()=>save('client@example.com','client',[{projectId:'missing'}]));
 assert.equal((await db.query("select project_id from public.user_projects where user_id='client'")).rows[0].project_id,'p1');
});
test('last admin cannot remove their own administrator role', async () => { await asUser(adminId); await assert.rejects(()=>save('admin@example.com','client',[{projectId:'p1'}])); });
test('client only reads assigned projects, poles, attachments, files and storage', async () => {
 await asUser(clientId);
 for(const table of ['projects','poles','attachments','project_files']) assert.equal((await db.query(`select * from public.${table}`)).rows.length,1,table);
 assert.equal((await db.query('select * from storage.objects')).rows.length,1);
 assert.deepEqual((await db.query('select id from public.portal_users')).rows.map(r=>r.id),['client']);
});
test('client cannot upload, escalate role or invoke invitation RPC', async () => {
 await asUser(clientId); await assert.rejects(()=>db.query("insert into public.poles values ('forbidden','p1')"));
 assert.equal((await db.query("update public.portal_users set role='admin' where id='client' returning id")).rows.length,0);
 assert.equal((await db.query("select role from public.portal_users where id='client'")).rows[0].role,'client');
 await assert.rejects(()=>save('attacker@example.com','admin',[]));
 await assert.rejects(()=>db.query("insert into storage.objects values ('forbidden','project-files','p1/image/forbidden.jpg')"));
});
test('staff writes assigned project and manages clients but cannot access others or change ownership', async () => {
 await asUser(staffId); await db.query("insert into public.poles values ('staff-pole','p1')");
 await db.query("insert into public.attachments values ('staff-attachment','staff-pole')");
 await db.query("insert into public.clients values ('c3','New client')");
 await db.query("insert into storage.objects values ('staff-object','project-files','p1/image/staff.jpg')");
 await assert.rejects(()=>db.query("insert into public.poles values ('wrong-project','p2')"));
 await assert.rejects(()=>db.query("update public.poles set project_id='p2' where id='staff-pole'"));
 assert.equal((await db.query("update public.projects set client_id='c3' where id='p1' returning id")).rows.length,0);
 await db.query("select public.touch_portal_project('p1')"); await assert.rejects(()=>db.query("select public.touch_portal_project('p2')"));
});
test('revoked staff upload permission is enforced immediately at database boundary', async () => {
 await asUser(adminId); await save('staff@example.com','staff',[{projectId:'p1',canUpload:false}],false);
 await asUser(staffId); await assert.rejects(()=>db.query("insert into public.poles values ('revoked','p1')"));
 await assert.rejects(()=>db.query("insert into public.clients values ('c4','Forbidden client')"));
});
test('confirmed email links only to its own active invited profile', async () => {
 await asUser(clientId); const result = await db.query('select * from public.link_current_portal_user()'); assert.equal(result.rows[0].id,'client');
 await db.exec(`reset role; insert into auth.users values ('10000000-0000-4000-8000-000000000004','outsider@example.com',now());`);
 await asUser('10000000-0000-4000-8000-000000000004'); assert.equal((await db.query('select * from public.link_current_portal_user()')).rows.length,0);
});
test('anonymous requests have no project or profile access', async () => {
 await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon;");
 assert.equal((await db.query('select * from public.projects')).rows.length,0); assert.equal((await db.query('select * from public.portal_users')).rows.length,0);
 await assert.rejects(()=>db.query("select public.save_portal_access('a@b.com','A','admin',false,'[]')"));
});
test.after(async()=>{ await db.close(); });
