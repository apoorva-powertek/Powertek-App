# Powertek product and design recommendations

## Included in this change

- A persistent SaaS workspace navigation with separate admin and client entry
  points, overview, projects, clients, people/access, and permitted uploads.
- Real portfolio metrics, weighted survey completion, progress by client, and
  filter-aware CSV summaries. Empty projects count as not started, not complete.
- Search, client, status, completion, and inclusive updated-date filters; project
  sorting and grid/list layouts. No invented growth percentages or trend charts.
- Responsive reflow, explicit field labels, visible keyboard focus, mobile
  navigation, a skip link, and reduced-motion support. Theme choice persists.
- The existing Powertek logo and navy/orange colors, with neutral white/black
  surfaces. The original logo stays unaltered on a white surface in dark mode.
- Restrained geometric survey graphics rather than unrelated stock photography.

## Recommended next priorities

1. **Invitation lifecycle and audit log.** Add expiration indicators, deliberate
   resend/revoke actions, deactivation, and a searchable log of who changed access
   or imported data. Record events server-side; never derive history from a live
   aggregate. Supabase's auth link expiration and SMTP limits should be reflected
   accurately rather than promising indefinite links.
2. **Administrative MFA.** Require a verified MFA challenge before sensitive
   access changes. Server/API and database controls need to enforce it together.
3. **Survey quality and review states.** Split uploaded, validated, reviewed, and
   approved stages. Current completion follows the existing pole status and does
   not establish engineering approval. Add missing-photo, missing-measurement,
   and location-validation queues before displaying “ready for handoff.”
4. **Saved views and reporting.** Save useful filter combinations (per client,
   incomplete surveys, recently updated projects), then add scheduled reports
   only after collection of trustworthy timestamps and history.
5. **Upload reliability.** Add background/resumable uploads, row-level import
   errors, duplicate previews, and retry controls. The current data import still
   consists of multiple database/storage operations; access updates are atomic,
   but survey imports are not an all-or-nothing job.
6. **Branded real photography.** When supplied, use a wide field-operation image
   for the website hero, an inspection close-up for the sign-in surface, and
   optional client/project cover images with explicit alt text. Keep sensitive
   coordinates and client imagery behind assigned-project access. Use optimized
   AVIF/WebP assets and responsive crops; do not stretch one image everywhere.

## Research and rationale

- [Supabase: inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
  provides email-based invitations and redirect handling. Invitation links must
  lead to password setup, and the Admin API belongs exclusively on the server.
- [Supabase: general authentication configuration](https://supabase.com/docs/guides/auth/general-configuration)
  distinguishes disabling new signups from email confirmation. Invite-only UI
  needs the backend registration setting too.
- [WCAG 2.2: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
  calls for content usable at 320 CSS pixels. The workspace reflows to a mobile
  layout; genuinely tabular reports can scroll inside their own container.
- [WCAG 2.2: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  supports using dark text/navy buttons on light surfaces, avoiding small white
  text on orange, and treating theme contrast as a requirement.
- [WCAG: Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
  informs short, purposeful transitions and respecting reduced motion.

These recommendations are priorities for review, not claims that those future
features are already implemented. No user-supplied real photos were available
for this change.
