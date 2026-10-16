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
 await asUser(clientId); await assert.rejects(()=>db.query("insert into public.poles(id,project_id) values ('forbidden','p1')"));
 assert.equal((await db.query("update public.portal_users set role='admin' where id='client' returning id")).rows.length,0);
 assert.equal((await db.query("select role from public.portal_users where id='client'")).rows[0].role,'client');
 await assert.rejects(()=>save('attacker@example.com','admin',[]));
 await assert.rejects(()=>db.query("insert into storage.objects values ('forbidden','project-files','p1/image/forbidden.jpg')"));
});
test('staff writes assigned project and manages clients but cannot access others or change ownership', async () => {
 await asUser(staffId); await db.query("insert into public.poles(id,project_id) values ('staff-pole','p1')");
 await db.query("insert into public.attachments values ('staff-attachment','staff-pole')");
 await db.query("insert into public.clients(id,name,code) values ('c3','New client','NEW')");
 await db.query("insert into storage.objects values ('staff-object','project-files','p1/image/staff.jpg')");
 await assert.rejects(()=>db.query("insert into public.poles(id,project_id) values ('wrong-project','p2')"));
 await assert.rejects(()=>db.query("update public.poles set project_id='p2' where id='staff-pole'"));
 assert.equal((await db.query("update public.projects set client_id='c3' where id='p1' returning id")).rows.length,0);
 await db.query("select public.touch_portal_project('p1')"); await assert.rejects(()=>db.query("select public.touch_portal_project('p2')"));
});
test('revoked staff upload permission is enforced immediately at database boundary', async () => {
 await asUser(adminId); await save('staff@example.com','staff',[{projectId:'p1',canUpload:false}],false);
 await asUser(staffId); await assert.rejects(()=>db.query("insert into public.poles(id,project_id) values ('revoked','p1')"));
 await assert.rejects(()=>db.query("insert into public.clients(id,name,code) values ('c4','Forbidden client','FORBIDDEN')"));
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
test('create a client and project with omitted legacy timestamps', async () => {
 await asUser(adminId);
 const client = (await db.query("select public.save_portal_client(null,'Flow client','FLOW','active') as id")).rows[0].id;
 const project = (await db.query("select public.save_portal_project(null,$1,'Flow project','FLOW-PROJECT','Test location','active') as id",[client])).rows[0].id;
 const row=(await db.query('select created_at,updated_at from public.projects where id=$1',[project])).rows[0];
 assert.ok(row.created_at && row.updated_at);
 await assert.rejects(()=>db.query("select public.save_portal_client(null,'Duplicate','FLOW','active')"), /unique/);
 await db.query("select public.save_portal_client($1,'Updated client','FLOW','archived')",[client]);
 await assert.rejects(()=>db.query("select public.save_portal_project(null,$1,'Blocked','BLOCKED','','active')",[client]), /active client/);
 await db.query("select public.save_portal_project($1,$2,'Renamed project','FLOW-PROJECT','','archived')",[project,client]);
 assert.equal((await db.query('select status from public.projects where id=$1',[project])).rows[0].status,'archived');
});
test('invite a client with no projects, then assign and remove access later', async () => {
 await asUser(adminId);
 const id=(await save('unassigned@example.com','client',[])).rows[0].id;
 assert.equal((await db.query('select * from public.user_projects where user_id=$1',[id])).rows.length,0);
 assert.ok((await db.query('select created_at from public.portal_users where id=$1',[id])).rows[0].created_at);
 await db.exec("reset role; insert into auth.users values ('10000000-0000-4000-8000-000000000005','unassigned@example.com',now())");
 await asUser('10000000-0000-4000-8000-000000000005');
 await db.query('select * from public.link_current_portal_user()');
 assert.equal((await db.query('select * from public.projects')).rows.length,0);
 await asUser(adminId);await save('unassigned@example.com','client',[{projectId:'p1'}]);
 assert.ok((await db.query('select assigned_at from public.user_projects where user_id=$1',[id])).rows[0].assigned_at);
 await asUser('10000000-0000-4000-8000-000000000005');assert.equal((await db.query('select * from public.projects')).rows.length,1);
 await asUser(adminId);await save('unassigned@example.com','client',[]);
 await asUser('10000000-0000-4000-8000-000000000005');assert.equal((await db.query('select * from public.projects')).rows.length,0);
});
test('disable and restore a user without deleting assignments; prevent self-disable', async () => {
 await asUser(adminId);
 await db.query("select public.manage_portal_user('client@example.com','Client','client',false,'[{\"projectId\":\"p1\"}]','disabled')");
 await asUser(clientId);assert.equal((await db.query('select * from public.projects')).rows.length,0);
 await asUser(adminId);
 await db.query("select public.manage_portal_user('client@example.com','Client','client',false,'[{\"projectId\":\"p1\"}]','active')");
 await asUser(clientId);assert.equal((await db.query('select * from public.projects')).rows.length,1);
 await asUser(adminId);await assert.rejects(()=>db.query("select public.manage_portal_user('admin@example.com','Admin','admin',false,'[]','disabled')"), /own account/);
});
test('metadata RPCs enforce staff and client permissions', async () => {
 await asUser(clientId);await assert.rejects(()=>db.query("select public.save_portal_client(null,'Denied','DENIED','active')"));
 await asUser(staffId);await assert.rejects(()=>db.query("select public.save_portal_project(null,'c1','Denied','DENIED','','active')"));
 await asUser(adminId);await save('staff@example.com','staff',[],true);
 await asUser(staffId);const id=(await db.query("select public.save_portal_client(null,'Staff client','STAFF-CLIENT','active') as id")).rows[0].id;
 await db.query("select public.save_portal_client($1,'Staff renamed','STAFF-CLIENT','archived')",[id]);
});
// Exercise the real API handlers against PostgreSQL functions. Only the
// authentication boundary and email transport are faked; SQL writes and RLS
// execute in the same isolated PGlite database used above.
test('management HTTP handlers create records, preserve errors, and invite without projects', async () => {
 const { build } = await import(new URL('../node_modules/.pnpm/node_modules/esbuild/lib/main.js',import.meta.url).href);
 const harness={user:{id:'admin',role:'admin'},authId:adminId,configured:true,sentInvites:[]};
 const rpcArguments={save_portal_client:['p_client_id','p_name','p_code','p_status'],save_portal_project:['p_project_id','p_client_id','p_name','p_code','p_location_label','p_status'],manage_portal_user:['p_email','p_display_name','p_role','p_manage_clients','p_assignments','p_status']};
 harness.client={
  async rpc(name,input){
   await asUser(harness.authId);
   try {const args=rpcArguments[name].map(key=>key==='p_assignments'?JSON.stringify(input[key]):input[key]);const result=await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as id`,args);return {data:result.rows[0].id,error:null};}
   catch(error){return {data:null,error};}
  },
  from(){return {
   select(){return {ilike(_field,email){return {async maybeSingle(){await asUser(harness.authId);const rows=await db.query('select supabase_user_id from public.portal_users where lower(email)=lower($1)',[email]);return {data:rows.rows[0]||null,error:null};}}}};},
   update(values){return {async eq(_field,id){await asUser(harness.authId);await db.query('update public.portal_users set invitation_status=$1,invited_at=$2 where id=$3',[values.invitation_status,values.invited_at||null,id]);return {error:null};}};}
  };}
 };
 globalThis.__powertekRouteHarness=harness;
 const authModule=`
 const harness=()=>globalThis.__powertekRouteHarness;
 class AuthError extends Error{constructor(message,status){super(message);this.status=status}}
 export async function requirePortalUser(request,admin=false){if(!request.headers.get('authorization'))throw new AuthError('Sign in to continue',401);if(admin&&harness().user.role!=='admin')throw new AuthError('Administrator access required',403);return {client:harness().client,user:harness().user};}
 export async function requireClientManager(request){const access=await requirePortalUser(request);if(access.user.role!=='admin')throw new AuthError('Client management permission required',403);return access;}
 export function authErrorResponse(error){return Response.json({error:error.message},{status:error.status||503});}
 `;
 const mailModule=`export function invitationClient(){const h=globalThis.__powertekRouteHarness;if(!h.configured)throw new Error('Invitation service is not configured');return {redirectTo:'https://example.invalid/invite',client:{auth:{admin:{inviteUserByEmail:async(email)=>{h.sentInvites.push(email);return {error:null};}}}}};}`;
 async function handler(name){
  const result=await build({entryPoints:[new URL('../app/api/admin/'+name+'/route.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',plugins:[{name:'test-boundaries',setup(build){
   build.onResolve({filter:/^@\/lib\/supabase$/},()=>({path:'auth',namespace:'test'}));
   build.onResolve({filter:/^@\/lib\/server\/invitations$/},()=>({path:'mail',namespace:'test'}));
   build.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='auth'?authModule:mailModule,loader:'js'}));
  }}]});
  return (await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))).POST;
 }
 const clients=await handler('clients'),projects=await handler('projects'),users=await handler('users');
 const request=body=>new Request('https://example.invalid/api/admin',{method:'POST',headers:{authorization:'Bearer synthetic', 'content-type':'application/json'},body:JSON.stringify(body)});
 await asUser(adminId);
 const created=await clients(request({name:'HTTP client',code:''}));assert.equal(created.status,201);
 const client=await created.json();assert.equal(client.code,'HTTP-CLIENT');
 const duplicate=await clients(request({name:'Same code',code:'HTTP-CLIENT'}));assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).field,'code');
 const projectResponse=await projects(request({clientId:client.id,name:'HTTP project',code:''}));assert.equal(projectResponse.status,201);
 const project=await projectResponse.json();assert.equal(project.code,'HTTP-PROJECT');
 const invalid=await projects(request({name:'No client'}));assert.equal(invalid.status,400);assert.equal((await invalid.json()).field,'clientId');
 const invited=await users(request({email:'http-user@example.invalid',displayName:'HTTP user',role:'client',assignments:[],sendInvite:true}));
 assert.equal(invited.status,200);assert.equal((await invited.json()).invitationSent,true);assert.deepEqual(harness.sentInvites,['http-user@example.invalid']);
 const disabled=await users(request({email:'http-user@example.invalid',displayName:'HTTP user',role:'client',assignments:[],status:'disabled',sendInvite:false}));assert.equal(disabled.status,200);
 const unauthenticated=await clients(new Request('https://example.invalid/api/admin',{method:'POST',body:'{}'}));assert.equal(unauthenticated.status,401);
 harness.user.role='client';harness.authId=clientId;
 const forbidden=await projects(request({clientId:client.id,name:'Forbidden'}));assert.equal(forbidden.status,403);
 delete globalThis.__powertekRouteHarness;
});

test.after(async()=>{ await db.close(); });
