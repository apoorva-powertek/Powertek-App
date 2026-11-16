---
name: Powertek Utility Services
description: Engineering expertise, contextual infrastructure photography and connected private project delivery.
colors:
  brand-navy: '#0c2170'
  brand-orange: '#ff8d2a'
  white: '#fff'
  workspace-bg: '#f2f5f9'
  workspace-text: '#19273d'
  workspace-muted: '#596a80'
  workspace-line: '#dce4ef'
  workspace-soft: '#edf2f8'
  workspace-hover: '#f3f6fb'
  workspace-success: '#16704f'
  workspace-error: '#b63836'
  atlas-link: '#183889'
  dark-bg: '#0f1724'
  dark-panel: '#182334'
  dark-text: '#edf2fa'
  dark-muted: '#b0bfd2'
  dark-line: '#33435a'
  dark-soft: '#223148'
  dark-hover: '#26364e'
  dark-success: '#8ee1bc'
  dark-error: '#ffb7ad'
  dark-atlas-ink: '#cad8ff'
  dark-atlas-link: '#c2d3ff'
  site-bg: '#fff'
  site-soft: '#f2f5fa'
  site-panel: '#fff'
  site-ink: '#162c53'
  site-muted: '#53647d'
  site-line: '#dce4ef'
  site-link: '#153a88'
  site-graphic: '#eef3fb'
  site-graphic-line: '#25477e'
  site-dark-bg: '#101a29'
  site-dark-soft: '#182538'
  site-dark-panel: '#1a2a40'
  site-dark-ink: '#eef3ff'
  site-dark-muted: '#b9c8dd'
  site-dark-line: '#344760'
  site-dark-link: '#c0d2ff'
  site-dark-graphic: '#1b2b43'
  site-dark-graphic-line: '#a1bde4'
  site-action-ink: '#102460'
  site-orange-hover: '#ffac64'
  site-navy-hover: '#29468f'
  site-signin-hover: '#203b8e'
  site-selection: '#ffd4ae'
  site-photo-fallback: '#0b1e54'
  site-photo-copy: '#d9e5ff'
  site-diagram-accent: '#e9781e'
  site-diagram-secondary: '#708db4'
  site-diagram-ground: '#8a9aaf'
  site-diagram-dashed: '#afbacb'
  site-diagram-axis: '#8b9db7'
  site-diagram-return: '#6b9986'
  site-check: '#b85a10'
  site-check-dark: '#ffb276'
  site-on-navy-icon: '#ffae65'
typography:
  display:
    fontFamily: Manrope, Inter, sans-serif
    fontSize: clamp(46px, 4.5vw, 76px)
    fontWeight: 700
    lineHeight: 1.09
    letterSpacing: -0.035em
  headline:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 32px
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: -0.035em
  title:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 19px
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: -0.025em
  body:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    lineHeight: 1.55
  label:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 13px
    fontWeight: 550
  auth-input:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
  auth-input-mobile:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 16px
  display-mobile:
    fontFamily: Manrope, Inter, sans-serif
    fontSize: clamp(37px, 7.5vw, 54px)
    lineHeight: 1.09
    letterSpacing: -0.035em
    fontWeight: 700
  page-headline:
    fontFamily: Manrope, Inter, sans-serif
    fontSize: clamp(38px, 4.2vw, 62px)
    lineHeight: 1.18
    letterSpacing: -0.035em
    fontWeight: 700
  page-headline-mobile:
    fontFamily: Manrope, Inter, sans-serif
    fontSize: clamp(33px, 7.5vw, 44px)
    lineHeight: 1.18
    letterSpacing: -0.035em
    fontWeight: 700
  service-headline:
    fontFamily: Manrope, Inter, sans-serif
    fontSize: clamp(36px, 4vw, 58px)
    lineHeight: 1.18
    letterSpacing: -0.035em
    fontWeight: 700
  section-headline:
    fontFamily: Manrope, Inter, sans-serif
    fontSize: clamp(32px, 3.2vw, 45px)
    lineHeight: 1.18
    letterSpacing: -0.035em
    fontWeight: 700
  site-body:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 15px
    lineHeight: 1.7
    letterSpacing: -0.01em
  site-support:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 13px
    lineHeight: 1.9
    letterSpacing: -0.01em
  site-action:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 13px
    lineHeight: 1.6
    letterSpacing: -0.01em
    fontWeight: 600
  site-service-title:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 21px
    lineHeight: 1.4
    letterSpacing: -0.025em
    fontWeight: 650
  site-label:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    lineHeight: 1.7
    letterSpacing: -0.01em
    fontWeight: 550
  site-caption:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 11px
    lineHeight: 1.9
    letterSpacing: -0.01em
  site-metadata:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 10px
    lineHeight: 1.7
    letterSpacing: -0.01em
