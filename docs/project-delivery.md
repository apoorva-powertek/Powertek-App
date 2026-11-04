# Employee uploads and client delivery

Apply `20261104090000_project_workflow_and_notifications.sql` after the survey-quality migration before deploying the application. It is transactional and preserves existing clients, projects, assignments, records, measurements, source files, and timestamps. Existing projects retain their previous client visibility until explicitly released through this workflow. New projects start private to internal users.

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

## Project viewer

The project viewer uses a scrollable survey-record library, a dedicated map/photo/model canvas, and a separate selected-pole inspector. Review details stay collapsed until requested; project history opens in a dialog. On small screens the record library becomes a keyboard-accessible drawer and pole details follow the canvas. Filters apply to both records and map markers; previous/next actions follow the filtered list. Map zoom/pan supports buttons, pointer gestures and the keyboard.

Map fitting uses the actual survey extent, including subpixel Mercator spans and date-line wrapping. It no longer forces small sites to a regional zoom level. Satellite imagery failures have an explicit retry action while pole markers remain usable. Imagery attribution is visible.

Missing photos show a clear unavailable state without zoom controls. Editors can use **Upload matching photos** to open the selected project's upload screen. Matching original filenames or exact normalized pole IDs restore references while preserving measurements. The existing deployment had 72 photo references but zero storage objects when checked on 4 November 2026; the originals are not present in the repository. They must be supplied again to restore those photos. No placeholder image is presented as a survey photo.

Survey ZIP exports include a missing-photo manifest when an original cannot be retrieved. Restored photos retain their file extensions. Generated HTML reports escape imported text. Bulk photo exports stop at 100 MB and explain how to use individual downloads for larger projects.

Additional checks: `node --experimental-strip-types --test tests/map-viewport.test.mjs` and `python tests/viewer-browser.py` cover survey extent fitting, responsive non-overlap, theme surfaces, selection/centering, keyboard controls, photo recovery states, and ZIP contents for missing/restored photos.
