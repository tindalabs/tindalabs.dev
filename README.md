# tindalabs-dev

The Tindalabs landing page, **live at
[tindalabs.github.io/tindalabs.dev](https://tindalabs.github.io/tindalabs.dev/)**.
A Next.js 15 App Router site that documents and live-demos the full Tindalabs
stack (Blindspot + Shield + Scent).

It ships as a **fully static export** (`output: 'export'`) deployed to **GitHub
Pages** — there is no backend. The **LiveStack** panel runs the entire stack in
the browser:

- **Shield** `assess()` — tamper detection, client-side by design.
- **Scent** — collects this browser's signals with `snapshot()` and scores them
  against a baseline saved in `localStorage` on a previous visit, using the same
  weighted-Jaccard engine the server runs (`@tindalabs/scent-engine`). Run it,
  reload, run again — Scent recognises you with a real confidence score. No
  server. (Server-only features — cross-device resurrection, account clustering —
  are shown as local-only stand-ins.)
- **Blindspot** — emits real OTel spans for navigation/click/fetch and renders
  the trace **in-page** instead of shipping to a collector.

The SDKs are consumed from **npm** (`@tindalabs/*`), so no sibling repos are
needed to build or deploy.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000 — scroll to LiveStack, click Run
```

## Build & deploy

```bash
npm run build    # static export → out/
```

`out/` is published to GitHub Pages by
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) on
every push to `main`. The custom domain is set via [`public/CNAME`](public/CNAME)
(`tindalabs.dev`); `public/.nojekyll` keeps Pages from stripping the `_next/`
directory.

**DNS (one-time):** point `tindalabs.dev` at GitHub Pages — apex `A`/`AAAA`
records to GitHub's Pages IPs (or `ALIAS`/`ANAME` to `<org>.github.io`), then set
the custom domain under the repo's **Settings → Pages**.

## Repository layout

```
app/
  page.tsx          # Home page (async server component, Shiki at build time)
  layout.tsx        # Site-wide Blindspot instrumentation (endpoint 404s harmlessly — no collector)
  globals.css
components/
  Nav.tsx           # Top navigation
  CodeBlock.tsx     # Shiki syntax-highlighted code blocks (server component)
  LiveStack.tsx     # Live Shield + Scent + Blindspot demo (client component, no backend)
public/
  CNAME, .nojekyll  # GitHub Pages custom domain + Jekyll opt-out
infra/              # OPTIONAL local observability stack — not used by the site
  docker-compose.yml          # OTel Collector + Tempo + Grafana
  otel-collector.yaml
  tempo.yaml
  grafana/provisioning/
```

## Optional: local trace stack

The site needs nothing beyond `npm`. The `infra/` folder is a convenience for
**local development** if you want to see real traces land in Grafana (e.g. while
working on the SDKs from source). It is not part of the deployed site.

```bash
docker compose -f infra/docker-compose.yml up -d
```

| Service | URL | Purpose |
|---|---|---|
| Grafana | http://localhost:3100 | Blindspot + Scent dashboards (admin / admin) |
| Tempo | http://localhost:3200 | OTel trace backend |
| OTel Collector | http://localhost:4318 | OTLP ingest |

To feed it real spans, point a Blindspot endpoint or a locally-run scent-server
at the collector. Dashboards are bind-mounted live from the product repos (see
`infra/docker-compose.yml`), so that path expects `../scent` and `../blindspot-ux`
cloned alongside this repo.

## Related repos

| Repo | Package | Description |
|---|---|---|
| [blindspot-ux](https://github.com/tindalabs/blindspot) | `@tindalabs/blindspot` | OTel browser observability |
| [shield](https://github.com/tindalabs/shield) | `@tindalabs/shield` | Tamper detection |
| [scent](https://github.com/tindalabs/scent) | `@tindalabs/scent-sdk` | Probabilistic identity continuity |
