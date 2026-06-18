# Bike Parts DB — Technical Design & Build Specification

**Version:** 1.0 (Consolidated, build-ready)
**Supersedes:** v0.1 through v0.5 (all prior versions folded in; corrections applied)
**Status:** Ready for implementation
**Intended build environment:** Claude Code (CLI or VS Code/desktop extension)

> This is a single self-contained specification. It does not refer back to earlier versions — everything needed to start building is here. Sections 1–8 define the application; Section 9 defines the Build Checklist feature; Section 10 is the ordered Claude Code build sequence; Section 11 lists corrections made during final review and known risks.

---

## 1. Project Overview

Bike Parts DB is a personal inventory web application for tracking bicycle components and complete bikes, plus an interactive **Build Checklist** that walks through every part needed to assemble a bike and links each line item to parts already in the user's inventory.

### Core requirements

- Schema-driven part types: each part type is defined by a JSON schema with its own typed attributes.
- Relational linking: parts reference the bike they are currently on; bikes are their own objects.
- Parts intake form with disposition flags (keep / for sale / donate / unknown).
- Keyword and metadata search across all parts.
- Passwordless-capable auth with email-based recovery and optional 2FA.
- User profile (username, display name, email, photo, bio, optional phone).
- Full CSV data export.
- WCAG 2.2 Level AA conformance.
- Mobile browser as the primary interface.
- Free to host; fully manageable via Claude Code.
- Warn before any destructive action.

### Explicitly out of scope

- Electronic/wireless shifting (Di2, AXS, Ekar) — permanently de-scoped, not deferred.
- SMS-based 2FA — no genuinely free SMS provider exists; email OTP is used instead.

---

## 2. Technology Stack

### 2.1 Framework — SvelteKit

The application is built with **SvelteKit** (server-side rendered) rather than a client-heavy SPA framework. This directly serves the three hard constraints: minimal JavaScript, WCAG 2.2 AA conformance, and mobile-first responsive design.

| Layer | Choice | Rationale |
|---|---|---|
| Framework | SvelteKit (SSR) | Server-renders HTML; ships ~10–25 KB JS per page; compiler emits accessibility warnings at build time |
| Language | TypeScript | Type-safe handling of dynamic part schemas |
| Styling | Tailwind CSS v4 | Mobile-first utilities; `prefers-reduced-motion`, `focus-visible` support |
| UI primitives | Melt UI | Headless, WCAG-correct Svelte primitives (dialog, combobox, etc.) |
| Validation | Zod | Server-side form validation; schemas derived from part-type JSON |
| Icons | Lucide Svelte | Inline SVG, no external requests |
| Deploy adapter | `@sveltejs/adapter-cloudflare` | Compiles SSR routes to Cloudflare Pages Functions |

> **Why not React/shadcn?** React produces JS-heavy SPAs that require manual ARIA wiring for routing and focus; shadcn/ui is React-only. SvelteKit's compiler-level a11y checks and SSR-by-default model make the accessibility and minimal-JS constraints far easier to satisfy. Melt UI is the Svelte equivalent of shadcn's headless approach.

### 2.2 Backend — PocketBase

**PocketBase** (current stable **v0.39.x**) is a single Go binary providing SQLite storage, an auto-generated REST API, file storage, built-in authentication (including OTP and MFA), and an admin dashboard. The application calls PocketBase **only from SvelteKit server-side code** — the browser never contacts PocketBase directly and never learns its URL.

| Concern | PocketBase capability |
|---|---|
| Database | Embedded SQLite |
| API | Auto-generated REST; consumed via the official JS SDK server-side |
| Auth | Email/password, **email OTP**, **MFA** — all built in since v0.23 |
| File storage | Native; used for avatars and (later) part images |
| Schema management | **JavaScript migrations** in `pb_migrations/` (see §2.5) |

> **Important version note:** PocketBase's prebuilt executable uses **JavaScript** migration files (`pb_migrations/*.js`), not Go. With the `--automigrate` flag (enabled by default in the prebuilt binary), any schema change made through the admin dashboard automatically writes a committable JS migration file. Collections can therefore be designed in the dashboard and the generated migrations committed to git, OR written by hand as JS. Do not use Go migration files unless compiling a custom PocketBase binary (not the plan here).

### 2.3 Hosting — all free tier

| Service | Purpose | Notes |
|---|---|---|
| Cloudflare Pages | SvelteKit frontend + SSR functions | ~100k requests/day free |
| Railway.app | PocketBase container | Credit-based free tier (~$5/mo credit; a minimal container fits). **Render.com** is a true-free-tier fallback (sleeps when idle — acceptable for personal use) |
| Resend.com | Transactional email via PocketBase SMTP | 3,000 emails/month free |
| Cloudflare R2 | Image storage (later phase) | 10 GB free, no egress fees |

### 2.4 Authentication design

- **Primary:** email + password, handled via SvelteKit form actions. Session token stored in an **HttpOnly cookie** set server-side (never readable by JS).
- **Password reset:** PocketBase's built-in email OTP / reset flow, delivered via Resend SMTP.
- **2FA (optional):** PocketBase native **MFA** — email/password + email **OTP** as the second factor. No third-party library and no SMS required.
- **Passkeys (later phase):** WebAuthn via `@simplewebauthn/*`. This is the one genuinely JS-dependent feature; email/password always remains available as a fallback.
- **Username** is set at registration and is **not editable** thereafter (enforced by a PocketBase collection rule and omitted from the profile edit form). Email and password are editable; email changes require re-verification of the new address.

