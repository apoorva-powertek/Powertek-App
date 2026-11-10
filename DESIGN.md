---
name: Powertek Utility Services
description: Connected atlas for engineering evidence and private project delivery.
colors:
  brand-navy: "#0c2170"
  brand-orange: "#ff8d2a"
  white: "#fff"
  workspace-bg: "#f2f5f9"
  workspace-text: "#19273d"
  workspace-muted: "#596a80"
  workspace-line: "#dce4ef"
  workspace-soft: "#edf2f8"
  workspace-hover: "#f3f6fb"
  workspace-success: "#16704f"
  workspace-error: "#b63836"
  atlas-link: "#183889"
  home-copy: "#4f617b"
  home-soft: "#f1f5fa"
  dark-bg: "#0f1724"
  dark-panel: "#182334"
  dark-text: "#edf2fa"
  dark-muted: "#b0bfd2"
  dark-line: "#33435a"
  dark-soft: "#223148"
  dark-hover: "#26364e"
  dark-success: "#8ee1bc"
  dark-error: "#ffb7ad"
  dark-atlas-ink: "#cad8ff"
  dark-atlas-link: "#c2d3ff"
  dark-home-ink: "#edf2ff"
  dark-home-copy: "#bac9df"
  dark-home-soft: "#1c2a3f"
typography:
  display:
    fontFamily: "Manrope, Inter, sans-serif"
    fontSize: "clamp(40px, 5.3vw, 78px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 550
  auth-input:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
  auth-input-mobile:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
rounded:
  control: "8px"
  sheet: "12px"
  delivery: "14px"
  context: "16px"
spacing:
  compact: "8px"
  control: "12px"
  group: "18px"
  sheet: "24px"
  section: "28px"
  desktop: "36px"
components:
  button-primary:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.workspace-text}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-home:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "12px 19px"
    height: "46px"
  input-auth:
    backgroundColor: "{colors.workspace-bg}"
    textColor: "{colors.workspace-text}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "48px"
  navigation-item:
    textColor: "#d6e1f7"
    rounded: "{rounded.control}"
    padding: "12px"
    height: "46px"
  sheet:
    backgroundColor: "{colors.white}"
    textColor: "{colors.workspace-text}"
    rounded: "{rounded.sheet}"
  availability:
    textColor: "{colors.workspace-success}"
  delivery-panel:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.delivery}"
    padding: "24px"
---

# Design System: Powertek Utility Services

## Overview

**Creative North Star: "Connected Atlas"**

Navy corridor fields connect white inspection sheets, fine route geometry and orange selections. The system makes relationships between projects, locations, imagery, measured profiles and deliverables visible. Public pages use geometric display type; private workspaces keep conventional forms, tabs, lists and file tables.

Operational surfaces are restrained and readable, with role-specific next actions and explicit availability. Preserve the official Powertek identity and its logo proportions. This records the shipped code: `app/home.css` and then `app/experience.css` take precedence over earlier styles imported by `app/layout.tsx`.

**Key Characteristics:**
- Continuous navy fields with fine corridor geometry.
- White or slate sheets with restrained rounded controls.
- Orange selection and focus; labelled semantic availability.
- Public dashboard imagery captured from the actual client workspace.

## Colors

The palette pairs authoritative navy and warm orange with cool reading surfaces; frontmatter values are normative.

### Primary

- **Powertek Navy:** persistent navigation, public corridor fields, primary actions and deliverable panels. Fixed brand fields retain their navy in both themes.
- **Survey Orange:** active measurements, progress, selected indicators and keyboard focus; it does not replace semantic status text.

### Neutral

- **Inspection White:** light sheets and logo backing.
- **Workspace Slate:** background, copy, dividers, hover and soft-layer roles use the `workspace-*` tokens.
- **Night Slate:** `dark-*` tokens keep the same functional hierarchy in dark mode.
- **Public Reading Slate:** public copy and soft backgrounds use the `home-*` tokens.
- **Success / Error:** the workspace success and error tokens carry meaning alongside labels, icons and feedback text.

| CSS role | Light token | Dark token |
| --- | --- | --- |
| workspace background / panel | workspace-bg / white | dark-bg / dark-panel |
| workspace text / muted | workspace-text / workspace-muted | dark-text / dark-muted |
| workspace line / soft / hover | workspace-line / workspace-soft / workspace-hover | dark-line / dark-soft / dark-hover |
| workspace success / error | workspace-success / workspace-error | dark-success / dark-error |
| atlas ink / link | brand-navy / atlas-link | dark-atlas-ink / dark-atlas-link |
| home background / card | white / white | dark-bg / dark-panel |
| home ink / copy / line / soft | brand-navy / home-copy / workspace-line / home-soft | dark-home-ink / dark-home-copy / dark-line / dark-home-soft |

The theme selector is `:root[data-theme=dark]`; the saved preference is `powertek-theme`, with the system preference as the initial fallback.

**The Color Ownership Rule.** Use navy for structure, orange for selection and focus, and semantic status colours with explicit text.

## Typography

**Display Font:** Manrope, with Inter and sans-serif fallbacks. The local bold asset is `public/fonts/Manrope-Bold.ttf`.
**Body Font:** Inter, with system-ui and sans-serif fallbacks. The existing local variable asset is `public/fonts/InterVariable.woff2`.

Manrope carries public headings and the authentication context panel. Inter carries operating headings, labels, tables and measurements. Workspace numerals use tabular figures where compared; the operating foundation enables `cv11` and `ss01`.

### Hierarchy

