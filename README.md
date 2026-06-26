# Bike Parts DB

A personal inventory web app for tracking bicycle components and complete bikes,
plus an interactive **Build Checklist** that walks through every part needed to
assemble a bike and links each line item to parts already in your inventory.

- **Frontend:** SvelteKit (SSR) + TypeScript + Tailwind CSS v4 + Melt UI, deployed to **Cloudflare Pages**.
- **Backend:** PocketBase (SQLite, auth, file storage) on **Railway** (or Render).
- **Accessibility:** WCAG 2.2 AA, mobile-first, no-JS-first (JavaScript only enhances).

> The browser never contacts PocketBase directly and never learns its URL — all
> PocketBase access goes through SvelteKit server-side code under
> `client/src/lib/server/**`.

See [`docs/TECHNICAL_DESIGN.md`](docs/TECHNICAL_DESIGN.md) for the full spec
(§13 is the changelog of changes since the initial build).

---

## Features

- **Schema-driven parts.** Each part type is a JSON file in `schemas/`; forms,
  Zod validation, search, and checklist filters all derive from it. 24 types
  ship (frame, fork, drivetrain, chainrings, wheels, tires, brakes, etc.).
- **Quantity & multi-bike.** A part has a quantity and can be installed on up to
  that many bikes (one unit each); the add/edit form caps the selection.
- **Bikes** with their own records; parts reference the bikes they're on.
- **Build Checklist** per bike: a configurator (steerer, handlebar, chainrings,
  rear speeds, chain tension) with friction/indexed shifting, cross-axis
  visibility, freehub × speed compatibility, collapsible sections, an
  All / Installed / Needed view filter, and progress. Brake type is driven by
  the linked fork (front) and frame (rear), with front/rear calipers and
  left/right levers; drop-bar brifters fill both a shifter and a lever slot.
  - **Part linking** with compatibility pre-filtering; parts installed on the
    bike **auto-link** and auto-check their item.
- **Search** across parts (keyword + metadata), **CSV export** (parts + bikes).
- **Auth**: email/password, password reset, email-OTP MFA-ready, immutable
  username; sessions in an HttpOnly cookie set server-side.
- **Accessibility**: WCAG 2.2 AA, mobile-first, no-JS-first (JS only enhances);
  axe-core CI on every route.

---

## Repository layout

```
bike-parts-db/
├── client/              # SvelteKit app (the website)
├── server/              # PocketBase: Dockerfile + committed JS migrations
├── schemas/             # canonical part-type JSON (source of truth)
├── scripts/             # run-pb.sh
└── docs/                # technical design
```

`schemas/` is the single source of truth. The client imports the JSON files
directly from it at build time (via an `import.meta.glob` of `../../../schemas`
in `client/src/lib/schema-utils.ts`) — there is no generated copy to sync.

---

## Prerequisites

- **Node 20+** (the stack uses Vite 5 + Tailwind v4).
- The PocketBase binary is downloaded automatically by `scripts/run-pb.sh`.

## Local development

Two processes: PocketBase (`:8090`) and SvelteKit (`:5173`).

```bash
# 1. Install dependencies
npm run setup

# 2. Configure env
cp .env.example client/.env          # edit if needed; defaults point at local PB

# 3. Start PocketBase (downloads the binary on first run, applies migrations)
npm run pb

# 4. In a second terminal, start SvelteKit
npm run dev                          # http://localhost:5173
```

On first PocketBase boot the committed migrations in `server/pb_migrations/`
create the `bikes`, `parts`, and `checklist_progress` collections and extend the
built-in `users` collection (owner-scoped rules + immutable `username`). Create a
superuser if you want the admin UI:

```bash
server/pocketbase superuser upsert you@example.com yourpassword
# admin dashboard: http://127.0.0.1:8090/_/
```

### Useful scripts (run from the repo root)

| Command | Does |
|---|---|
| `npm run dev` | SvelteKit dev server |
| `npm run pb` | Download + run PocketBase locally with automigrate |
| `npm run build` | Production build (Cloudflare adapter) |
| `npm run check` | `svelte-check` type/diagnostics |
| `npm run lint` | ESLint (Svelte a11y rules as errors) |
| `npm run test:a11y` | axe-core via Playwright |

---

## Environment variables

Server-only — **never** prefix with `VITE_` (that would inline them into the
client bundle). Locally they live in `client/.env`; in production set them in the
Cloudflare Pages dashboard.

| Var | Purpose |
|---|---|
| `POCKETBASE_URL` | URL of the PocketBase instance (e.g. `https://your-app.railway.app`) |
| `SESSION_SECRET` | 32+ char random string (`openssl rand -base64 32`) |

---

## Deployment

### Frontend — Cloudflare Pages

The app uses `@sveltejs/adapter-cloudflare`. Connect the repo in the Cloudflare
Pages dashboard (build output `client/.svelte-kit/cloudflare`), or use
`.github/workflows/deploy.yml`. That workflow **skips itself (and passes) until
the Cloudflare secrets are present**, so it won't show failing runs before
you've set things up. To enable CI deploys, add `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` in **Settings → Secrets and variables → Actions**, and
create a Pages project named `bike-parts-db` (or edit the `--project-name` in
the workflow). Set `POCKETBASE_URL` and `SESSION_SECRET` in the Pages
environment variables (no `VITE_` prefix).

### Backend — PocketBase on Railway (or Render)

1. Deploy `server/Dockerfile` (pinned to PocketBase v0.39.x).
2. Mount a **persistent volume at `/pb_data`** so the SQLite file survives redeploys.
3. In the PocketBase admin → **Settings → Mail**, configure **Resend** SMTP so
   OTP, password-reset, and verification emails send.
4. Committed `pb_migrations/*.js` build the schema on first boot.

> Back up `pb_data` (copy the volume) before upgrading PocketBase — it is pre-1.0
> and may need occasional manual migration steps. The single SQLite file makes
> backup trivial.

---

## Extending

### Add a new part type

1. Create `schemas/<type_id>.json` (see existing files for the field format:
   `text`, `textarea`, `number`, `select`, `multiselect`, `boolean`, `date`,
   `relation`; each field may set `searchable`, `required`, `hint`, `inputmode`,
   `autocomplete`, `options`).
2. Redeploy. No backend change is needed — the client globs `schemas/` directly,
   so forms, validation, search, and the checklist pickers all read the schema.

> ⚠️ If the part type is used by the Build Checklist, its attribute **field ids
> and option strings must match** the filters in
> `client/src/lib/checklist-compatibility.ts` exactly — a mismatch silently
> yields empty pickers.

### Add a new checklist item

Edit `client/src/lib/checklist-data.ts`: add an item with a **stable kebab-case
`id`** to the right section. The progress/link key is `"<sectionId>::<itemId>"`,
so the title can change without orphaning saved progress. Add a compatibility
filter for it in `checklist-compatibility.ts` if it should offer a part picker.
Redeploy.