### 2.5 Schema management approach

Collections are created via **hand-written or auto-generated JavaScript migrations** committed to `server/pb_migrations/`. The recommended workflow:

1. Run PocketBase locally with `--automigrate` (default).
2. Design or adjust collections in the admin dashboard.
3. PocketBase writes a timestamped `*.js` migration file automatically.
4. Commit those migration files to git so the schema is reproducible on deploy.

For deterministic first-time setup, the build sequence (§10) instead writes the initial collection migrations by hand as JS, so the repo can stand up a fresh PocketBase from scratch with no manual dashboard steps.

---

## 3. WCAG 2.2 AA Conformance

Conformance is built in from the start, verified at three levels (build-time, automated, manual).

### 3.1 Key commitments by principle

**Perceivable:** All images carry `alt` (Svelte compiler enforces). Semantic landmarks (`<nav>`, `<main>`, `<header>`). Text contrast ≥ 4.5:1 (≥ 3:1 large). All sizing in `rem`; layout reflows with no horizontal scroll at 320 px width and survives 200% zoom. Disposition states convey meaning by icon + text + colour, never colour alone.

**Operable:** Full keyboard operability; no keyboard traps (Melt UI manages focus traps with Escape release). Visible focus via `focus-visible:` utilities, never `outline:none` without replacement. Interactive targets ≥ 24×24 px (touch targets ≥ 44×44 px on mobile). Sticky-header offset handled with `scroll-margin-top` so focused elements are never obscured (SC 2.4.11).

**Understandable:** `<html lang="en">`. Correct `autocomplete` attributes on all inputs (SC 1.3.5). No navigation or submission on `change` alone. Errors identified in text, associated to fields via `aria-describedby`. Authentication imposes no cognitive test; password fields allow paste; passkeys (later) remove recall entirely (SC 3.3.8).

**Robust:** Native HTML elements wherever possible; custom widgets use Melt UI's correct ARIA patterns. Status messages use `aria-live="polite"` / `role="status"` so they announce without moving focus (SC 4.1.3).

### 3.2 Testing

1. **Build-time:** Svelte a11y lints set to error in ESLint; CI fails on violation.
2. **Automated:** axe-core via Playwright on every route.
3. **Manual:** keyboard-only walkthrough + VoiceOver pass on major flows per feature.

---

## 4. Mobile-First Responsive Design

- Built and reviewed at 320 px first; larger breakpoints (`sm` 640, `md` 768, `lg` 1024) add enhancements only.
- **Navigation:** bottom nav bar on mobile (≤ 5 targets, 44 px min height, icon + label); left sidebar on desktop (`lg:`). No hamburger menu.
- **Forms:** correct `type`/`inputmode`/`autocomplete` per field for the right mobile keyboard and autofill; labels always above fields (no float labels, no placeholder-only labels); errors render in static position below the field.
- **No-JS-first:** every core action works as plain HTML; JavaScript only enhances. See §6 for the per-feature breakdown.

---

## 5. Data Model

### 5.1 Part-type schemas (application logic, in `schemas/`)

Each part type is a JSON file in `schemas/`. These drive server-side form rendering, Zod validation, the search index, and the checklist compatibility filters. All part records live in one PocketBase `parts` collection with a `type_id` and a flexible `attributes` JSON field.

**Field types supported:** `text`, `textarea`, `number`, `select`, `multiselect`, `boolean`, `date`, `relation`. Each field may carry `searchable`, `required`, `hint`, `inputmode`, `autocomplete`, and (for selects) `options`.

The full set of part-type schema files to create is listed in §5.4.

### 5.2 PocketBase collections

#### `users` (extend the built-in auth collection)

| Field | Type | Notes |
|---|---|---|
| `username` | text | Unique; **immutable** after registration |
| `display_name` | text | Editable |
| `email` | email | Editable; re-verification required |
| `avatar` | file | Profile photo |
| `bio` | text | ≤ 280 chars |
| `phone` | text | Optional; reserved for future use |

#### `bikes`

| Field | Type | Notes |
|---|---|---|
| `owner` | relation → users | Required |
| `name` | text | e.g. "Red Commuter" |
| `make`, `model` | text | |
| `year` | number | |
| `color` | text | Searchable |
| `notes` | text | |
| `is_active` | bool | Currently ridden |

#### `parts`

| Field | Type | Notes |
|---|---|---|
| `owner` | relation → users | Required |
| `type_id` | text | Matches a `schemas/*.json` `type_id` |
| `attributes` | json | All type-specific values |
| `quantity` | number | How many of this part are owned (≥ 1, default 1) |
| `bikes` | relation → bikes (multi) | Which bikes it's installed on. A part may be on up to `quantity` bikes (one unit each); the cap is enforced in app code |
| `disposition` | select | `keep`, `for_sale`, `donate`, `unknown` |
| `acquisition_date` | date | Optional |
| `acquisition_price` | number | Optional |
| `asking_price` | number | Relevant when `disposition = for_sale` |
| `tags` | text | Concatenated searchable field values, rebuilt on save |
| `images` | file (multiple) | Later phase |

#### `checklist_progress`

| Field | Type | Notes |
|---|---|---|
| `bike` | relation → bikes | Required; one record per bike |
| `owner` | relation → users | Required |
| `config` | json | `{ fork, bar, brake, chainrings, rear_speeds, tension }` |
| `checked_items` | json | Array of stable item keys (see §9.2) |
| `part_links` | json | Map of item key → part ID |