- **Display:** responsive public hero; the mobile hero uses `clamp(36px, 8.2vw, 49px)` with line height (1.12).
- **Headline:** workspace/project titles; workspace titles reduce to (28px) at the mobile workspace breakpoint.
- **Title:** client section headings; project names use (15px), weight (650), line height (1.4).
- **Body:** operating text follows the frontmatter; public base copy uses (15px/1.7). Supporting workspace descriptions stay within (65ch).
- **Label:** labelled forms and controls, with compact secondary metadata where space requires it.
- **Authentication:** inputs use the mobile role at widths up to (760px), including sign-in, recovery and password setting. Never reduce these mobile fields below (16px).

## Layout

Public content uses a centred container capped at (1440px), initially `calc(100% - 96px)`. Gutters reduce to (32px) per side at (1200px), then (20px) at (600px). The hero introduces a full-width embedded workspace on a continuous navy field. The public navigation collapses at (900px); the hero stacks at (600px).

Private workspaces have a fixed navy rail (232px), a top bar (72px), content padding (35px 36px) and a maximum content width (1600px). At (900px) the rail becomes (214px). At (760px) content has no rail offset, padding becomes (25px 18px), the top bar becomes (66px), and navigation is an accessible drawer capped by `min(290px, calc(100vw - 32px))`.

The shared client overview uses a flexible project list and a deliverables column (285px), with a gap (28px). It stacks at (1200px); coverage detail disappears at (900px), and compact project symbols disappear at (440px). Authentication uses two balanced columns within (1240px), with a form capped at (420px); it stacks at (760px). Project summaries become two columns at (760px); mobile record tables become readable record rows at (600px). Keep scrolling and overflow available for dense tools.

The public website uses noninteractive dashboard images, with separate desktop/mobile and light/dark captures. The graphic has no nested scroll region, keyboard focus, project controls or downloads. Use the real client layout for captures rather than a separate public dashboard implementation.

## Elevation & Depth

Operating sheets are flat at rest: tonal contrast and thin dividers establish depth. The public embedded workspace has an ambient shadow (`0 24px 64px #020f413d`); the mobile public menu uses (`0 14px 35px #081d4220`). Active navy navigation uses an inset line (`inset 0 0 0 1px #4961a3`). Do not apply the public preview shadow to every operational sheet.

State transitions inherited from the operating foundation take (.16s) for background, border, shadow and transform. The public atlas route draws over (2.4s) with `cubic-bezier(.16,1,.3,1)`. Public, authentication, client overview and project-room motion respects `prefers-reduced-motion: reduce`.

## Shapes

Controls use the control radius; operating sheets and record containers use the sheet radius. Deliverable and authentication context panels use their larger named radii. Fine borders and route lines give structure; circles remain native map nodes, progress geometry and avatars. The public corridor enclosure has rounded upper corners (22px).

## Components

### Buttons

Compact, labelled actions use the primary and secondary variants. Workspace controls have minimum height (42px); the public action uses its own taller variant. Primary hover darkens the navy; secondary hover uses the soft surface. Global keyboard focus is an orange outline (3px) offset (3px); authentication fields use an orange focus-within outline (2px) offset (2px). Disabled buttons visibly reduce opacity and retain explanatory feedback.

### Chips / Availability

Status combines a clear label and icon. Shared project rows show “Ready to view” or “Update under review”; paused access uses muted colour. Review badges and progress steps show the release stage with text. A coloured dot alone is insufficient.

### Cards / Containers

Bordered sheets group operational work. The shared client overview favours divided project rows with project name, location, code, coverage and access action. A navy deliverables panel provides a distinct destination for released files. Project summaries use a single divided sheet rather than separate lifted metric cards.

### Inputs / Fields

Use persistent labels, bordered reading surfaces, clear focus and labelled password visibility. Authentication fields are (48px) high. Sign-in, password reset and invitation password setting share the same frame and mobile type rule. Retain alert/status text for errors, recovery confirmation and progress.

### Navigation

Use native anchors for route changes, public section links, project access, permanent project URLs and report destinations; production navigation depends on this behavior. Use buttons for local workspace tabs and state changes behind sign-in. Preserve visible current/pressed state, labelled icon controls, skip links and the mobile drawer's dialog semantics.

### Connected Client Evidence

`components/client-overview.tsx` renders the real client workspace. `components/client-dashboard-visual.tsx` shows static WebP captures of that workspace on the public website, with fictional isolated project data and no visible sample-data label. The public graphic has no working project controls, tour downloads or private API calls. Capture scripts and fictional data live in `tests/capture-client-dashboard.py` and `tests/client-dashboard-data.json`.

Clients see assigned/released work. A paused project must not offer a usable project link or disclose record counts, coverage or measurements; exported client summaries leave its numeric data empty. Administrators see people, permissions, review and release actions; employees see upload/edit actions only within their authorised project scope. Keep release, download availability, missing originals and the next permitted action explicit. Preserve server/database enforcement independently of the interface.

### Identity / Imagery

Use the fixed official `public/powertek-logo.svg` without changing proportions; retain a white backing where needed in dark navigation/authentication. `public/transmission-landscape.jpg` is a pre-existing marketing raster with embedded origin information; no source photographer was supplied. It illustrates the service context and is not survey evidence. This redesign introduces no AI-generated raster. Missing project originals require an explicit unavailable state and an authorised upload/recovery action.

## Do's and Don'ts

### Do:

- **Do** preserve the official logo, navy/orange identity and theme-specific reading surfaces.
- **Do** capture the real client overview for public graphics and keep operating controls behind sign-in.
- **Do** keep route navigation native, mobile authentication input text at least 16px and keyboard focus visible.
- **Do** pair availability and review states with labels and permitted next actions.

### Don't:

- **Don't** add a visible sample-data label to the public dashboard imagery or connect it to private records.
- **Don't** reveal paused client data, invent missing survey imagery or add unsupported company claims.
- **Don't** turn inherited decorative kickers, glyph icons or legacy display styling into reusable system rules.
