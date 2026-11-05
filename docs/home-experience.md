# Public home experience

The permanent public address is `https://powertek-app.vercel.app/`. Generated Vercel deployment URLs remain pinned to a build and should not be used as bookmarks for the current application.

The home page retains the Powertek logo, navy/orange palette, six engineering/inspection service descriptions, contact email, phone and Hyderabad address. It uses a clearer product-led hero, interactive service selection, an upload/review/client-delivery journey, permission information, native FAQ accordions and direct client sign-in/contact links. The existing root-level authentication callback redirect is preserved.

The product visual reuses `OverviewDashboard` and `ModelZoom` from the actual application. `lib/public-demo.ts` contains explicitly fictional, public sample data; no customer data, storage URLs, sessions or project API reads are used. Dashboard filters and project buttons work within the preview. Users can inspect sample pole profiles, focus measurements and use the model zoom controls. The sample download produces a genuine ZIP with three sample poles, JSON/CSV data and generated HTML reports; no photos or private files are included. Private project links retain their native navigation; the public preview uses explicit local button callbacks.

Motion includes scroll progress, progressive section reveals, short content transitions, hover/press feedback and a restrained pointer-responsive background. All motion respects `prefers-reduced-motion`. Content is present in the initial HTML; scroll reveals are applied only after JavaScript and IntersectionObserver are available. Interactive preview controls and the mobile menu wait for hydration, preventing a first interaction from being lost. The menu supports Escape with focus return, and controls have visible keyboard focus states.

`app/home.css` scopes the design under `.powertek-home` and the preview, retaining the existing application styles. The only dashboard change is an optional public-demo open callback; application project links continue to use native anchors.

Verification: build, TypeScript, lint, existing logic checks, and `tests/home-browser.py`; dashboard, navigation, project-room and password recovery suites protect the application entry points. The home suite checks sample filters, local project navigation, measured profile selection/zoom, the ZIP contents, service and workflow controls, FAQs, contact links, sign-in, responsive widths 320–1920, light/dark mode and reduced motion. It also blocks and asserts zero requests to private project/data/storage endpoints.