rounded:
  control: 8px
  sheet: 12px
  delivery: 14px
  context: 16px
  field: 7px
  static-image: 9px
  circle: 50%
spacing:
  compact: 8px
  control: 12px
  group: 18px
  sheet: 24px
  section: 28px
  desktop: 36px
  site-gutter: 48px
  site-gutter-tablet: 32px
  site-gutter-mobile: 20px
  site-section: 92px
  site-section-tablet: 72px
  site-section-mobile: 58px
components:
  button-primary:
    backgroundColor: '{colors.brand-navy}'
    textColor: '{colors.white}'
    rounded: '{rounded.control}'
    padding: 9px 14px
  button-secondary:
    backgroundColor: '{colors.white}'
    textColor: '{colors.workspace-text}'
    rounded: '{rounded.control}'
    padding: 9px 14px
  button-home:
    backgroundColor: '{colors.brand-orange}'
    textColor: '{colors.site-action-ink}'
    rounded: '{rounded.control}'
    padding: 12px 20px
    height: 48px
  input-auth:
    backgroundColor: '{colors.workspace-bg}'
    textColor: '{colors.workspace-text}'
    rounded: '{rounded.control}'
    padding: 0 13px
    height: 48px
  navigation-item:
    textColor: '#d6e1f7'
    rounded: '{rounded.control}'
    padding: 12px
    height: 46px
  sheet:
    backgroundColor: '{colors.white}'
    textColor: '{colors.workspace-text}'
    rounded: '{rounded.sheet}'
  availability:
    textColor: '{colors.workspace-success}'
  delivery-panel:
    backgroundColor: '{colors.brand-navy}'
    textColor: '{colors.white}'
    rounded: '{rounded.delivery}'
    padding: 24px
  button-site-navy:
    backgroundColor: '{colors.brand-navy}'
    textColor: '{colors.white}'
    rounded: '{rounded.control}'
    padding: 12px 20px
    height: 48px
  button-site-secondary:
    backgroundColor: '{colors.site-bg}'
    textColor: '{colors.site-ink}'
    rounded: '{rounded.control}'
    padding: 12px 20px
    height: 48px
  input-site:
    backgroundColor: '{colors.site-bg}'
    textColor: '{colors.site-ink}'
    rounded: '{rounded.field}'
    padding: 12px
    height: 46px
  site-service-card:
    backgroundColor: '{colors.site-panel}'
    textColor: '{colors.site-ink}'
    rounded: '{rounded.sheet}'
  site-navigation:
    textColor: '{colors.site-muted}'
    typography: '{typography.label}'
    padding: 12px 0
    height: 44px
---

# Design System: Powertek Utility Services

## Overview

**Creative North Star: "Connected Atlas"**

Powertek’s engineering world connects contextual infrastructure photography, precise conceptual diagrams, divided service indexes and white or slate inspection sheets. Public pages introduce engineering and inspection expertise with Manrope headings, legible navy-backed photographic fields and clear project enquiries. Private workspaces keep conventional forms, tabs, lists and file tables that connect locations, imagery, measured profiles and deliverables.

Operational surfaces are restrained and readable, with role-specific next actions and explicit availability. Preserve the official Powertek identity and its logo proportions. This records the shipped code: `app/home.css` defines the public website and `app/experience.css` retains the private workspace/authentication system, after earlier styles imported by `app/layout.tsx`. The approved public redesign changes presentation, not the established private controls, permissions or authentication rules.

**Key Characteristics:**
- Contextual infrastructure photography and conceptual engineering geometry.
- White or slate sheets with restrained rounded controls.
- Orange selection and focus; labelled semantic availability.
- Engineering services lead public pages; a smaller static client-workspace image appears later on the homepage.

## Colors

The palette pairs authoritative navy and warm orange with cool reading surfaces; frontmatter values are normative.

### Primary

- **Powertek Navy:** private navigation, public process bands, photographic reading protection, supporting primary actions and deliverable panels. Fixed brand fields retain their navy in both themes.
- **Survey Orange:** the public project-enquiry action, active measurements, progress, selected indicators and keyboard focus; it does not replace semantic status text.

