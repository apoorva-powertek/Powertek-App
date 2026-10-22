# Survey uploads, review, and activity history

Apply `supabase/migrations/20261022090000_survey_quality_workflow.sql` after the earlier migrations before deploying this release. It adds tables and functions, preserves existing IDs, measurements, files, assignments, and timestamps, and classifies existing surveys as **Uploaded**. It does not assume they have been approved. The migration is transactional.

## Daily workflow

1. In **Upload data**, choose an active project and select the location spreadsheet. JSON measurement files and original photos are optional.
2. Select **Validate and preview**. Missing coordinates/elevation, invalid ranges, and duplicate pole IDs block the package. Matching uses normalized exact IDs, or an exact source image filename recorded in measurement JSON. There is no partial-name matching. Preview shows existing poles that will be replaced and files that will remain unlinked.
3. Select **Confirm and publish import**. Files go directly from the browser to Supabase private storage, avoiding Vercel's request-body limit for images. The original bytes are preserved. Only after every manifest object exists with the expected byte count does a single database transaction save poles, replace attachments, link files, update the project, and record the completed import.
4. Keep this page open. If a file fails, **Retry and publish** skips successfully uploaded files and retries the rest. A repeated commit is idempotent. Refreshing or leaving the page loses the browser's selected files and retry state; validate again to start a new package. A project modified after preparation must be validated again to avoid overwriting a concurrent change. Pending files do not publish survey records and clients cannot read staged files.
5. Open the project and select **Review details**. Editors can submit Uploaded surveys for review and return reviewed surveys to Uploaded with a reason. Only administrators can approve or mark delivered. Approval requires a real stored photo and measured attachments. Review decisions reject stale survey revisions.
6. **Activity history** in the administrator navigation shows client/project/profile/access changes, import preparation/completion, and review transitions with actor and time. Project editors can also open their project's history. Clients see review status but cannot see internal history or notes. History starts when this migration is applied, rather than inventing previous events.

Review stages are **Draft → Uploaded → Needs review → Approved → Delivered**. New imported data starts at Uploaded. Editing pole measurements, replacing attachments, or re-importing a reviewed pole returns it to Uploaded. Approval is a recorded administrator decision, not an automated engineering certification. Data completeness metrics remain separate from review counts on Overview. Review state does not change existing project-based visibility or download permissions.

## Limits and operations

- Maximum 5,000 poles, 10,000 files, and 500 MB total expanded source bytes per browser package. Each source file is limited to 50 MB, matching the current Supabase global storage setting. Large packages should be split into smaller batches; ZIPs are parsed in browser memory with an expanded-size guard.
- Measurement metadata in a request must fit within 3 MB; the HTTP route caps the request at 3.5 MB. Original JSON remains in source storage instead of being duplicated in metadata. Import preparation performs the same authorization at the HTTP and database boundaries.
- Failed/abandoned packages retain private staged files and pending import records. No automatic deletion is scheduled in this release. Operators can inspect pending imports older than their chosen retention period and remove their unlinked storage objects through the Storage API after confirming they are not in `project_files` or `poles.image_key`. Do not delete rows directly from `storage.objects`. Published originals are protected against overwrite/deletion by authenticated users, so corrections use a new import and key.
- Import manifests and measurement metadata remain in `survey_imports` to support safe retries and troubleshooting. They contain survey data; apply the same backup/retention policy as the source surveys. Audit events keep selected management fields and review notes, not raw JSON, passwords, tokens, or SMTP credentials. Authenticated app users cannot modify or delete audit events; database owners/service operators retain maintenance authority.
- This release supports whole-file retries while the page remains open. Chunked transfer with resume across browser restarts, background processing, automatic staged-file cleanup, and email notifications are future work.

## Validation

```sh
npm test
node_modules/.bin/tsc --noEmit
npm run lint
npm run build
POWERTEK_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node --test tests/permissions.test.mjs tests/quality.test.mjs
# Start npm run dev -- --hostname 127.0.0.1 first:
python tests/dashboard-browser.py
python tests/management-browser.py
python tests/quality-browser.py
```

Database tests use an isolated PostgreSQL-compatible PGlite engine and live-shaped legacy timestamp constraints. Browser tests use synthetic sessions and intercepted writes/storage responses; they never send invitation emails or upload real production data. The quality suite covers upload interruption/retry, validation preview, permission boundaries, review transitions and reasons, history, dark mode, and responsive widths.

## Design references

- [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads): browser-to-storage uploads, content types, and immutable object paths.
- [Supabase storage access control](https://supabase.com/docs/guides/storage/security/access-control): private buckets with authenticated project checks.
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html): publish all record/link changes together, or roll them all back.
- [GOV.UK check answers](https://design-system.service.gov.uk/patterns/check-answers/): provide a review step before committing changes.
