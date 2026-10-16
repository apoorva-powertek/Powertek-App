# Client, project, and people management

## Workflow

Clients are company/customer records. People are sign-in identities. Creating one
never requires creating the other.

1. **Clients:** create a record with its name. The optional code is generated from
   the name when blank. Search or filter the directory, edit details, and archive
   or restore records. Archiving preserves all projects and records.
2. **Projects:** choose an active client, or select **Add a new client** inside the
   project form. The new client is created and selected without losing the draft
   project details. Client ownership remains required for a project; assigning
   people is a separate operation. Existing projects can be edited or archived.
3. **People & access:** enter a name, email, and role, then send an invitation.
   Project selection is optional, including when the workspace has no projects.
   A signed-in person with no assignments sees no project data. Add, remove, or
   change assignments later through **Manage**.
4. **Account status:** disable or restore a person without deleting their record
   or selected assignments. A disabled user cannot access project data. An admin
   cannot disable or demote their own account through this interface or its RPCs.

Users with existing, registered accounts should have permissions saved rather
than receive another new-account invitation. They can use **Forgot password** if
needed. Invitation delivery failures are distinguished from successfully saved
access; errors preserve the entered values and focus a visible error summary.

## Root cause and database repair

The imported live schema had NOT NULL creation/update timestamps with no defaults
on clients, projects, users, poles, files, and assignment timestamps. Inserts that
omitted those columns failed, but the API reduced the database error to a generic
503 response. The previous simplified test schema supplied defaults and did not
expose the defect.

`supabase/migrations/20261016090000_management_flow_and_defaults.sql`:

- Supplies `now()` defaults only for missing application timestamp defaults.
- Maintains `updated_at` on record changes.
- Allows `save_portal_access` to save zero project assignments.
- Adds authenticated, permission-checked client/project management functions and
  an atomic role/assignment/status function for people.
- Preserves client ownership, existing RLS, data, unique indexes, and storage.

Apply this migration after `20261012090000`; do not replay older migrations over
an already migrated database. No data deletion is part of the repair.

## Validation

- `npm test`: payload validation, optional assignments, duplicate error mapping,
  filters, and portfolio calculations.
- `POWERTEK_PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node --test tests/permissions.test.mjs`:
  migration defaults using the live imported schema shape, role isolation,
  atomic assignment changes, metadata CRUD/archive, account disabling, and actual
  HTTP handlers against PostgreSQL functions. Authentication/email transports
  are isolated test doubles; no real invitation messages are sent.
- `python tests/dashboard-browser.py`: dashboard/authentication regression suite.
- `python tests/management-browser.py`: stateful client/project/user workflows,
  duplicate errors and preserved drafts, optional invitations, mobile layouts,
  and an empty workspace. Backend data and sends are intercepted.
- Production SQL validation creates, edits, assigns, unassigns, disables, and
  archives synthetic records inside an explicit rolled-back transaction.

## Research and design decisions

- [PostgreSQL default values](https://www.postgresql.org/docs/current/ddl-default.html):
  default values belong in the database so all supported insertion paths behave
  consistently. API-only timestamp patches would leave other write paths broken.
- [Supabase Admin invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail):
  invitation creation establishes authentication. Project permissions remain
  independent application data and should not be prerequisites for registration.
- [GOV.UK error summaries](https://design-system.service.gov.uk/components/error-summary/):
  show specific validation errors, move focus to their summary, and let users
  correct details without losing previously entered information.

These decisions address the reported failures without granting unassigned users
blanket access or requiring an organization-wide role redesign.
