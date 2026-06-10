# tindalabs-dev — Roadmap

The marketing landing page and unified observability stack for [tindalabs.dev](https://tindalabs.dev).

---

## Planned Work

### 1. Production Deployment

**Priority**: Critical | **Effort**: 1–2 hours | **Status**: Done ✅

Shipped as a **static export to GitHub Pages** (free, $0, no backend, no abuse surface) rather than Vercel/Fly — the site is fully client-rendered, so static is the right fit.

#### Tasks
- [x] `next.config.ts` → `output: 'export'` (+ `images.unoptimized`); removed the dev-only `rewrites()`
- [x] `.github/workflows/deploy-pages.yml` — build + publish `out/` to Pages on every push to `main`
- [x] Custom domain via `public/CNAME` (`tindalabs.dev`) + `public/.nojekyll`; deploy path documented in README
- [ ] One-time: point `tindalabs.dev` DNS at GitHub Pages and set the custom domain under Settings → Pages

---

### 2. Hosted Demo Endpoint — OBVIATED

**Priority**: ~~High~~ | **Status**: Resolved by going client-side ✅

Originally the LiveStack panel POSTed to a scent-server at `localhost:3003`, so every public visitor hit a silent error. Rather than host (and harden, rate-limit, and pay for) a public scent-server, the demo now runs **fully in the browser**: Scent collects signals with `snapshot()` and scores them against a `localStorage` baseline using `@tindalabs/scent-engine`; Blindspot renders its spans in-page; Shield was already client-side. No endpoint to stand up, no abuse/privacy surface, no broken-demo risk.

#### Tasks
- [x] Rework `LiveStack.tsx` Scent path to score client-side against a localStorage baseline (real confidence on reload)
- [x] `identify()` → local-only stand-in (localStorage link counter); copy explains the server-backed version
- [x] Blindspot Row → in-page trace tree built from real `getTracer()` spans (no collector)
- [ ] *(deferred)* If server-only features (resurrection / account clustering) ever need a live demo, stand up a minimal, API-keyed, rate-limited scent-server on Fly/Railway — **not** the full stack, and never Grafana/Tempo publicly

---

### 3. npm Package Transition

**Priority**: High | **Effort**: 30 minutes | **Status**: Done ✅

#### Tasks
- [x] Added `@tindalabs/*` as npm dependencies (`package.json`); documented in README
- [x] Removed the disk aliases from `next.config.ts` **and** `tsconfig.json` paths (both were redirecting to sibling source)
- [x] Verified the production static build passes with npm-sourced packages (worked around a shield dist `@/` self-import — see `next.config.ts`)

---

### 4. UX Improvements

**Priority**: Medium | **Effort**: 1–2 hours | **Status**: To do

Small DX improvements that reduce friction for visitors.

#### Tasks
- [ ] Add "copy to clipboard" button on all `npm install` lines and code blocks
- [ ] Add a "Why not X?" comparison section (Blindspot vs Datadog RUM, Shield vs disable-devtool, Scent vs FingerprintJS OSS)
- [ ] Add a shareable / copy-to-clipboard output for the LiveStack `assess()` result
- [ ] Verify mobile layout — confirm "Open source · Self-hostable · Composable" chips are visible above the fold

---

## Advisory Backlog — 2026-05-19

Findings from a full C-level assessment (CTO / CPO / COO / CMO / CFO + competitive research).
Overall score: **6.45/10** — the page and code are excellent; the only blocker is that neither the site nor the packages are live.
Full report: `c-level/reports/tindalabs-dev_2026-05-19.md`

### Immediate (this week)

- [x] Deploy tindalabs.dev to a public URL ✅ — static export to **GitHub Pages** (see Planned Work #1), not Vercel; the site is fully client-rendered. (DNS cutover is the only manual step left.)
- [ ] Pin `otel/opentelemetry-collector-contrib`, `grafana/tempo`, `grafana/grafana` to specific versions in `infra/docker-compose.yml` (currently `:latest`; use same versions as scent + blindspot-ux: `0.107.0` / `2.5.0` / `11.2.0`)
- [ ] Add `LICENSE` file (MIT) to repo root — footer says "MIT License" but no file exists
- [ ] Add `.github/workflows/ci.yml` with `npm run build` step — broken TypeScript currently passes silently

### Next Sprint (1–4 weeks)

- [x] ~~Stand up a hosted scent-server demo endpoint~~ ✅ OBVIATED — LiveStack now runs fully client-side (see Planned Work #2); no server to host, so no "silent error state" for visitors
- [x] ~~Add graceful fallback when scent-server is unreachable~~ ✅ N/A — there is no server dependency anymore
- [x] Publish all `@tindalabs/*` packages to npm ✅ — all live (blindspot 0.1.1 / blindspot-next 0.1.2 / scent-sdk + scent-engine 0.1.0 / shield 0.1.0); the site now consumes them from npm
- [ ] Add `SECURITY.md` with maintainer contact and 90-day responsible disclosure path
- [ ] Add `.github/dependabot.yml` for monthly npm dependency updates
- [ ] Document the "disk aliases → npm packages" transition in README

### Strategic (1–3 months)

- [ ] **Coordinate simultaneous launch**: tindalabs.dev live + npm publish + Show HN post on the same day — three actions together create a compounding signal moment
- [ ] Add a "Tindalabs Cloud" waitlist section to the landing page — captures commercial intent from OSS adopters before a paid offering exists
- [ ] Submit Blindspot to CNCF landscape and `awesome-opentelemetry` — OTel community is the highest-conversion distribution channel; 12–24 month SEO compounding
- [ ] Add "Why not X?" comparison section to the landing page — answers the top purchase objection at the zero-cost discovery moment

### Watch List

- **OTel Browser SIG** — if the SIG ships a reference browser SDK with privacy controls before Tindalabs establishes npm presence, Blindspot's "first OTel-native browser SDK" positioning narrows; monitor the SIG GitHub repo monthly
- **scent-server port references** — README references port 3004 for scent-server in Docker; verify this matches the current `../scent/docker-compose.yml` port mapping and update if it changed
- **LiveStack demo reliability** — once the hosted demo endpoint is live, monitor for errors and latency; a broken demo on a marketing page is worse than no demo
