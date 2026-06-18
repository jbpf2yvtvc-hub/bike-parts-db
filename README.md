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

See [`docs/TECHNICAL_DESIGN.md`](docs/TECHNICAL_DESIGN.md) for the full spec.

---

## Repository layout

```
bike-parts-db/
├── client/              # SvelteKit app (the website)
├── server/              # PocketBase: Dockerfile + committed JS migrations
├── schemas/             # canonical part-type JSON (source of truth)
├── scripts/             # run-pb.sh, sync-schemas.mjs
└── docs/                # technical design
```

`schemas/` is canonical. `npm run sync:schemas` copies them into
`client/src/lib/schemas/` (which the app imports at build); this runs
automatically as part of `npm run build`.

---

## Prerequisites

- **Node 20+** (the stack uses Vite 5 + Tailwind v4).
- The PocketBase binary is downloaded automatically by `scripts/run-pb.sh`.

## Local development

Two processes: PocketBase (`:8090`) and SvelteKit (`:5173`).

```bash
# 1. Install + sync schemas
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
| `npm run build` | Sync schemas + production build (Cloudflare adapter) |
| `npm run check` | `svelte-check` type/diagnostics |
| `npm run lint` | ESLint (Svelte a11y rules as errors) |
| `npm run test:a11y` | axe-core via Playwright |
| `npm run sync:schemas` | Copy `schemas/*.json` into the client |

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
2. `npm run sync:schemas` (or just `npm run build`).
3. Redeploy. No backend change is needed — forms, validation, search, and the
   checklist pickers all read the schema.

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
