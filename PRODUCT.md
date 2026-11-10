# Powertek Utility Services

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Administrators manage clients, projects, invitations, people, permissions and project assignments. They review survey work and control its release to clients.
- Internal employees upload and extend authorised projects, inspect records and submit work for administrator review. They must be able to do this in the application without operating the database or storage backend.
- Invited clients sign in to inspect assigned projects, check notifications and download available project files and reports.
- Public website visitors evaluate Powertek's engineering and inspection capabilities, explore the product preview, contact the company or enter the client workspace.

## Product Purpose

Connect Powertek's engineering and inspection work to an organised project workspace. Keep client ownership, locations, original imagery, measured attachments, review decisions and deliverables together.

Successful workflows let an employee create or open an authorised project, upload and preview data, add further work, submit it for review, and let an administrator release it to selected clients. Clients can then sign in, inspect the work and download deliverables.

## Positioning

Powertek combines its transmission engineering and inspection services with a private client-delivery workspace. The product connects pole locations, original photographs and measured engineering profiles to project permissions, administrator review and downloadable records.

Additional comparative claims, performance guarantees, market-leadership claims and quantified customer outcomes have not been established.

## Operating Context

- The public home page explains transmission line modelling, thermal rating analysis, vegetation risk management, high-resolution inspection, thermal IR surveys and corona UV inspection.
- Survey work uses CSV/Excel location sheets, measurement JSON and original photos. Uploads can contain individual files or a ZIP package and include a validation/preview step.
- Projects contain named poles, coordinates, elevations, measured attachment heights, original imagery and source-file references. Inspection includes map, photo, measured-profile and report views.
- Employees work through the application. Administrators approve before client release; clients receive in-app notifications and sign in to check and download the project. Delivery does not require email or an external email application.
- Invitation and password-recovery emails remain part of authentication.
- The permanent application origin is https://powertek-app.vercel.app. Generated Vercel deployment URLs stay attached to a particular build and are unsuitable as bookmarks for the current application.
- Principal routes are / for the public site, /admin for administration, /portal for employees and clients, /projects/[projectId] for projects, /invite for account activation and /reset-password for recovery.
- The existing implementation uses React, TypeScript and Vinext/Vite with Supabase Auth, database row policies and private storage. Vercel serves the current application; legacy Sites/D1/R2 tooling is retained in the repository.

## Capabilities and Constraints

- Access is invitation-only. Creating a person or invitation must not require an immediate project assignment. Clients, projects and user accounts are separate management concepts.
- Permissions distinguish project viewing, upload/edit access and client management. Staff project creation is scoped by authorised client/project capabilities. Administrators manage ownership and release decisions.
- Enforce access at the server and database boundaries as well as in the interface. Client data and private originals must remain isolated by assignment and release status.
- New projects and changes to shared survey data require administrator approval and release before clients can access the updated work. Preserve the established transition rules for untouched legacy projects.
- Employees can add matching photos or measurements to existing records without submitting a new location sheet. Per-pole photo restoration preserves coordinates, attachment heights and legacy measurement JSON. A different photo or image size requires fresh review of its image markers.
- File names and imported image references do not establish photo availability. Confirm the original file exists; explain unavailable files and give editors an upload/recovery action. Never replace missing survey evidence with a fabricated photo.
- Preserve record identity, measurements and original file bytes during supported upload/retry flows. Do not silently omit unavailable files from exports.
- Existing package limits and retry behaviour are implementation constraints documented in docs/project-delivery.md and docs/survey-quality-workflow.md. Keep those documents consistent when changing upload or download limits.
- The public product preview uses fictional project data and genuine client application components, without a visible sample-data label as requested by the user. It must not fetch or reveal private customer records, account details or storage URLs.
- Password-reset links must reach the password-setting screen. Navigation, return paths, downloads, filters and primary actions must function across supported screen sizes.

## Brand Commitments

- Keep the Powertek Utility Services name, official logo and existing navy/orange brand colours intact. The user explicitly allows other presentation choices to change.
- The official logo asset is public/powertek-logo.svg. Keep its proportions and legibility.
- Use clear, professional language appropriate to engineering work. Labels should state the action and explain what the user needs to do.
- Preserve established company service and contact facts unless the user supplies replacements. The current public copy is in components/marketing-home.tsx.

## Evidence on Hand

- User-confirmed requirements in this conversation establish invitation-only access, independent people/project management, project-scoped staff permissions, administrator approval and in-app client delivery notifications.
- The repository contains real application components, domain types, workflow migrations and synthetic browser/database regression fixtures.
- lib/current-survey.json contains an owner-authorised public seed survey. Treat seed data separately from the live database and from the fictional public preview in lib/public-demo.ts.
- Original client survey photographs and hosted storage objects are not included with the repository. Restoring missing originals requires the actual supplied files; do not infer their existence from metadata.
- public/transmission-landscape.jpg is an existing public marketing asset. It is not evidence of the condition of a specific surveyed pole.
- No customer testimonials, customer-logo permissions, pricing, benchmark results or engineering certifications have been supplied for new marketing claims.
- Existing operational references include docs/admin-and-invitations.md, docs/admin-management-flow.md, docs/password-recovery.md, docs/project-delivery.md and docs/home-experience.md.

## Product Principles

1. Keep the complete employee-to-client workflow usable inside the application.
2. Make permissions, review state, file availability and the next action explicit.
3. Preserve engineering data and distinguish source evidence from sample content.
4. Keep public demonstrations useful while protecting private project information.
5. Make navigation and project work dependable across devices, themes and input methods.

## Accessibility & Inclusion

Support responsive mobile, tablet and desktop use, readable typography, clear icons and labels, visible scrolling, keyboard navigation and visible focus. Provide usable light/dark modes and respect reduced-motion preferences. Missing, loading, empty, error and success states must remain understandable without relying on colour alone.

No product-specific assistive-technology requirement or formal accessibility certification has been established.
