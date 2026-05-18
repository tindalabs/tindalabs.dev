# tindalabs-dev

The [tindalabs.dev](https://tindalabs.dev) landing page. A Next.js 15 App Router site that documents and live-demos the full Tindalabs stack (Blindspot + Shield + Scent).

The **LiveStack** panel runs a real Shield assessment and a real Scent identity observation in your browser. The `infra/` folder contains a composed observability stack (OTel Collector + Tempo + Grafana) that aggregates traces from every product into one place.

## Repository layout

```
app/
  page.tsx          # Home page (async server component)
  globals.css       # Site-wide styles
components/
  Nav.tsx           # Top navigation
  CodeBlock.tsx     # Shiki syntax-highlighted code blocks (server component)
  LiveStack.tsx     # Live Shield + Scent demo panel (client component)
infra/
  docker-compose.yml          # Composed observability stack (this repo owns this)
  otel-collector.yaml         # Receives OTLP spans from browser + scent-server
  tempo.yaml                  # Trace backend
  grafana/provisioning/       # Datasource + dashboard providers
    datasources/tempo.yaml
    dashboards/providers.yaml
    # Dashboard JSON files are NOT stored here — they are bind-mounted from the
    # product repos at runtime. See docker-compose.yml volumes.
```

---

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- Sibling repos cloned alongside this one:
  - `../scent` — [github.com/tindalabs/scent](https://github.com/tindalabs/scent)
  - `../blindspot-ux` — [github.com/tindalabs/blindspot](https://github.com/tindalabs/blindspot)

Expected layout on disk:

```
local_repo/
  tindalabs-dev/    ← this repo
  scent/
  blindspot-ux/
```

---

## Full demo stack

This is the setup for running the complete demo at [tindalabs.dev](https://tindalabs.dev) locally — landing page, LiveStack panel, Observatory, and unified Grafana.

> **Note:** `infra/docker-compose.yml` owns ports **3100** (Grafana), **3200** (Tempo), and **4318** (OTel Collector). Do not run `../scent/docker-compose.yml` at the same time — it uses the same ports for its own observability stack.

### Step 1 — Composed observability stack

```bash
docker compose -f infra/docker-compose.yml up -d
```

| Service | URL | Purpose |
|---|---|---|
| Grafana | http://localhost:3100 | Unified dashboard — Blindspot + Scent (login: admin / admin) |
| Tempo | http://localhost:3200 | OTel trace backend |
| OTel Collector | http://localhost:4318 | OTLP ingest — browser SDK and scent-server export here |

Grafana loads two dashboards automatically:
- **Blindspot — Overview** — browser UX spans: sessions, rage clicks, navigation, API latency, JS errors
- **Scent Server — Overview** — identity resolutions, new vs returning, server errors, account links

Both dashboards are sourced live from the product repos via bind mounts. No copies are kept here.

### Step 2 — Scent data layer

```bash
cd ../scent
docker compose up -d postgres redis scent-server scent-observatory
```

| Service | URL | Purpose |
|---|---|---|
| scent-server | http://localhost:3004 | Identity API (used by Observatory) |
| Observatory | http://localhost:4000 | Identity management UI |
| PostgreSQL | localhost:5432 | Identity store |
| Redis | localhost:6379 | Rate limiting / cache |

> scent-server is configured to export OTel traces to `http://otel-collector:4318`. In the composed setup, point it at the host instead:

```bash
cd ../scent
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
docker compose up -d --force-recreate scent-server scent-observatory
```

### Step 3 — scent-server (local dev, for the LiveStack demo)

The LiveStack panel posts directly to scent-server from the browser. Run a local instance so the port is reachable from localhost:

```bash
cd ../scent
PORT=3003 OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
  npx tsx watch packages/server/src/index.ts
```

This connects to the PostgreSQL + Redis started in Step 2.

### Step 4 — Landing page

```bash
npm install
npm run dev
```

Next.js will select port 3002 if 3000–3001 are taken. Open [http://localhost:3002](http://localhost:3002), scroll to the **LiveStack** section, and click **Run**.

### Full data flow

```
Browser (tindalabs.dev)
  ├── @tindalabs/shield → assess()          (client-side, no network call)
  └── @tindalabs/scent-sdk → observe() + flush()
        └── POST http://localhost:3003/v1/events → scent-server (local)
              ├── PostgreSQL + Redis         (identity storage)
              └── OTLP → OTel Collector:4318 → Tempo → Grafana:3100
                                                         ├── Scent Server dashboard
                                                         └── Blindspot dashboard
```

---

## Per-product development

When working on a single product you do not need this repo's infra. Each product has its own self-contained docker-compose:

| Product | Command | Grafana |
|---|---|---|
| Scent | `cd ../scent && docker compose up -d` | http://localhost:3100 |
| Blindspot | `cd ../blindspot-ux && docker compose up -d` | http://localhost:3100 |

These stacks are **mutually exclusive with each other and with `infra/docker-compose.yml`** — all three use the same ports.

---

## Developing the landing page

The site has no API routes — it is a static marketing page plus the LiveStack client component. CodeBlock renders server-side via Shiki; no client-side JS is shipped for syntax highlighting.

To update the code examples, edit the `code` props in [app/page.tsx](app/page.tsx). Changes hot-reload immediately.

---

## Related repos

| Repo | Package | Description |
|---|---|---|
| [blindspot-ux](https://github.com/tindalabs/blindspot) | `@tindalabs/blindspot-react` | OTel browser observability |
| [shield](https://github.com/tindalabs/shield) | `@tindalabs/shield` | Tamper detection |
| [scent](https://github.com/tindalabs/scent) | `@tindalabs/scent-sdk` | Probabilistic identity continuity |
