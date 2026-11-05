# Employee uploads and client delivery

Apply `20261104090000_project_workflow_and_notifications.sql` and `20261104091000_gate_existing_project_updates.sql` after the survey-quality migration before deploying the application. It is transactional and preserves existing clients, projects, assignments, records, measurements, source files, and timestamps. Existing projects retain their previous client visibility until their next survey/source-file change or explicit release through this workflow. New projects start private to internal users.

## Using the dashboard

1. **Create a project.** An administrator chooses a client and enters project details. Employees with upload access can create projects for the same client; staff with client-management permission can create for any visible active client. A staff creator receives project edit access automatically. Staff cannot move projects between clients or archive them. Administrators can invite employees with no assigned projects and assign access later in **People & access**.
2. **Upload and preview.** Creation opens **Upload data** with the new project selected. Choose a complete ZIP package, multiple files, or a location spreadsheet plus optional JSON and photos. Each package can contain one CSV/Excel location sheet. For existing poles, matching photos and measurements can be added without uploading the spreadsheet again. Photo-only additions retain the current measurements.
3. **Check records, photos and files.** The preview has separate tabs and names the destination. Invalid records block upload; unmatched files are clearly identified. **Confirm and upload** stores the original files and saves the records together only when every upload succeeds. Failed uploads can be retried while the page remains open.
4. **Submit for review.** Use **Review & client access** from the project card or viewer. An employee can submit all new/changed records, which creates an in-app notification for administrators. Employees cannot approve or release projects.
5. **Approve and release.** The administrator reviews photos and measurements, confirms that review, and selects **Approve project**. Approval requires stored photos and measured attachments for every record. Select active client accounts, optionally add a message, and choose **Release and notify clients**. This grants project access and creates a notification in each selected client's dashboard. **No email is sent.** Client accounts must already have been invited; pending invitations should be accepted first.
6. **Client access.** The client signs in at `/portal`, opens the notification or project card, and selects **Project files** in the project viewer. Files can be downloaded individually. **Download project package** creates a ZIP containing all original source files, up to 100 MB / 10,000 files. Larger projects support individual downloads; the ZIP action never silently omits files. Existing CSV and report exports remain available.

Changes to poles, measurements, or source-file metadata withdraw the current release. Assigned clients see **Update under review** and cannot view or download the working data until it is approved and released again. This release does not keep a separate downloadable snapshot of a prior version. Previously downloaded files cannot be recalled.

Notifications appear when the workspace loads or is refreshed. The inbox shows the latest 30 notifications and supports marking them read. Notification messages persist in the database and are visible only to their recipient. Release retries use an idempotency key to avoid duplicate delivery notifications after a lost response.

## Storage and permissions

- Source uploads retain the existing limit of 50 MB per file and 500 MB per package. ZIP extraction and metadata validation happen in the browser; large jobs should be split into smaller batches. Keep the tab open until upload finishes. Retry state does not survive closing the tab.
- Client project, survey, source-file and private-storage reads use the same database visibility check. Knowing a project ID or object key does not bypass assignment or approval. Staff creation scope, review transitions and release permissions are enforced in SQL as well as the HTTP boundary.
- Existing source-file metadata may reference originals that were never uploaded into the private bucket. Such files produce a clear download error and must be uploaded again through **Upload data**. This change does not fabricate or remove legacy photos or measurements.
- Working updates are protected by database row policies. Releases and administrator notifications are inserted only by protected functions; users may update only the `read_at` field on their own notification rows. Release and review events appear in the existing activity history.
- The database migration alone sends no invitations, emails or client notifications. Those are created only by the explicit dashboard workflow.

## Verification

```sh
npm test
node_modules/.bin/tsc --noEmit
npm run lint
npm run build
POWERTEK_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node --test tests/permissions.test.mjs tests/quality.test.mjs tests/workflow.test.mjs
python tests/workflow-browser.py
```

The database tests execute migrations and role policies in isolated PostgreSQL-compatible PGlite, including real HTTP-handler-to-RPC calls. Browser fixtures cover employee creation, ZIP discovery, preview tabs, upload, staff submission, admin approval, notification, individual and ZIP downloads, incremental photo uploads, and withdrawn client access. All browser writes and storage responses are intercepted; no real email or client notification is sent by tests.

## Project page and photo restoration

Use the permanent application URL: `https://powertek-app.vercel.app/projects/<project-id>`. Vercel deployment URLs such as `powertek-ncy2wmtdw-powertek.vercel.app` are fixed to their original build; opening them does not open the latest application. The project header can copy the permanent link, and the footer links to it directly. Recipients still need to sign in with project access.

A project opens on **Overview**, with survey, original-photo, measurement and approval counts; a paginated searchable record table; and project-readiness guidance. Small screens use record cards with eight records per page; desktop uses a table with fifteen. **Survey explorer** opens a chosen pole with separate photo/model/map views, a record selector, previous/next controls, measurements and a Review tab. Search and review filters also apply to map markers. View and pole selection are reflected in the URL and restored by reload and Back/Forward. Print reports return to the selected pole. **Project files** and activity history retain their authenticated access controls.

Apply `20261105090000_project_photo_availability.sql` and `20261105091000_preserve_photo_restore_metadata.sql` before deploying this page. Photo-only restores preserve legacy source JSON as well as coordinates and measured heights. The read-only function checks both project access and the original object's existence in that project's private storage path. File names and imported references alone never count as available photos. Known missing images do not generate broken thumbnail requests. Authenticated blob fetches provide real thumbnails and full-resolution photo views.

Editors can choose **Add photo to this pole**, select a JPG/PNG/WebP original (up to 50 MB), inspect the preview, then save it directly to the selected pole. Browser image decoding rejects invalid files before any upload. The existing transactional import pipeline retains coordinates and attachment heights. Matching filenames and dimensions preserve existing image markers; a different photo or size clears obsolete pixel markers for a new review. An upload error can be retried while the dialog stays open. Project data changes retain the administrator approval gate.

For multiple originals, **Add data** opens the project-specific upload flow inside the page. Matching photos can be added without another location sheet. The deployment had 72 imported photo references and zero private storage objects when checked on 5 November 2026. The repository contains no originals, so those files must be supplied again; this release does not fabricate survey images.

Survey ZIP exports include an unavailable-photo manifest, retain original photo extensions, and escape imported text in HTML reports. Known missing originals are skipped without repeated failed requests. Bulk photo exports stop at 100 MB and explain individual-download alternatives. Map fitting and imagery retry behavior remain available in the explorer.

Validation includes `tests/project-room-browser.py`, `tests/photo-availability.test.mjs`, the existing permission/import/workflow suites and navigation/quality regressions. Browser tests use synthetic users and intercepted writes; no real invitations, emails, notifications or production photo uploads are generated.
