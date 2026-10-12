# Admin access and invitation-only onboarding

The administrator workspace is `/admin`; invited clients and internal staff use
`/portal`. An admin who signs in through `/portal` is redirected to `/admin`.
The website, logo, navy `#0c2170`, and orange `#ff8d2a` remain Powertek branded.

## Activate on the hosting environment

1. Back up the existing Supabase database, review, and apply
   `supabase/migrations/20261012090000_invites_and_staff_permissions.sql` after the
   two earlier migrations. It assumes the existing Powertek tables and
   `portal_private.is_admin()` function are already present. It adds staff roles,
   invitation tracking, project upload permissions, atomic access updates, and
   database/storage RLS guards. Test against a staging copy before production.
2. In **Supabase → Authentication → Sign In / Providers**, disable **Allow new
   users to sign up** and keep email confirmation enabled. Removing the signup
   screen alone does not block direct calls to Supabase's public signup API.
3. Configure a production SMTP provider in Supabase and check its sending limits.
   Configure the Site URL and explicitly allow `https://YOUR_DOMAIN/invite` and
   `https://YOUR_DOMAIN/portal` as auth redirect URLs. Add loopback URLs only for
   local development. The invitation email template should use Supabase's
   `{{ .ConfirmationURL }}`. Do not replace it with an unverified account link.
4. Securely configure `SUPABASE_SERVICE_ROLE_KEY` on the **server**, plus
   `PORTAL_SITE_URL=https://YOUR_DOMAIN`. Use your Supabase project's server key;
   never put it in a `NEXT_PUBLIC_*` variable, browser code, source control, or
   chat. On Cloudflare, inject it as a Worker secret and set the non-secret site
   URL in runtime bindings. The invitation route reads both Worker bindings and
   server process environment variables. Configure your hosting system's secure
   settings rather than committing values. For local Cloudflare testing, use an
   ignored `.dev.vars` file and never copy it into shared setup instructions.
5. Deploy the reviewed application changes. The migration and auth settings are
   necessary; a frontend deployment alone does not activate staff permissions or
   backend invite-only registration.

No live account was created, no email was sent, and no production migration or
configuration change was applied while implementing this work.

## Create the first administrator's credentials

There is no shared/default admin password and no public admin-creation endpoint.
Credentials are created through a private Supabase invitation.

1. Choose your administrator's email. In Supabase's SQL editor, create its portal
   profile, substituting only your own email and display name:

   ```sql
   insert into public.portal_users
     (id, email, display_name, role, status)
   values
     (gen_random_uuid()::text, lower('YOUR_ADMIN_EMAIL'), 'YOUR_NAME', 'admin', 'active');
   ```

   If the email already has a profile, inspect that record and update its role to
   `admin` rather than inserting a duplicate. Do this only as the project owner.
2. Invite that same email with redirect URL `https://YOUR_DOMAIN/invite`. The
   included owner-only helper uses Supabase's Admin API and verifies that the
   active admin profile already exists:

   ```sh
   node --env-file=.dev.vars scripts/invite-first-admin.mjs YOUR_ADMIN_EMAIL
   ```

   Configure the server key and site URL securely in the ignored `.dev.vars`
   file first (or supply them through your hosting's secure environment). This
   command sends an actual invitation email; it is not part of startup. If using
   **Authentication → Users → Invite user** instead, ensure its redirect lands
   on `/invite`; the helper sets that redirect explicitly. Never manually confirm
   an unverified email to bypass authentication.
3. Open the invitation email, choose a password (minimum eight characters), and
   then sign in at `https://YOUR_DOMAIN/admin`. The verified identity links to the
   existing admin profile. If the user already has a confirmed Supabase account,
   set the admin profile as above and use the existing password or **Forgot
   password**; an existing account does not need another registration.
4. Subsequent administrators, staff, and clients can be invited through
   **People & access** in `/admin`. Only administrators can grant permissions or
   send invitations.

Use a password manager and a strong unique password. Admin MFA is recommended as
a follow-up security feature; this change does not claim to enforce MFA.

## Permissions

| Capability | Administrator | Internal staff | Client |
| --- | --- | --- | --- |
| View projects | All | Assigned projects | Assigned projects |
| Upload/import project data | All | Each assignment's Upload / edit toggle | No |
| View/create client workspaces | All | Manage clients toggle | No |
| Create projects or change ownership | Yes | No | No |
| Invite people and change permissions | Yes | No | No |

Staff client-management permission exposes the client directory, but does not
grant project or pole access. Client progress and survey counts still reflect
only visible assigned projects. Revoked upload permissions take effect on the
next request; UI visibility is never the only access check.

Access changes and assignments are saved atomically by `save_portal_access`,
using the caller's JWT and an admin check. The service-role client is used only
by the server to send invitation emails. For an email delivery failure, access
remains saved and the directory records `failed`; the interface reports that
separately from a successful send. No automatic repeated email attempts occur.
For registered users use **Save permissions**; they can use **Forgot password**
to recover credentials. Supabase cannot invite an already registered account in
the same way as a new user.

## Validation

- `npm test`: invitation validation and filter/metric tests.
- `npm run build`, `node_modules/.bin/tsc --noEmit`, and `npm run lint`.
- `python tests/dashboard-browser.py`: Playwright UI checks with synthetic accounts
  and intercepted backend responses, using Chromium at `/usr/bin/chromium`.
  `POWERTEK_TEST_URL` overrides the local server; output defaults to `/tmp/powertek-ui`.
  These tests send no actual invitations or database writes.
- `tests/permissions.test.mjs`: actual PostgreSQL RLS/function checks in PGlite.
  Install `@electric-sql/pglite` in an external tools directory, then point
  `POWERTEK_PGLITE_MODULE` at its `dist/index.js` and run
  `node --test tests/permissions.test.mjs`. The test creates an isolated baseline
  schema, applies the migrations, and checks role isolation, escalation denial,
  atomic assignment rollback, storage access, and revocation. It does not prove
  compatibility with an uninspected production schema.

Real email delivery and an end-to-end hosted invitation still require staging
credentials, a configured SMTP provider, redirect settings, and applied schema.