All collections enforce owner-scoped read/write rules so a user can only ever access their own records.

### 5.3 Relationships

```
users ──< bikes
users ──< parts
users ──< checklist_progress
parts >── bikes              (a part may be on one bike)
checklist_progress >── bikes (one progress doc per bike)
```

### 5.4 Part-type schema files to create

Core: `frame`, `fork`, `headset`, `stem`, `handlebar`, `bottom_bracket`, `crankset`, `derailleur_front`, `derailleur_rear`, `cassette`, `chain`, `shifter`, `brake_caliper`, `brake_lever`, `wheel`, `seatpost`, `seatpost_clamp`, `saddle`.

Single-speed / tension: `cog`, `chain_tensioner`, `eccentric_bb`.

Key compatibility-bearing fields (must match the filter table in §9.5 exactly):

- `fork.brake_mount`: `boss (canti/V-brake)` | `disc IS` | `disc PM` | `none`
- `headset.standard`: `threaded` | `threadless EC` | `threadless ZS` | `threadless IS` | `threadless taper`
- `stem.style`: `quill (threaded)` | `threadless clamp-on`
- `handlebar.style`: `flat` | `drop` | `bullhorn` | `riser` | `moustache`
- `crankset.chainring_count`: `1` | `2` | `3`  *(plus `bcd_outer`, `bcd_inner` numbers)*
- `derailleur_rear.speed`, `cassette.speed`, `chain.speed`: `6`–`12`
- `derailleur_rear`: `clutch` (bool), `max_cog` (number), `total_capacity` (number)
- `cassette.freehub_standard` and `wheel.freehub_standard`: see the matrix in §9.4
- `wheel.position`: `front` | `rear`; `wheel.brake_type`: `rim` | `disc` | `rim and disc`; `wheel.speed_capacity`: `1`,`6`–`12`; `wheel.axle_standard`: QR/thru-axle/track variants
- `brake_caliper.style`: `cantilever` | `v-brake` | `center-pull` | `disc mechanical` | `disc hydraulic` | `caliper road` | `caliper dual pivot`
- `brake_lever.pull`: `short` | `long`; `brake_lever.mount`: `flat bar` | `drop bar`
- `shifter.hand`: `left` | `right`; `shifter.style`, `shifter.mount`
- `chain.width`: `1/8" (single-speed / track)` | `3/32" (6–12 speed derailleur)`
- `cog.tooth_count`, `cog.style`, `cog.thread_standard`
- `chain_tensioner.mount`, `chain_tensioner.chain_width`
- `eccentric_bb.shell_diameter`, `eccentric_bb.spindle_interface`, `eccentric_bb.included_bb` (bool)

---

## 6. Feature Implementation — No-JS-First

Every core feature works without JavaScript; JS enhances it. This table is the contract:

| Feature | Baseline (no JS) | Enhancement (JS) |
|---|---|---|
| Login / register / reset | HTML `<form method="POST">` → form action → HttpOnly cookie | inline validation feedback |
| Add / edit part | Form POST; part-type `<select>` triggers full reload to swap fields | fields swap inline on select change |
| Search | `<form method="GET">` → `?q=` → server renders results | debounced fetch, results update in place |
| Delete | "Delete" → confirmation **page** → POST `?/delete` | Melt UI `alertdialog`, same action |
| CSV export | plain `<a href="/export">` → server streams CSV | — |
| Checklist toggle | each toggle is a form POST | optimistic update + debounced batch save |
| Checklist part link | navigate to link-part page | Melt UI dialog loads same content via fetch |

### 6.1 Dynamic intake form

Server-side `load()` reads the chosen part-type schema; `schema-utils.ts` converts it to a Zod object (validation) and a field-config array (rendering). `FormField.svelte` renders one field: `<label>`, correct input type, `aria-describedby` hint, and inline error. Adding a new part type = add a JSON file + redeploy; no backend change.

### 6.2 Search

Baseline GET form to `/search?q=`; PocketBase filter `parts?filter=(owner='UID' && (tags~'Q' || type_id~'Q'))`. The `tags` field is a concatenation of every `searchable:true` attribute value, rebuilt whenever a part is saved, which keeps search filterable server-side.

### 6.3 CSV export

`/export/+server.ts` (GET) fetches the user's parts and bikes, flattens `attributes` JSON to columns via `papaparse` server-side, and streams two CSVs in a zip with `Content-Disposition: attachment`.

### 6.4 Delete protection

Two-step confirmation everywhere. Bike deletion does **not** cascade-delete parts — it removes the bike from each associated part's `bikes` relation (the parts themselves are kept), with the dialog stating this explicitly.

---

## 7. Repository Structure