### Neutral

- **Inspection White:** light sheets and logo backing.
- **Workspace Slate:** background, copy, dividers, hover and soft-layer roles use the `workspace-*` tokens.
- **Night Slate:** `dark-*` tokens keep the same functional hierarchy in dark mode.
- **Public Reading Slate:** `site-*` tokens describe public reading surfaces, links and conceptual diagram fields. They are independent of private `workspace-*` tokens. Diagram orange and muted green denote conceptual features, not customer status. Photo-copy and action-ink roles keep text readable on photographic and orange fields.
- **Success / Error:** the workspace success and error tokens carry meaning alongside labels, icons and feedback text.

| CSS role | Light token | Dark token |
| --- | --- | --- |
| workspace background / panel | workspace-bg / white | dark-bg / dark-panel |
| workspace text / muted | workspace-text / workspace-muted | dark-text / dark-muted |
| workspace line / soft / hover | workspace-line / workspace-soft / workspace-hover | dark-line / dark-soft / dark-hover |
| workspace success / error | workspace-success / workspace-error | dark-success / dark-error |
| atlas ink / link | brand-navy / atlas-link | dark-atlas-ink / dark-atlas-link |
| public background / panel | site-bg / site-panel | site-dark-bg / site-dark-panel |
| public ink / muted / line / soft | site-ink / site-muted / site-line / site-soft | site-dark-ink / site-dark-muted / site-dark-line / site-dark-soft |
| public link / graphic / graphic line | site-link / site-graphic / site-graphic-line | site-dark-link / site-dark-graphic / site-dark-graphic-line |

The public palette records reused colour roles, not every translucent photo-overlay stop as an independent brand colour. Navy alpha gradients and cool divider overlays are contextual reading/depth treatments; diagrams retain their own technical feature colours.

The theme selector is `:root[data-theme=dark]`; the saved preference is `powertek-theme`, with the system preference as the initial fallback.

**The Color Ownership Rule.** Use navy for structure, orange for public project enquiries, selection and focus, and semantic status colours with explicit text.

## Typography

**Display Font:** Manrope, with Inter and sans-serif fallbacks. The local bold asset is `public/fonts/Manrope-Bold.ttf`.
**Body Font:** Inter, with system-ui and sans-serif fallbacks. The existing local variable asset is `public/fonts/InterVariable.woff2`.

Manrope carries public display/section headings and the authentication context panel; Inter also carries public service-card titles. Inter is intentionally retained as the established working/body face, including the service catalogue, despite the generic overused-font detector warning. Inter carries operating headings, labels, tables and measurements. Workspace numerals use tabular figures where compared; the operating foundation enables `cv11` and `ss01`.

### Hierarchy

- **Display:** responsive photographic hero; use the display and display-mobile roles. At the intermediate public breakpoint the hero is (61px). Page, service and section headlines have their own frontmatter roles; public headings use line height (1.18) unless the photographic hero specifies its tighter display role.
- **Headline:** workspace/project titles; workspace titles reduce to (28px) at the mobile workspace breakpoint.
- **Title:** client section headings; project names use (15px), weight (650), line height (1.4).
- **Body:** operating text follows the body role; public base copy follows site-body. Public explanatory paragraphs use (14px) with line height (1.85–1.95), reducing to (13px) in compact layouts; introductory copy uses (15px), and wide-screen hero copy uses (16px). Public text blocks are typically (44–68ch); supporting workspace descriptions stay within (65ch).
- **Public support:** the frontmatter records service titles, action labels, form labels, captions and metadata separately. Compact diagram legends use (9px), hide in the two-column mobile catalogue and return in the single-column phone catalogue; they do not carry required service explanations. Native case is retained; do not manufacture decorative uppercase labels.
- **Label:** labelled forms and controls, with compact secondary metadata where space requires it.
- **Authentication:** inputs use the mobile role at widths up to (760px), including sign-in, recovery and password setting. Never reduce these mobile fields below (16px).

## Layout

Public content uses a centred container capped at (1440px), initially `calc(100% - 96px)`. Gutters reduce to (32px) per side at (1200px), then (20px) at (760px). A compact header (88px desktop, 76px mobile) precedes a wide photographic enclosure capped at (1800px); it has (24px) outer desktop gutters and (12px) mobile gutters. The hero’s navy gradient protects the headline and project/service actions; its three service links become divided rows on mobile. The desktop navigation collapses at (1000px). Public section spacing follows site-section, site-section-tablet and site-section-mobile.

