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

### Runtime and hosting

This is a server application built with React, Vinext, and Cloudflare Workers. It requires Cloudflare D1 (`DB`), R2 (`BUCKET`), and Sites-managed ChatGPT sign-in. GitHub stores the source; GitHub Pages cannot run this backend.

The existing live deployment remains on Sites. Deploying elsewhere requires configuring storage and trusted authentication; do not expose identity-header authentication directly to untrusted requests.

`PORTAL_SETUP_CODE` is a runtime secret used for initial administrator activation. Set it securely in the hosting environment; never commit a real setup code or credentials.

### Local development

Use Node.js >=22.13.0 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

See [Sites development notes](docs/sites-development.md) for local database migrations, authentication behavior, and execution profiles. The deployment's D1 database and R2 bucket are not copied when cloning this repository.

### Import provenance

Application source recovered from Sites commit `b2430bcb1e790978adbd5224c65179e85718d76f`. Application files and the dependency lockfile are preserved; repository documentation was added for this GitHub import.

The source inventory and seed counts were verified. A fresh local production build could not be completed because dependency installation exhausted local disk space; temporary installation files were removed. No new live deployment was performed.
