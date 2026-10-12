# Powertek-App
Inspection data on Powertek client portal

## Powertek Pole Portal

Multi-client pole survey portal with project permissions, maps, measured photo overlays, SPIDA-style profiles, uploads, and single-pole or project downloads.

[Open the live portal](https://powertek-pole-portal.apoorva906739.chatgpt.site)

### Included source and survey

- Application pages, API routes, and UI components.
- Database schema and initial migration.
- Seed survey: 76 poles and 303 attachment measurements in `lib/current-survey.json`.
- Dependency lockfile and Sites hosting configuration.

The seed survey is included publicly with the owner's authorization. Original pole photos, hosted database records, user accounts, runtime secrets, and storage objects are not exported by this repository.

### Runtime, authentication, and hosting

This server application runs on React, Vinext, and Cloudflare Workers. The current
portal uses Supabase Auth, database row-level security, and private Supabase
Storage. The retained D1/R2 helpers and seed survey are legacy tooling; deploying
those resources does not create Supabase accounts or migrate production files.
GitHub Pages cannot run this backend.

The platform is invitation-only after applying the supplied migration and
turning off public signups in Supabase. Administrators sign in at `/admin`;
clients and internal staff use `/portal`. Project assignments and upload/edit
permissions are enforced server-side and in the database.

See [Admin credentials and invitations](docs/admin-and-invitations.md) for the
first-admin workflow, secure server-key configuration, email redirects, migration,
and role permissions. No default administrator password is shipped. The legacy
`PORTAL_SETUP_CODE` flow is disabled and does not create current portal accounts.

See [Design recommendations](docs/design-recommendations.md) for the dashboard
redesign, photo guidance, research sources, and suggested next priorities.

### Local development

Use Node.js >=22.13.0 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

See [Sites development notes](docs/sites-development.md) for execution profiles
and legacy local D1 tooling. Current portal authentication is Supabase-based;
Sites mock ChatGPT sign-in does not grant current portal access. Hosted database
records, credentials, and storage objects are not copied when cloning.

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm lint
```

The workspace supports persistent light/dark themes and layouts from mobile to
large desktop screens. Automated database and browser validation commands are
listed in the admin/invitation guide.

### Import provenance

Application source recovered from Sites commit `b2430bcb1e790978adbd5224c65179e85718d76f`. Application files and the dependency lockfile are preserved; repository documentation was added for this GitHub import.

The source inventory and seed counts were verified during import. The current local production build and type check have subsequently passed with Node 24 and the pinned pnpm toolchain. No new live deployment was performed.
