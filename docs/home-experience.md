# Powertek client experience

The public website shows a normal client-dashboard graphic, not a working preview. `ClientDashboardVisual` renders responsive light/dark WebP screenshots captured from the real authenticated client interface using fictional data. The image has no clickable records, tabs, controls or downloadable tour package. The website's primary workspace action signs in at `/portal`.

The graphics show a fictional Westbrook Energy workspace with three projects, 288 records and 1,648 measured attachments. They are not customer results or endorsements, and have no sample-data label as requested by the user. `tests/capture-client-dashboard.py` captures them with synthetic authentication and intercepted responses from `tests/client-dashboard-data.json`; run it with the local development app running to refresh the assets. Their embedded provenance records the source. No private account or API data is used.

The website selects mobile images below 600px and switches light/dark images with the existing theme control. A bounded arrival animation and the atlas linework respect reduced motion. The dashboard graphic cannot receive keyboard focus. The former public preview component, model/export dependencies and associated styles have been removed.

`ClientOverview` continues to provide the real client project library and deliverable entry points after sign-in. Administrators and employees retain their operational dashboards. This public-site change does not modify those workflows.

The website uses self-hosted Manrope for display and Inter for working content. The official Powertek SVG, navy/orange brand and service/contact facts are preserved. Atlas linework has one bounded entrance animation; every control works with reduced motion and content is visible before animation. The existing transmission landscape is a public marketing image, never substituted for a missing survey photograph.

Authentication entrances are `/portal` for clients and employees and `/admin` for administrators. Both offer labelled fields, password visibility, recovery and theme switching. Invitation acceptance and password updates share the authentication layout. Recovery redirects and legacy callback handling remain in place.

Cross-page navigation deliberately uses native anchors. The Vinext production router previously failed during client navigation, so internal navigation must not be changed to framework `Link` or `router.push` without production verification.

Client project overviews offer direct entry to records, the map and project files. Client accounts have no upload or project-management controls even if an inconsistent dashboard payload includes an upload flag. Paused releases mask record counts and coverage in the client overview and client CSV summary; their project links and progress indicators are withheld. Backend permission checks remain authoritative. Missing original photographs are explained honestly and require the original files to restore.

Validation: TypeScript, production build, ESLint, home/redesign browser suites and the existing dashboard, management, recovery, project-room, workflow, quality, navigation and design suites. Browser writes use synthetic accounts and intercepted responses; no invitations or client notifications are sent by these checks.