```
bike-parts-db/
├── .github/workflows/
│   ├── deploy.yml              # Cloudflare Pages (auto on push to main)
│   └── a11y.yml                # axe-core via Playwright
├── client/                     # SvelteKit app
│   ├── src/
│   │   ├── app.html            # lang="en", viewport meta
│   │   ├── app.css             # Tailwind + custom properties
│   │   ├── lib/
│   │   │   ├── server/
│   │   │   │   ├── pb.ts        # PocketBase SDK — SERVER ONLY ($lib/server)
│   │   │   │   └── auth.ts      # session cookie helpers
│   │   │   ├── schemas/         # part-type JSON (imported at build)
│   │   │   ├── schema-utils.ts  # schema → Zod + field config
│   │   │   ├── checklist-data.ts            # checklist items (typed, stable IDs)
│   │   │   ├── checklist-compatibility.ts   # item key → PB filter
│   │   │   ├── freehub-compatibility.ts     # freehub × speed matrix
│   │   │   └── export.ts        # CSV
│   │   ├── components/
│   │   │   ├── FormField.svelte
│   │   │   ├── PartCard.svelte  · BikeCard.svelte · DispositionBadge.svelte
│   │   │   ├── DeleteConfirm.svelte
│   │   │   ├── BottomNav.svelte · SideNav.svelte
│   │   └── routes/
│   │       ├── +layout.svelte           # shell, skip link, nav
│   │       ├── +layout.server.ts        # auth guard
│   │       ├── login/ · register/ · profile/
│   │       ├── parts/  (list · [id] · [id]/edit · new · [id]/confirm-delete)
│   │       ├── bikes/  (list · [id] · [id]/edit · new · [id]/confirm-delete)
│   │       │   └── [id]/checklist/       # the Build Checklist (§9)
│   │       │       ├── +page.svelte · +page.server.ts
│   │       │       ├── config/+server.ts
│   │       │       └── link-part/+page.server.ts · +page.svelte
│   │       ├── search/
│   │       └── export/+server.ts
│   ├── svelte.config.js · vite.config.ts · tailwind.config.ts · package.json
├── server/
│   ├── pb_migrations/          # JavaScript migration files (committed)
│   ├── pb_hooks/               # optional JS hooks
│   └── Dockerfile              # Railway deploy
├── schemas/                    # canonical part-type JSON (source of truth)
├── docs/TECHNICAL_DESIGN.md    # this document
├── .env.example · README.md
```

> `client/src/lib/server/**` is SvelteKit's enforced server-only boundary: importing it into client code is a build error. The PocketBase URL and any admin credentials live here and never reach the browser.

---

## 8. Deployment

### 8.1 Frontend — Cloudflare Pages

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';
export default { kit: { adapter: adapter() } };
```

Server-only env vars in the Cloudflare Pages dashboard (**no `VITE_` prefix** — that would inline them into the client bundle):

```
POCKETBASE_URL=https://<your-app>.railway.app
SESSION_SECRET=<32+ char random>
```

### 8.2 Backend — PocketBase on Railway

```dockerfile
# server/Dockerfile
FROM alpine:latest
ARG PB_VERSION=0.39.4
RUN apk add --no-cache unzip ca-certificates wget
RUN wget -q https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
 && unzip pocketbase_${PB_VERSION}_linux_amd64.zip && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
 && mv pocketbase /usr/local/bin/pocketbase
