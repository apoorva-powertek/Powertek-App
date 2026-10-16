import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAccessInput, canManageClients } from '../lib/access.ts';
import { defaultFilters, filterProjects, summarizeProjects } from '../lib/dashboard.ts';
const invitation = { email: ' Engineer@Example.com ', displayName: 'Engineer', role: 'client', assignments: [{ projectId: 'one', canUpload: true }], manageClients: true, sendInvite: true };
test('clients cannot acquire staff capabilities from invitation payloads', () => {
 const result = parseAccessInput(invitation); assert.equal(result.email, 'engineer@example.com'); assert.equal(result.assignments[0].canUpload, false); assert.equal(result.manageClients, false);
});
test('staff receives only explicit capabilities, with project assignments', () => {
 const result = parseAccessInput({ ...invitation, role: 'staff' }); assert.equal(result.manageClients, true); assert.equal(result.assignments[0].canUpload, true);
 assert.equal(canManageClients({ role: 'staff', permissions: { manageClients: false } }), false);
 assert.equal(canManageClients({ role: 'client', permissions: { manageClients: true } }), false);
});
test('reject malformed and duplicate assignments', () => {
 for (const payload of [{ ...invitation, role: 'owner' }, { ...invitation, email: 'broken' }, { ...invitation, assignments: [null] }, { ...invitation, assignments: [{ projectId: 'one' }, { projectId: 'one' }] }]) assert.throws(() => parseAccessInput(payload));
});
const projects = [
 { id:'a', client_id:'c1',client_name:'Northline',name:'Alpha',code:'A',location_label:'BC',status:'active',pole_count:10,complete_count:5,attachment_count:20,updated_at:'2026-10-10T00:00:00Z' },
 { id:'b', client_id:'c2',client_name:'Westline',name:'Bravo',code:'B',location_label:'Alberta',status:'archived',pole_count:20,complete_count:20,attachment_count:40,updated_at:'2026-10-12T00:00:00Z' },
 { id:'c', client_id:'c1',client_name:'Northline',name:'Charlie',code:'C',location_label:'BC',status:'active',pole_count:0,complete_count:0,attachment_count:0 },
];
test('advanced filters combine client, status, progress and inclusive dates', () => {
 const result = filterProjects(projects, { ...defaultFilters, clientId:'c1',status:'active',progress:'in_progress',updatedAfter:'2026-10-10',updatedBefore:'2026-10-10' }); assert.deepEqual(result.map(p=>p.id),['a']);
 assert.deepEqual(filterProjects(projects,{ ...defaultFilters,progress:'complete' }).map(p=>p.id),['b']);
 assert.deepEqual(filterProjects(projects,{ ...defaultFilters,query:'alberta' }).map(p=>p.id),['b']);
});
test('overview uses weighted pole completion, respects filtered data and empty projects', () => {
 assert.equal(summarizeProjects(projects).progress,83); assert.equal(summarizeProjects([projects[0]]).progress,50); assert.equal(summarizeProjects([]).progress,0);
});

import { parseClientInput, parseProjectInput, managementError } from '../lib/management.ts';
test('a person can be invited without any assigned projects',()=>{
 const user=parseAccessInput({...invitation,assignments:[]});assert.deepEqual(user.assignments,[]);assert.equal(user.status,'active');
 assert.deepEqual(parseAccessInput({...invitation,assignments:undefined}).assignments,[]);
 assert.throws(()=>parseAccessInput({...invitation,status:'disabled'}),/Enable/);
});
test('blank client/project codes are generated from names and client selection is actionable',()=>{
 assert.equal(parseClientInput({name:'Example Utility',code:''}).code,'EXAMPLE-UTILITY');
 assert.equal(parseProjectInput({clientId:'c1',name:'New Survey',code:''}).code,'NEW-SURVEY');
 assert.throws(()=>parseProjectInput({name:'New Survey'}),/add a new client/);
 assert.throws(()=>parseClientInput({name:{value:'bad'}}),/client name/);
});
test('duplicate and authorization failures have useful HTTP errors',()=>{
 assert.equal(managementError({code:'23505'},'client').status,409);
 assert.match(managementError({code:'23505'},'project').error,/for this client/);
 assert.equal(managementError({code:'42501'},'user').status,403);
});