The homepage leads with engineering photography and service context, followed by the divided service index, field story, process band, smaller static workspace illustration and FAQs. The Services catalogue uses three columns, two at (1000px), and one at (600px); filters use pressed buttons. Service detail, About, Our Process and Contact share the public frame, diagrams, divided content and project-enquiry links. Most split sections stack at (760px); very narrow (360px) screens use (16px) reading gutters. The static workspace capture switches to the mobile image at (600px), within a bounded (620px) tall enclosure and a soft lower fade, without nested interaction. The full twelve-route public set includes the six dedicated service pages and image credits; composition/content details remain in `docs/home-experience.md` rather than becoming universal layout rules.

Private workspaces have a fixed navy rail (232px), a top bar (72px), content padding (35px 36px) and a maximum content width (1600px). At (900px) the rail becomes (214px). At (760px) content has no rail offset, padding becomes (25px 18px), the top bar becomes (66px), and navigation is an accessible drawer capped by `min(290px, calc(100vw - 32px))`.

The shared client overview uses a flexible project list and a deliverables column (285px), with a gap (28px). It stacks at (1200px); coverage detail disappears at (900px), and compact project symbols disappear at (440px). Authentication uses two balanced columns within (1240px), with a form capped at (420px); it stacks at (760px). Project summaries become two columns at (760px); mobile record tables become readable record rows at (600px). Keep scrolling and overflow available for dense tools.

The later homepage workspace section uses noninteractive dashboard images, with separate desktop/mobile and light/dark captures. The graphic has no nested scroll region, keyboard focus, project controls or downloads. Use the real client layout for captures rather than a separate public dashboard implementation.

## Elevation & Depth

Operating sheets and public service cards are flat at rest: tonal contrast and thin dividers establish depth. Photographic gradients protect copy, while conceptual diagrams use a light or dark graphic field. The later static workspace image has a restrained ambient shadow (`0 16px 35px #071c4814`); the public mobile menu uses (`0 18px 34px #03133422`). Active private navy navigation retains its inset line (`inset 0 0 0 1px #4961a3`). Do not apply illustration shadows to every operational sheet.

State transitions inherited from the operating foundation take (.16s) for background, border, shadow and transform. Public button colour/transform changes also take (.16s). The hero photograph makes one bounded arrival over (1800ms), easing with `cubic-bezier(.16,1,.3,1)` from scale (1.045) to (1); no pointer-driven route drawing or atlas animation remains. Public, authentication, client overview and project-room motion respects `prefers-reduced-motion: reduce`; content is present without motion.

## Shapes

Controls use the control radius; operating sheets and record containers use the sheet radius. Deliverable and authentication context panels use their larger named radii. Fine borders and route lines give structure; circles remain native map nodes, progress geometry and avatars. Public photography uses complete rounded enclosures: the hero uses the context radius on desktop and sheet radius on mobile, field photography uses delivery radius, and detail/about photography uses sheet radius. Public service cards and diagram fields use sheet radius; featured services and enquiry panels use delivery radius. Public fields and dark-theme logo backing use field radius; the static workspace capture uses static-image radius. Numbered process steps use the circle role. Corners and fine dividers provide structure without lifted metric-card decoration.

## Components

### Buttons

Compact, labelled actions use the primary and secondary variants. Workspace controls have minimum height (42px); public actions use their own (48px) variant, with the compact hero variant reducing to (46px) on mobile. Orange leads project discussion on the photo; navy supports ordinary page actions; secondary actions use reading surfaces or a translucent photo treatment. Primary hover darkens the navy; secondary hover uses the soft surface. Global/private keyboard focus is an orange outline (3px) offset (3px); public links/buttons use offset (4px); authentication fields use an orange focus-within outline (2px) offset (2px). Disabled buttons visibly reduce opacity and retain explanatory feedback.

### Chips / Availability

Status combines a clear label and icon. Shared project rows show “Ready to view” or “Update under review”; paused access uses muted colour. Review badges and progress steps show the release stage with text. A coloured dot alone is insufficient.

### Cards / Containers

Bordered sheets group operational work. The shared client overview favours divided project rows with project name, location, code, coverage and access action. A navy deliverables panel provides a distinct destination for released files. Project summaries use a single divided sheet rather than separate lifted metric cards.

### Public Services / Engineering Graphics

