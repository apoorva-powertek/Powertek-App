# Powertek client experience

The public website shows the client workspace, not administrative controls. The shared `ClientOverview` component renders the assigned project library, accessible-record count, project availability and a real link to each project's files. `PortalApp` uses this overview for clients and retains operational review/client-management panels for administrators and employees.

The public preview never queries dashboard, survey, authentication or private-storage APIs. Its fictional Westbrook Energy workspace contains three ideal project summaries (288 records and 1,648 measured attachments). The three explorable pole profiles contain six attachments each. The user requested no sample-data label in the preview; these examples are not customer results, endorsements or project evidence. Live accounts always use authorised backend data.

Preview controls open measured profiles, select a project or pole, focus an attachment, zoom the model, export a summary and download the workspace-tour ZIP. The ZIP contains the three explorable records, their JSON and printable HTML reports. It does not pretend to contain the full projects or unavailable original photos. Private file access still requires an invitation, an assigned project and the existing release policy.

The website uses self-hosted Manrope for display and Inter for working content. The official Powertek SVG, navy/orange brand and service/contact facts are preserved. Atlas linework has one bounded entrance animation; every control works with reduced motion and content is visible before animation. The existing transmission landscape is a public marketing image, never substituted for a missing survey photograph.

Authentication entrances are `/portal` for clients and employees and `/admin` for administrators. Both offer labelled fields, password visibility, recovery and theme switching. Invitation acceptance and password updates share the authentication layout. Recovery redirects and legacy callback handling remain in place.

Cross-page navigation deliberately uses native anchors. The Vinext production router previously failed during client navigation, so internal navigation must not be changed to framework `Link` or `router.push` without production verification.

Client project overviews offer direct entry to records, the map and project files. Client accounts have no upload or project-management controls even if an inconsistent dashboard payload includes an upload flag. Paused releases mask record counts and coverage in the client overview and client CSV summary; their project links and progress indicators are withheld. Backend permission checks remain authoritative. Missing original photographs are explained honestly and require the original files to restore.

Validation: TypeScript, production build, ESLint, home/redesign browser suites and the existing dashboard, management, recovery, project-room, workflow, quality, navigation and design suites. Browser writes use synthetic accounts and intercepted responses; no invitations or client notifications are sent by these checks.