EXPOSE 8090
CMD ["pocketbase", "serve", "--http=0.0.0.0:8090"]
```

- Mount a Railway **persistent volume** at `/pb_data` so data and the SQLite file survive redeploys.
- Configure SMTP in the PocketBase admin → Settings → Mail (Resend host/credentials) so OTP, reset, and verification emails send.
- Commit `pb_migrations/*.js` so a fresh container builds the schema on first boot.

### 8.3 CI/CD

Cloudflare Pages and Railway both auto-deploy on push to `main` once connected to the GitHub repo. `a11y.yml` runs axe-core against the preview URL and blocks merges that introduce violations.

---

## 9. Build Checklist Feature

### 9.1 Overview

The Build Checklist is a configuration-driven assembly guide, ported from the existing standalone HTML checklist artifact and accessed at `/bikes/[id]/checklist` — always tied to a specific bike. It keeps all original behaviour (configurator-driven visibility, conditional notes/warnings, collapsible sections, search, progress) and adds inventory linking: each line item can be linked to a part the user owns, showing whether that part is already on a bike and which one.

Progress and configuration persist in the `checklist_progress` PocketBase record for that bike (not localStorage).

### 9.2 Data architecture and item keys

Checklist line items are **code, not data** — defined in `checklist-data.ts`, version-controlled, bundled at build. PocketBase stores only per-bike progress, links, and config. Editing the checklist is a code change + redeploy.

Each item carries a **stable `id`** (kebab-case, unique within its section). The progress/link key is `"<sectionId>::<itemId>"` (e.g. `bb::bottom-bracket`), **never** the display title — titles can change without orphaning saved progress. The `ChecklistItem` type allows `t` (title) and `n` (note) to be either a string or a `(cfg) => string` function, so titles like "Rear derailleur — 10-speed" regenerate from the live config.

### 9.3 Configurator axes

| Axis | UI label | Values | Default | Visible when |
|---|---|---|---|---|
| `fork` | Steerer / stem | `threaded`, `threadless` | `threaded` | always |
| `bar` | Handlebar type | `flat`, `drop` | `flat` | always |
| `brake` | Brake type | `canti`, `vbrake`, `cp`, `disc-short`, `disc-long` | `canti` | always |
| `chainrings` | Chainrings at crank | `1`, `2`, `3` | `2` | always |
| `rear_speeds` | Speeds at rear | `1`, `6`, `7`, `8`, `9`, `10`, `11`, `12` | `10` | always |
| `tension` | Chain tension method | `horizontal`, `tensioner`, `ebb` | `horizontal` | only when `rear_speeds = 1` |

The subtitle regenerates from config (`buildSubtitle(cfg)`): e.g. "2×10 mechanical drivetrain", "1×12 mechanical drivetrain", "single-speed".

**Cross-axis behaviour:**
- `chainrings = 1` → front derailleur and left shifter items are **hidden entirely** (not greyed) — a 1× build genuinely has neither.
- `rear_speeds = 1` → rear derailleur, cassette, and quick-link items hidden; single-speed/track cog and single-speed chain (1/8") items shown; the `tension` axis appears.
- `tension = ebb` → the standard `bottom_bracket` item is hidden and replaced by the `eccentric_bb` item (the EBB is the bottom bracket).
- `tension = tensioner` → the chain-tensioner item appears.
- `tension = horizontal` → neither tensioner nor EBB item appears.

**Unusual-combination warnings** (shown, never blocked) via `warn_when` entries: `3×11/12`, `2×12`, `3×1`, and `1×1` (treated as fixed/single-speed). The 3×1 case is fully handled by the `tension` axis — pick `tensioner` or `ebb` for vertical dropouts.

### 9.4 Freehub × rear-speed compatibility matrix

| Freehub / hub standard | Compatible `rear_speeds` |
|---|---|
| Shimano HG (standard/short) | 6, 7, 8, 9, 10 |
| Shimano HG (11-speed road, long body) | 11 |
| Shimano Micro Spline | 12 |
| SRAM XD | 11, 12 |
| SRAM XDR | 11, 12 |
| Campagnolo | 9, 10, 11, 12 |
| Single-speed freewheel thread / Track / Flip-flop | 1 |

Encoded in `freehub-compatibility.ts` as `freehubCompatible(standard, rearSpeeds)` and `getCompatibleFreehubStandards(rearSpeeds)`.

### 9.5 Part linking and compatibility pre-filtering

Opening a line item's part picker pre-filters the user's inventory by the current config. Filters are defined in `checklist-compatibility.ts` as `getCompatibilityFilter(itemKey, cfg): string | null` returning a PocketBase filter string (or null = no filter / no picker, e.g. tools and consumables).

**Compatibility mapping (keys use stable IDs):**

| Item key | Condition | PocketBase filter | Post-fetch filter (server-side TS) |
|---|---|---|---|
| `frame::frame` | always | `type_id='frame'` | — |
| `frame::fork` | `brake:disc-*` | `type_id='fork' && attributes.brake_mount~'disc'` | — |
| `frame::fork` | `brake:canti\|cp\|vbrake` | `type_id='fork' && attributes.brake_mount~'boss'` | — |
| `frame::headset-threaded` | `fork:threaded` | `type_id='headset' && attributes.standard~'threaded'` | — |
| `frame::headset-threadless` | `fork:threadless` | `type_id='headset' && attributes.standard~'threadless'` | — |
| `stem::stem-quill` | `fork:threaded` | `type_id='stem' && attributes.style~'quill'` | — |
| `stem::stem-threadless` | `fork:threadless` | `type_id='stem' && attributes.style~'threadless'` | — |
| `bb::bottom-bracket` | `tension≠ebb` | `type_id='bottom_bracket'` | — |
| `bb::eccentric-bb` | `rear_speeds:1 && tension:ebb` | `type_id='eccentric_bb'` | — |
| `bb::crankset` | `chainrings:N` | `type_id='crankset' && attributes.chainring_count='N'` | — |
| `drivetrain::front-derailleur` | `chainrings:2\|3` | `type_id='derailleur_front'` | — |
| `drivetrain::rear-derailleur` | `rear_speeds:6–12` | `type_id='derailleur_rear' && attributes.speed='<rear_speeds>'` | — |
| `drivetrain::cassette` | `rear_speeds:6–12` | `type_id='cassette' && attributes.speed='<rear_speeds>'` | `freehubCompatible(part.attributes.freehub_standard, rear_speeds)`; if a rear wheel is already linked, also require matching `freehub_standard` |
| `drivetrain::chain` | `rear_speeds:6–12` | `type_id='chain' && attributes.speed='<rear_speeds>'` | — |
| `drivetrain::chain` | `rear_speeds:1` | `type_id='chain' && attributes.width~'1/8'` | — |
| `drivetrain::cog` | `rear_speeds:1` | `type_id='cog'` | — |
| `drivetrain::chain-tensioner` | `rear_speeds:1 && tension:tensioner` | `type_id='chain_tensioner'` | — |
| `shifting::left-shifter` | `chainrings:2\|3` | `type_id='shifter' && attributes.hand='left'` | — |
| `shifting::right-shifter` | always | `type_id='shifter' && attributes.hand='right'` | — |
| `bars::handlebar-flat` | `bar:flat` | `type_id='handlebar' && attributes.style~'flat'` | — |
| `bars::handlebar-drop` | `bar:drop` | `type_id='handlebar' && attributes.style~'drop'` | — |
| `brakes::caliper-canti` | `brake:canti` | `type_id='brake_caliper' && attributes.style~'cantilever'` | — |
| `brakes::caliper-vbrake` | `brake:vbrake` | `type_id='brake_caliper' && attributes.style~'v-brake'` | — |
| `brakes::caliper-cp` | `brake:cp` | `type_id='brake_caliper' && attributes.style~'center-pull'` | — |
| `brakes::caliper-disc` | `brake:disc-*` | `type_id='brake_caliper' && attributes.style~'disc'` | — |
| `brakes::lever` | `bar:flat, brake:canti\|cp` | `type_id='brake_lever' && attributes.pull~'short' && attributes.mount~'flat'` | — |
| `brakes::lever` | `bar:flat, brake:vbrake` | `type_id='brake_lever' && attributes.pull~'long' && attributes.mount~'flat'` | — |
| `brakes::lever` | `bar:drop` | `type_id='brake_lever' && attributes.mount~'drop'` | — |
| `wheels::front-wheel` | `brake:disc-*` | `type_id='wheel' && attributes.position='front' && attributes.brake_type~'disc'` | — |
| `wheels::front-wheel` | `brake:canti\|vbrake\|cp` | `type_id='wheel' && attributes.position='front' && attributes.brake_type~'rim'` | — |
| `wheels::rear-wheel` | `rear_speeds:1` | `type_id='wheel' && attributes.position='rear' && attributes.freehub_standard~'track\|flip-flop\|single-speed'` | — |
| `wheels::rear-wheel` | `rear_speeds:6–12` | `type_id='wheel' && attributes.position='rear'` | `freehubCompatible(...)`; incompatible wheels shown in a separate "Incompatible with current configuration" group, **not hidden** |
| `seatpost::seatpost` | always | `type_id='seatpost'` | — |
| `seatpost::saddle` | always | `type_id='saddle'` | — |
| `seatpost::seatpost-clamp` | always | `type_id='seatpost_clamp'` | — |

**Two-step filtering** (used where a row has a post-fetch filter): PocketBase cannot run the freehub matrix, so the server first queries by `type_id`/attributes, then applies the TS predicate in the SvelteKit `load()` before rendering. This is fine at personal-inventory scale (hundreds of parts). At very large scale it would need denormalising; see §11 risks.

**Picker behaviour:**
- Linked part shows type + key attributes + current bike: "On this bike ✓", "📍 On: <bike name>", or "In inventory · not on a bike".
- Linking a part **auto-checks** its checklist item: the item's checkbox renders **checked and disabled (inactive)** while a part is linked. **Unlinking** the part re-enables the checkbox and clears the auto-check, so it can be toggled manually again. (This supersedes the earlier design where checking and linking were independent.) Implementation: `linkPart` adds the item key to `checked_items`; `unlinkPart` removes it; because a disabled checkbox does not submit its value, `saveChecks` unions the submitted checks with every linked item key so linked items stay checked. Progress (`done`/`total`) counts an item as done when it is manually checked **or** has a linked part.
- **Quantity & availability:** parts carry a `quantity` and can be installed on up to that many bikes (multi-relation `bikes`). The part picker shows each part's quantity and how many units are still available (`quantity − bikes assigned`), and the part add/edit form caps the bike multi-select at the quantity.
- **Auto-linking from bike assignment:** any part whose `bikes` include the checklist's bike is matched to its checklist item and shown as linked automatically (source `bike`), so installing a part on a bike — via the part's add/edit form — is reflected in that bike's checklist with no manual step. This is derived at load time (not persisted), so it always tracks the current part records; it takes precedence over a manual link for the same item. A part is matched to an item by evaluating the item's `getCompatibilityFilter` string against the part (`matchItemForPart`), keeping a single source of truth for compatibility. Auto-linked items show **View part / Edit · reassign bike** instead of *Unlink* (to remove it, change the part's bike). Manual links (for parts not on the bike, e.g. planning a build) keep *Change / Unlink*.
- Zero compatible results → "No compatible parts found" with **[+ Add a new part]** (`/parts/new?type=<type_id>`) and **[Show all parts anyway]** (drops the filter for that picker session only).
- Incompatible-but-owned parts are surfaced in a separate labelled group rather than hidden, so the user never thinks an item they own has vanished.

### 9.6 Visual identity

`#f5c800` yellow, dark `#0e0e0e` ground, the sticky configurator bar with yellow bottom border, section headers, progress bar, and coloured tag chips. The one addition — the per-item inventory panel — uses the app's standard card styling to visually separate "checklist content" (logic) from "inventory reference" (user data). All colours must still meet the §3 contrast commitments.

**Heading typography (app-wide):** headings use **Jost** — a free, geometric Futura-style face — applied to all `h1`–`h6` (and the brand mark) via a global rule plus the `--font-display` / `--font-condensed` tokens, set in **all-caps** with slight positive letter-spacing. (This replaces the original Bebas Neue + Barlow Condensed; the body text remains `system-ui`.) The font is loaded with `display=swap` and degrades to `system-ui`.

**Section collapse & view filter:** each checklist section is a native `<details open>` (collapsible with no JS). A view filter — **All** (default) / **Installed** (done) / **Needed** (not done) — narrows the visible items; with no JS it is the `?view=` query param (server-rendered), and with JS it filters in place. Because a non-rendered checkbox can't submit, the no-JS form also emits hidden inputs for any checked item the filter hides, so a Save never drops them.

---

## 10. Claude Code Build Sequence

Each step is a discrete Claude Code session. Hand them over in order. Steps 1–10 stand up the core app; 11–20 add the checklist.

**1 — Scaffold.** "Create a monorepo `bike-parts-db`. In `client/`, scaffold SvelteKit + TypeScript with `@sveltejs/adapter-cloudflare`. Add Tailwind CSS v4 (mobile-first), Melt UI, Lucide Svelte. Create `server/` and `schemas/`. Init git with a Node `.gitignore` and a root `README.md`."

**2 — Accessibility foundations.** "Set `lang='en'` in `app.html`; add a skip-link as the first focusable element in `+layout.svelte`. Configure ESLint with `eslint-plugin-svelte`, a11y rules as errors. Add a `prefers-reduced-motion` block in `app.css`. Build `BottomNav.svelte` (44 px targets) and `SideNav.svelte`, switched by the `lg:` breakpoint."

**3 — PocketBase local + initial migrations.** "Add `server/Dockerfile` pinned to PocketBase v0.39.x. In `server/pb_migrations/`, write **JavaScript** migration files (not Go) that create the `bikes`, `parts`, and `checklist_progress` collections and extend the built-in `users` auth collection per the technical design, with owner-scoped read/write rules and an immutable `username` rule. Add a root script to run PocketBase locally on :8090 with automigrate enabled."

**4 — Server-only PB client + auth.** "Add the PocketBase JS SDK. Create `client/src/lib/server/pb.ts` (server-only) reading `POCKETBASE_URL`. Build `login`, `register`, and password-reset pages as HTML `<form method='POST'>` with form actions; set an HttpOnly session cookie; guard routes in `+layout.server.ts`. Wire password reset to PocketBase's email flow. Configure the users collection so email/password auth works and enable email **OTP** for optional MFA."

**5 — Schema engine + intake form.** "Create the core `schemas/*.json` files listed in §5.4 (start with `bottom_bracket`, `frame`, `wheel`). Build `schema-utils.ts` (schema → Zod + field config) and `FormField.svelte`. Build `/parts/new` server-rendered, with JS enhancement to swap fields on type-select change."

**6 — Parts CRUD.** "Build `/parts` list, `/parts/[id]`, `/parts/[id]/edit`. Add the disposition selector and bike dropdown. `DispositionBadge.svelte` uses icon + text + colour. Delete via `/parts/[id]/confirm-delete` page (no-JS) plus a Melt UI dialog enhancement. All targets ≥ 44 px."

**7 — Bikes CRUD.** "Build `/bikes` list, `/bikes/[id]` (showing parts currently on the bike), edit, and confirm-delete. Bike deletion removes the bike from each part's `bikes` relation rather than deleting the parts — state this in the dialog."

**8 — Search.** "Build `/search`: baseline `<form method='GET'>` → `?q=` → server filter; then a debounced-fetch enhancement. Rebuild a part's `tags` index field from its searchable attributes on every save."

**9 — Profile + export.** "Build `/profile` (display name, email, bio, avatar, phone; username shown read-only). Build `/export/+server.ts` streaming parts and bikes as CSVs in a zip via papaparse."

**10 — Deploy core.** "Verify `adapter-cloudflare`. Add `.github/workflows/deploy.yml`. Document the Cloudflare env vars (`POCKETBASE_URL`, `SESSION_SECRET`, no `VITE_` prefix). Write Railway instructions: deploy the Dockerfile, mount a volume at `/pb_data`, set Resend SMTP in the PocketBase admin. Confirm committed `pb_migrations` build the schema on a fresh container."

**11 — Checklist data port.** "Create `checklist-data.ts` from the existing HTML artifact's `DATA` array. Type each item with a stable kebab-case `id`; allow `t` and `n` to be string or `(cfg)=>string`. `ChecklistConfig = { fork, bar, brake, chainrings:'1'|'2'|'3', rear_speeds:'1'|'6'..'12', tension:'horizontal'|'tensioner'|'ebb' }`. Port `conditionMet`, `itemVisible`, `getDynamicNote`, `getDynamicWarn`; add `buildSubtitle`. The progress key is `"<sectionId>::<itemId>"`."

**12 — Freehub + compatibility modules.** "Create `freehub-compatibility.ts` (matrix + `freehubCompatible` + `getCompatibleFreehubStandards`). Create `checklist-compatibility.ts` implementing `getCompatibilityFilter(itemKey, cfg)` exactly per the §9.5 table, including the post-fetch freehub cases."

**13 — Remaining schemas.** "Create all remaining `schemas/*.json` from §5.4, including `crankset` (`chainring_count`, `bcd_outer`, `bcd_inner`), `wheel` (`position`, `brake_type`, `freehub_standard`, `speed_capacity`, `axle_standard`), `cassette` (`speed`, `freehub_standard`, `range`), `derailleur_rear` (`speed`, `clutch`, `max_cog`, `total_capacity`), `chain` (`speed`, `width`), `brake_caliper.style`, `brake_lever` (`pull`, `mount`), `shifter` (`hand`, `style`, `mount`), `cog`, `chain_tensioner`, `eccentric_bb`. Field option values must match the §9.5 filters exactly."

**14 — Checklist route (SSR).** "Build `/bikes/[id]/checklist`: `+page.server.ts` fetches the bike, fetches-or-creates `checklist_progress`, restores config. Render configurator, progress bar, sections, items. Item toggle = form POST `?/toggleItem`. Config change = POST to `config/+server.ts`. Works with no JS."

**15 — Configurator + cross-axis logic.** "Add the six configurator controls; render `tension` only when `rear_speeds==='1'`. Implement the cross-axis visibility from §9.3 (hide FD + left shifter when `chainrings==='1'`; single-speed swaps; `tension:ebb` hides `bottom_bracket` and shows `eccentric_bb`). Subtitle uses `buildSubtitle`. Add the unusual-combination `warn_when` entries."

**16 — Part picker + linking.** "Build `link-part/+page.server.ts`: read `?item=`, resolve the compatibility filter, query owner-scoped parts, apply any post-fetch freehub predicate, render the picker showing each part's key attributes and current bike. Surface incompatible-but-owned parts in a separate group. Empty state offers [+ Add a new part] (`/parts/new?type=…`) and [Show all parts anyway]. Link writes to `checklist_progress.part_links` via `?/linkPart`."

**17 — JS enhancements.** "In `+page.svelte`: (a) configurator changes update the view client-side via the ported utilities, then debounce-save config; (b) item toggles update optimistically, then debounce-save; (c) 'Link a part' opens the link-part content in a Melt UI dialog. All three degrade to the no-JS paths."

**18 — Visual port.** "Apply the artifact's identity (Bebas Neue, Barlow Condensed, `#f5c800`, dark ground, sticky yellow-bordered configurator, section headers, progress bar, tag chips). The per-item inventory panel uses the app card style. Verify every colour pair meets the §3 contrast commitments."

**19 — a11y CI.** "Add `.github/workflows/a11y.yml` running axe-core via Playwright against the preview URL on every route, failing the build on violations."

**20 — Docs.** "Write `README.md`: local dev (run PocketBase + SvelteKit), env vars, deploy steps for Cloudflare and Railway, and how to add a new part type (add `schemas/x.json`, redeploy) and a new checklist item (add to `checklist-data.ts` with a stable id, redeploy)."

---

## 11. Final Review — Corrections Applied & Known Risks

### Corrections made in this consolidation

1. **PocketBase migration format corrected.** Earlier drafts specified Go migration files (`003_checklist.go`) with the prebuilt binary. The prebuilt PocketBase executable uses **JavaScript** migrations (`pb_migrations/*.js`); Go migrations require compiling a custom binary. All migration steps now specify JS.
2. **PocketBase version updated** from v0.23.x to **v0.39.x** (current stable), and the Dockerfile pin updated accordingly.
3. **2FA simplified.** Earlier drafts proposed `otplib`/TOTP as a future add. PocketBase now has **native email OTP and MFA** (since v0.23), so 2FA needs no third-party library and no SMS. Updated in §2.4.
4. **Crankset field name unified** to `chainring_count` everywhere (an earlier table used `rings`).
5. **Item keys unified to stable IDs.** Compatibility tables previously mixed title-based keys (`bb::Bottom bracket`) with the stable-id approach. All keys are now id-based (`bb::bottom-bracket`), consistent with the resolved progress-key design.
6. **EBB placement fixed.** The eccentric BB item now lives in the `bb` section (`bb::eccentric-bb`) where it logically replaces the bottom bracket, not in `drivetrain`.
7. **Electronic shifting removed entirely** from scope, including from Open Questions.

### Known risks and watch-items

- **PocketBase is pre-1.0 and single-maintainer.** Backward compatibility is not guaranteed before v1.0; the project advises reading the changelog and applying occasional manual migration steps. Mitigation: pin the version in the Dockerfile; keep `pb_data` backed up (copy the volume before upgrades); the single SQLite file makes backup trivial.
- **No encryption at rest.** PocketBase relies on disk-level encryption. For a personal parts inventory this is acceptable; note it if scope ever changes.
- **Railway free tier is credit-based**, not unconditionally free. Monitor usage; Render.com is the documented fallback (it sleeps when idle, which is fine here).
- **Two-step compatibility filtering** (PocketBase query + server-side predicate) is intentionally simple and correct at personal scale (hundreds of parts). If inventory ever reached many thousands, the freehub predicate should be denormalised into a stored attribute so it can be filtered in-query.
- **`attributes` JSON filter coupling.** The §9.5 filters depend on exact attribute field IDs and option strings in the part-type schemas. Keep `schemas/*.json` and `checklist-compatibility.ts` in sync; a mismatch silently yields empty pickers. Step 13 calls this out, but it's the most likely place for a quiet bug.
- **PocketBase admin UI is being rewritten** around recent versions; admin-screen instructions may shift. The migration-as-code approach in this design avoids depending on specific dashboard steps for setup.

---

## 12. References

| Resource | URL |
|---|---|
| SvelteKit | https://kit.svelte.dev/docs |
| SvelteKit form actions | https://kit.svelte.dev/docs/form-actions |
| adapter-cloudflare | https://kit.svelte.dev/docs/adapter-cloudflare |
| Melt UI | https://melt-ui.com/ |
| Tailwind CSS v4 | https://tailwindcss.com/docs |
| WCAG 2.2 quick reference | https://www.w3.org/WAI/WCAG22/quickref/ |
| PocketBase docs | https://pocketbase.io/docs/ |
| PocketBase JS migrations | https://pocketbase.io/docs/js-migrations/ |
| PocketBase authentication (OTP/MFA) | https://pocketbase.io/docs/authentication/ |
| PocketBase JS SDK | https://github.com/pocketbase/js-sdk |
| SimpleWebAuthn (passkeys, later phase) | https://simplewebauthn.dev/docs/ |
| axe-core | https://github.com/dequelabs/axe-core |
| Playwright | https://playwright.dev/ |
| Resend | https://resend.com/docs |
| Railway | https://docs.railway.app/ |
| Cloudflare Pages | https://developers.cloudflare.com/pages/ |
| Cloudflare R2 | https://developers.cloudflare.com/r2/ |
