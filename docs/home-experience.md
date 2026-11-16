# Powertek public website

The public site leads with Powertek's engineering and inspection services. The homepage uses an infrastructure photograph, the approved engineering-led headline, direct project-contact and service links, a divided service index, technical graphics, process information, FAQs and a smaller client-workspace image farther down the page.

## Routes and content

- `/`: engineering-led homepage. Keep `AuthLinkRedirect` at the root so old invitation and recovery links retain their intent.
- `/services`: six-service catalogue with engineering/inspection filters.
- `/services/transmission-line-modelling`, `/services/thermal-rating-analysis`, `/services/vegetation-risk-management`, `/services/high-resolution-inspection`, `/services/thermal-ir-surveys`, `/services/corona-uv-inspection`: dedicated pages with service context, applications, required inputs, scoped deliverables and related services.
- `/about`: established services, company approach and Hyderabad contact location. It makes no unverified certification, team-size or customer-result claims.
- `/process`: project scope, capture/organisation, administrator review and client release.
- `/contact`: company contact details and an email-draft composer. Preparation does not send or upload information. Users review the draft, open their email app or copy it; they can return to edit it.
- `/credits`: imagery origins and context.

The shared content source is `lib/marketing-content.ts`. Pages use `MarketingLayout`, native links, consistent navigation/footer, page-specific metadata, canonical URLs and the same Powertek identity. The static public sitemap excludes private app routes; robots.txt discourages indexing those routes and does not replace authentication.

## Brand and graphics

The official SVG logo, navy `#0c2170`, orange `#ff8d2a`, self-hosted Manrope display and Inter body fonts are retained. New public classes use `pt-site-*` to avoid legacy CSS collisions. Light/dark variables are scoped by the existing `data-theme` preference. The header's theme/menu controls wait for hydration so a visitor's first click is handled.

The hero uses the existing transmission-landscape photograph. A public-domain US Fish and Wildlife Service corridor photograph is resized/encoded as WebP in `public/marketing/corridor-field.webp`, with origin metadata and visible credits. These are contextual infrastructure photographs, not claims of Powertek customer work. `EngineeringGraphic` renders original conceptual SVG diagrams for the six services; it does not present invented measurements as project evidence.

The client workspace illustration remains static, with separate desktop/mobile and light/dark WebP captures. It has no working application controls, tour download or visible sample-data label, as requested. It uses fictional Westbrook Energy project data. The actual private client dashboard is unchanged. `tests/capture-client-dashboard.py` and `tests/client-dashboard-data.json` can refresh those graphics using intercepted account/API fixtures.

The hero photograph has one bounded arrival animation. Reduced motion disables it; all content is visible without animation. Source links and real photographs are retained with provenance. No AI-generated raster imagery was introduced.

## Validation

`tests/home-browser.py` checks all twelve public routes, metadata/canonicals, service filtering, native navigation, contact preselection/draft/copy/edit, menu/Escape, light/dark persistence, reduced motion, sitemap/404 and 320–1920px layouts. It blocks private requests and sends no messages. Captures explicitly load lazy imagery before taking full-page screenshots.

Private dashboard and password-recovery browser tests guard the existing application and root callback behavior. Production validation uses synthetic accounts and intercepted writes with TLS verification retained. Cross-page navigation remains native because framework navigation previously failed in the deployed Vinext runtime.
