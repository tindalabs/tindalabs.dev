# tindalabs-dev — Roadmap

The marketing landing page and unified observability stack for [tindalabs.dev](https://tindalabs.dev).

---

## Planned Work

### 1. Production Deployment

**Priority**: Critical | **Effort**: 1–2 hours | **Status**: To do

The Next.js app has no deployment configuration. The site cannot go live without this.

#### Tasks
- [ ] Add `vercel.json` (or equivalent Fly/Railway manifest) and configure the project on the target platform
- [ ] Document the production deploy path in README
- [ ] Add `.github/workflows/ci.yml` with `npm run build` as the minimum CI gate

---

### 2. Hosted Demo Endpoint

**Priority**: High | **Effort**: 2–4 hours | **Status**: To do

The LiveStack panel requires a local scent-server at `localhost:3003`. Every public visitor hits a silent error state. A hosted read-only demo instance removes the 4-step local setup requirement entirely.

#### Tasks
- [ ] Stand up a shared demo scent-server instance (Railway or Fly.io — small Postgres + Redis)
- [ ] Point `LiveStack.tsx` at the hosted endpoint by default, with `localhost:3003` as fallback for local dev
- [ ] Add a graceful fallback UI in `LiveStack.tsx` when scent-server is unreachable (show Shield result; explain Scent needs a server)

---

### 3. npm Package Transition

**Priority**: High | **Effort**: 30 minutes | **Status**: To do

`next.config.ts` resolves all `@tindalabs/*` imports from sibling repo paths on disk. This is correct for development but blocks any deployment that doesn't have the sibling repos present. The transition to published npm packages is undocumented.

#### Tasks
- [ ] Document the transition from disk aliases to npm packages in README
- [ ] Once packages are published, remove webpack aliases from `next.config.ts` and install from npm
- [ ] Verify production build passes with npm-sourced packages

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

- [ ] Deploy tindalabs.dev to a public URL (Vercel recommended — zero-config Next.js 15) — HN launch is gated on this
- [ ] Pin `otel/opentelemetry-collector-contrib`, `grafana/tempo`, `grafana/grafana` to specific versions in `infra/docker-compose.yml` (currently `:latest`; use same versions as scent + blindspot-ux: `0.107.0` / `2.5.0` / `11.2.0`)
- [ ] Add `LICENSE` file (MIT) to repo root — footer says "MIT License" but no file exists
- [ ] Add `.github/workflows/ci.yml` with `npm run build` step — broken TypeScript currently passes silently

### Next Sprint (1–4 weeks)

- [ ] Stand up a hosted scent-server demo endpoint so LiveStack works for all visitors without local setup
- [ ] Add graceful fallback in `LiveStack.tsx` when scent-server is unreachable
- [ ] Publish all `@tindalabs/*` packages to npm — `npm install @tindalabs/shield` must work before the HN post
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