Service catalogue cards use flat bordered panels, a conceptual SVG diagram, concise service text and a real detail-page anchor. The homepage pairs a larger featured service with a divided index. Catalogue filters use `aria-pressed`, navy selected fill and text labels; they do not navigate. The six diagram variants explain line modelling, thermal rating, vegetation risk, high-resolution inspection, thermal IR and corona UV concepts. Their orange feature lines, grey reference geometry and muted return features are illustrative, not measured customer results. FAQs use native details/summary disclosure.

### Inputs / Fields

Use persistent labels, bordered reading surfaces, clear focus and labelled password visibility. Authentication fields are (48px) high. Sign-in, password reset and invitation password setting share the same frame and mobile type rule. Retain alert/status text for errors, recovery confirmation and progress.

The public contact composer uses persistent labels, reading-surface fields with field radius, (46px) minimum control height and vertically resizable textareas. Its two-column form becomes one column at (1000px); the wider contact layout stacks at (760px). “Prepare enquiry” produces an encoded email draft, focuses the result heading and offers open-email, copy and edit actions. Preparation never sends a message or uploads the enquiry; status text describes copying or copy fallback without claiming delivery.

### Navigation

The public header and footer link Services, About Powertek, Our process, Contact and client sign-in. Active public links use orange underlining and link colour; the mobile menu is a bordered, scrollable disclosure that closes on Escape, outside pointer or navigation. Theme/menu controls activate after hydration. Retain `AuthLinkRedirect` at the root for legacy authentication callbacks. Use native anchors for route changes, public section links, project access, permanent project URLs and report destinations; production navigation depends on this behavior. Use buttons for local workspace tabs and state changes behind sign-in. Preserve visible current/pressed state, labelled icon controls, skip links and the mobile drawer's dialog semantics.

### Connected Client Evidence

`components/client-overview.tsx` renders the real client workspace. `components/client-dashboard-visual.tsx` shows static WebP captures of that workspace on the public website, with fictional isolated project data and no visible sample-data label. The public graphic has no working project controls, tour downloads or private API calls. Capture scripts and fictional data live in `tests/capture-client-dashboard.py` and `tests/client-dashboard-data.json`.

Clients see assigned/released work. A paused project must not offer a usable project link or disclose record counts, coverage or measurements; exported client summaries leave its numeric data empty. Administrators see people, permissions, review and release actions; employees see upload/edit actions only within their authorised project scope. Keep release, download availability, missing originals and the next permitted action explicit. Preserve server/database enforcement independently of the interface.

### Identity / Imagery

Use the fixed official `public/powertek-logo.svg` without changing proportions; retain a white backing where needed in dark navigation/authentication. `public/transmission-landscape.jpg` is the retained Unsplash infrastructure photograph used by the hero (source: https://images.unsplash.com/photo-1473341304170-971dccb5ac1e). `public/marketing/corridor-field.webp` is “Pollinator habitat transmission line” by the U.S. Fish and Wildlife Service – Midwest Region, public domain (https://commons.wikimedia.org/wiki/File:Pollinator_habitat_transmission_line_(54685168801).jpg); its provenance sidecar records resizing the source to (1440px) and WebP encoding. Visible sources and context are at `/credits`. Both images illustrate engineering context, not Powertek customer projects or survey evidence. Original SVG service diagrams are conceptual, and static dashboard captures carry fictional project data with their own provenance sidecars. This redesign introduces no AI-generated raster. Missing project originals require an explicit unavailable state and an authorised upload/recovery action.

## Do's and Don'ts

### Do:

- **Do** preserve the official logo, navy/orange identity and theme-specific reading surfaces.
- **Do** lead public pages with engineering expertise, real contextual imagery and useful service links; keep the static client-workspace illustration later on the homepage.
- **Do** capture the real client overview for public graphics and keep operating controls behind sign-in.
- **Do** retain visible photo credits and provenance, and identify conceptual diagrams as illustrations.
- **Do** describe contact preparation as a draft; let the visitor review, copy, edit and send from their email app.
- **Do** keep route navigation native, mobile authentication input text at least 16px and keyboard focus visible.
- **Do** pair availability and review states with labels and permitted next actions.

### Don't:

- **Don't** add a visible sample-data label to the public dashboard imagery or connect it to private records.
- **Don't** reveal paused client data, invent missing survey imagery or add unsupported company claims.
- **Don't** turn inherited decorative kickers, glyph icons or legacy display styling into reusable system rules.
- **Don't** restore the rejected oversized dashboard hero or obsolete pointer/atlas animation.
