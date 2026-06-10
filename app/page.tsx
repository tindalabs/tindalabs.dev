import Image from 'next/image';
import Nav from '../components/Nav';
import LiveStack from '../components/LiveStack';
import CodeBlock from '../components/CodeBlock';
import GlitchText from '../components/GlitchText';
import InstallLine from '../components/InstallLine';
import { GitHubIcon, NpmIcon } from '../components/icons';

export default async function Home() {
  return (
    <>
      <Nav />

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '7rem 0 5rem', borderBottom: '1px solid #1e2d40', overflow: 'hidden' }}>
        <Image
          src="/hero.png"
          alt=""
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.45 }}
        />
        {/* bottom fade into page background */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #0d1117 100%)', pointerEvents: 'none' }} />
        <div className="container" style={{ position: 'relative' }}>
          <p style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            Open source · Self-hostable · Composable
          </p>
          {/* Explicit <br/> pins the headline to two lines, and minHeight reserves
              its box - so the scramble effect can't shift its glyph widths into a
              wrap-point change and jump the content below (CLS). */}
          <GlitchText
            as="h1"
            effects={['scramble']}
            trigger="manual"
            autoRunMs={1400}
            style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', lineHeight: 1.15, marginBottom: '1.25rem', maxWidth: '800px', minHeight: '2.3em' }}
          >
            Browser security &amp; identity<br />for hostile environments
          </GlitchText>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '2rem', lineHeight: 1.65 }}>
            Three composable SDKs that handle what your analytics platform ignores: what your users
            are running, whether they&apos;ve been there before, and whether you can trust the session.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="#blindspot" className="btn btn-primary" data-blindspot-label="hero-get-started">Get started</a>
            <a href="https://github.com/tindalabs" target="_blank" rel="noreferrer" className="btn btn-ghost" data-blindspot-label="hero-github"><GitHubIcon /> View on GitHub</a>
          </div>
        </div>
      </section>

      {/* ── Stack overview ─────────────────────────────────────────── */}
      <section style={{ padding: '4rem 0', background: '#111827', borderBottom: '1px solid #1e2d40' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#1e2d40' }}>
            {[
              { chip: 'chip-blue',   name: 'Blindspot',  npm: '@tindalabs/blindspot',  desc: 'OTel browser observability - spans for every navigation, interaction, and fetch without PII.' },
              { chip: 'chip-indigo', name: 'Shield',     npm: '@tindalabs/shield',     desc: 'Tamper detection - DevTools, automation drivers, extension injection, headless environments.' },
              { chip: 'chip-violet', name: 'Scent',      npm: '@tindalabs/scent-sdk',  desc: 'Probabilistic identity continuity - confident even after cookie deletion, VPNs, and browser updates.' },
            ].map((pkg) => (
              <div key={pkg.name} style={{ background: '#111827', padding: '1.75rem 1.5rem' }}>
                <GlitchText as="span" className={`chip ${pkg.chip}`} trigger="hover" effects={['rgbSplit']}>{pkg.name}</GlitchText>
                <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>{pkg.npm}</p>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.55 }}>{pkg.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blindspot ──────────────────────────────────────────────── */}
      <section id="blindspot">
        <div className="container">
          <div className="pkg-grid">
            <div className="pkg-copy">
              <span className="chip chip-blue">Blindspot</span>
              <h2>Privacy-first OTel browser observability</h2>
              <p className="tagline">
                Every navigation, click, form submission, and fetch call becomes an OpenTelemetry span -
                without capturing IP addresses, user agents, or any other PII. Drop it into your existing
                OTel pipeline; it speaks OTLP natively.
              </p>
              <ul className="features">
                <li>Automatic route instrumentation for React Router, Vue Router, and Next.js App Router</li>
                <li>Web vitals (LCP, CLS, FID) as first-class span attributes</li>
                <li>Behavioral signals: time-to-first-interaction, paste ratio, mouse entropy, interaction rate - bot detection without a separate SDK</li>
                <li><code>useSpan</code> / <code>useBlindspot</code> hooks for manual instrumentation</li>
                <li>Consent-gated - pauses collection until <code>grantConsent()</code> is called</li>
                <li>Composes with Scent: identity context attaches to every span automatically</li>
              </ul>
              <InstallLine command="npm install @tindalabs/blindspot-react" />
              <div className="pkg-links">
                <a href="https://github.com/tindalabs/blindspot" target="_blank" rel="noreferrer" className="btn btn-ghost" data-blindspot-label="blindspot-github"><GitHubIcon /> GitHub</a>
                <a href="https://www.npmjs.com/package/@tindalabs/blindspot-react" target="_blank" rel="noreferrer" className="btn btn-ghost" data-blindspot-label="blindspot-npm"><NpmIcon /> npm</a>
              </div>
            </div>
            <div>
              <CodeBlock lang="tsx" code={`import { BlindspotProvider } from '@tindalabs/blindspot-react';
import { useSpan } from '@tindalabs/blindspot-react';
import { recordEvent } from '@tindalabs/blindspot';

// Wrap your app once
<BlindspotProvider config={{ serviceName: 'my-app', endpoint: '/v1/traces' }}>
  <App />
</BlindspotProvider>

// Annotate any component
function CheckoutButton() {
  const { setAttribute } = useSpan();

  function handleClick() {
    setAttribute('checkout.cart_value', cartTotal);
    recordEvent('checkout.initiated');
  }

  return <button onClick={handleClick}>Checkout</button>;
}`} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Shield ─────────────────────────────────────────────────── */}
      <section id="shield">
        <div className="container">
          <div className="pkg-grid code-first">
            <div>
              <CodeBlock code={`import { assess, ContentProtector } from '@tindalabs/shield';

// One-shot environment assessment
const result = await assess();

console.log(result.signals);
// {
//   'shield.devtools.open':        false,
//   'shield.automation.webdriver': false,
//   'shield.automation.headless':  false,
//   'shield.frame.embedded':       false,
//   'shield.extension.detected':   false,
// }

console.log(result.risk);
// { score: 0.4, flags: ['devtools_open'] }

// Attach directly to an OTel span
span.setAttributes(result.spanAttributes);

// Or merge into a Scent observation
const obs = await scent.observe({ extraSignals: result.signals });

// ── Active protection ──────────────────────────────
// Block selection, copy, print, and screenshots; watermark.
const protector = new ContentProtector({
  targetElement: document.querySelector('#invoice'),
  preventSelection: true,
  preventClipboard: true,
  preventScreenshots: true,
  enableWatermark: true,
});
protector.protect();`} />
            </div>
            <div className="pkg-copy">
              <span className="chip chip-indigo">Shield</span>
              <h2>Tamper detection for hostile browsers</h2>
              <p className="tagline">
                A single <code>assess()</code> call returns structured risk signals and a calibrated
                0-1 risk score. Signals are namespaced as <code>shield.*</code> OTel attributes
                - ready to attach to Blindspot spans or pass into Scent&apos;s risk engine.
              </p>
              <ul className="features">
                <li>DevTools detection via debugger-timing Web Worker (Chrome, Firefox, Safari)</li>
                <li>WebDriver / Selenium detection from CDP artifacts and <code>navigator.webdriver</code></li>
                <li>Headless browser heuristics: UA string, zero plugins, missing Permissions API</li>
                <li>Extension detection via DOM selectors and JS global signatures</li>
                <li>Active protection: prevent selection, printing, screenshots, and watermarking via <code>ContentProtector</code></li>
              </ul>
              <InstallLine command="npm install @tindalabs/shield" />
              <div className="pkg-links">
                <a href="https://github.com/tindalabs/shield" target="_blank" rel="noreferrer" className="btn btn-ghost" data-blindspot-label="shield-github"><GitHubIcon /> GitHub</a>
                <a href="https://www.npmjs.com/package/@tindalabs/shield" target="_blank" rel="noreferrer" className="btn btn-ghost" data-blindspot-label="shield-npm"><NpmIcon /> npm</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Scent ──────────────────────────────────────────────────── */}
      <section id="scent">
        <div className="container">
          <div className="pkg-grid">
            <div className="pkg-copy">
              <span className="chip chip-violet">Scent</span>
              <h2>Probabilistic identity continuity</h2>
              <p className="tagline">
                Tracks whether a returning visitor is likely the same entity - even after cookie deletion,
                VPN changes, browser updates, or anti-fingerprinting tools. Returns a calibrated
                confidence score with a signal-level explainability breakdown.
              </p>
              <ul className="features">
                <li>SimHash + weighted Jaccard matching - no deterministic hashes, no brittle equality checks</li>
                <li>Drift-tolerant: a browser update or new IP doesn&apos;t break identity continuity</li>
                <li><code>scent.identify(userId)</code> links anonymous device identity to authenticated accounts - enabling "N accounts, same device" fraud queries</li>
                <li>Private browsing and storage restriction detection built-in (<code>storage.restricted</code>)</li>
                <li>Persistence policies (<code>conservative | balanced | aggressive | forensic</code>) as a first-class compliance lever</li>
                <li>Risk engine: coordinated behavior, storage amnesia, impossible transitions, automation scoring</li>
                <li>Self-hostable: PostgreSQL + Redis, single <code>docker compose up</code></li>
              </ul>
              <InstallLine command="npm install @tindalabs/scent-sdk" />
              <div className="pkg-links">
                <a href="https://github.com/tindalabs/scent" target="_blank" rel="noreferrer" className="btn btn-ghost" data-blindspot-label="scent-github"><GitHubIcon /> GitHub</a>
                <a href="https://www.npmjs.com/package/@tindalabs/scent-sdk" target="_blank" rel="noreferrer" className="btn btn-ghost" data-blindspot-label="scent-npm"><NpmIcon /> npm</a>
              </div>
            </div>
            <div>
              <CodeBlock code={`import { init } from '@tindalabs/scent-sdk';

const scent = init({
  apiKey: 'proj_...',
  endpoint: 'https://your-scent-server/v1',
  persistence: 'balanced',
});

const obs = await scent.observe();
// obs.identity.confidence  → 0.91
// obs.identity.continuity  → 'confirmed'
// obs.identity.isNew       → false

// After the user logs in, link their account ID.
// Enables: "how many accounts share this device?"
await scent.identify(currentUser.id);
await scent.flush();

// Query the reverse: all identities ever seen for this account
// GET /v1/account/:userId/identities → fraud cluster detection

scent.on('risk_elevated', ({ score, flags }) => {
  // Block signup, require CAPTCHA, trigger step-up auth
});`} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Why not X? ─────────────────────────────────────────────── */}
      <section id="why">
        <div className="container">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>Why not just use what you have?</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '600px', lineHeight: 1.6 }}>
            Each package replaces a tool you might reach for first - and is built differently on purpose.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {/* Blindspot */}
            <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.5rem' }}>
              <span className="chip chip-blue" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>Blindspot</span>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.6rem', color: '#f8fafc' }}>Why not session replay?</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Hotjar, FullStory and RUM tools <strong style={{ color: '#e2e8f0' }}>record the DOM</strong> - snapshots
                that carry PII and CIPA / wiretapping exposure. Blindspot emits structured OTel spans instead:
                <em> what happened</em>, not a recording. No DOM capture, no PII, and it drops straight into the
                OTel pipeline you already run.
              </p>
            </div>
            {/* Shield */}
            <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.5rem' }}>
              <span className="chip chip-indigo" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>Shield</span>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.6rem', color: '#f8fafc' }}>Why not <code>disable-devtool</code>?</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <code>disable-devtool</code> gives you a boolean and only watches DevTools. Shield returns
                <strong style={{ color: '#e2e8f0' }}> structured risk signals and a calibrated 0-1 score</strong> across
                DevTools, automation drivers, headless and extensions - as <code>shield.*</code> OTel attributes you
                compose into a decision, not a blunt block.
              </p>
            </div>
            {/* Scent */}
            <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.5rem' }}>
              <span className="chip chip-violet" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>Scent</span>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.6rem', color: '#f8fafc' }}>Why not FingerprintJS?</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                A deterministic hash mints a brand-new visitor the moment one signal changes. In a reproducible
                benchmark under realistic drift (browser updates, VPNs, anti-fingerprinting), deterministic
                fingerprints re-identify <strong style={{ color: '#f87171' }}>~45-55%</strong> of returning visitors -
                Scent, <strong style={{ color: '#4ade80' }}>100%</strong>, with an explainable confidence score.
                Self-hostable, MIT.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Compose ────────────────────────────────────────────────── */}
      <section style={{ background: '#111827' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>Composed, they cover the full session layer</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '600px', lineHeight: 1.6 }}>
            Each package works independently. Together they give you a complete picture of every
            session: what happened, who did it, and whether to trust them.
          </p>
          <CodeBlock code={`import { BlindspotProvider, useSpan } from '@tindalabs/blindspot-react';
import { assess } from '@tindalabs/shield';
import { init } from '@tindalabs/scent-sdk';

const scent = init({ apiKey: 'proj_...', endpoint: '/v1' });

async function onPageLoad() {
  // 1. Detect environment threats
  const shield = await assess();

  // 2. Resolve identity - shield signals merge into the snapshot
  const obs = await scent.observe({ extraSignals: shield.signals });
  await scent.flush();

  // obs.identity.confidence → how sure we are this is a returning user
  // obs.risk.score          → composite threat score (device + behavior + shield signals)
}

// 3. After login: link the authenticated user to the Scent identity.
//    Enables "how many accounts share this device?" fraud queries.
async function onLogin(userId: string) {
  await scent.identify(userId);
  await scent.flush();
}

// 4. Every OTel span gets identity + risk context automatically
//    scent.identity.id, scent.identity.confidence, scent.risk.score
//    shield.devtools.open, shield.automation.webdriver, ...
//    ux.session.time_to_first_interaction_ms, ux.input.paste_ratio, ...`} />
        </div>
      </section>

      {/* ── Live stack panel ───────────────────────────────────────── */}
      <section>
        <div className="container">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>This page runs the full stack</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6, maxWidth: '580px' }}>
            Blindspot is instrumenting every click and navigation you make right now.
            The panel below shows live Shield and Scent output from your current session.
          </p>
          <LiveStack />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #1e2d40', padding: '2.5rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
            MIT License · <a href="https://github.com/tindalabs" target="_blank" rel="noreferrer">github.com/tindalabs</a>
            {' · '}glitch fx by{' '}
            <a href="https://www.npmjs.com/package/@isonimus/glitch-js" target="_blank" rel="noreferrer">@isonimus/glitch-js</a>
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {[
              { label: 'Blindspot', href: 'https://github.com/tindalabs/blindspot' },
              { label: 'Shield',    href: 'https://github.com/tindalabs/shield' },
              { label: 'Scent',     href: 'https://github.com/tindalabs/scent' },
            ].map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" style={{ color: '#64748b', fontSize: '0.875rem' }}>{l.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
