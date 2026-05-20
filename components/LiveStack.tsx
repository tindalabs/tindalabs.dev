'use client';
import { useState, useRef, useEffect } from 'react';
import { assess, attachShieldToSpan, ContentProtector, assessAndProtect } from '@tindalabs/shield';
import type { ShieldAssessment, PolicyResult } from '@tindalabs/shield';
import { getTracer, getRouteContext, getRouteSpan, recordEvent } from '@tindalabs/blindspot';
import { init } from '@tindalabs/scent-sdk';
import type { ScentObservation } from '@tindalabs/scent-sdk';

type Status = 'idle' | 'running' | 'done' | 'error';
type PolicyStatus = 'idle' | 'running' | 'done';
type LinkStatus = 'idle' | 'running' | 'done' | 'error';

const DEMO_ACCOUNT_ID = 'demo-user@tindalabs.io';

const DEMO_POLICIES = [
  {
    when: { riskScore: { gte: 0.2 } },
    enable: ['enableWatermark'] as const,
    watermarkOptions: (a: ShieldAssessment) => ({ text: `RISK-${Math.round(a.risk.score * 100)}`, opacity: 0.15 }),
    condLabel: 'riskScore ≥ 0.2',
  },
  {
    when: { riskScore: { gte: 0.5 } },
    enable: ['preventSelection', 'preventClipboard'] as const,
    condLabel: 'riskScore ≥ 0.5',
  },
  {
    when: { signals: { 'shield.automation.headless': true } as Record<string, boolean> },
    enable: ['preventContextMenu', 'preventKeyboardShortcuts'] as const,
    condLabel: 'headless = true',
  },
];

type Strategies = {
  preventSelection:         boolean;
  preventContextMenu:       boolean;
  preventKeyboardShortcuts: boolean;
  preventPrinting:          boolean;
  preventScreenshots:       boolean;
  preventClipboard:         boolean;
  enableWatermark:          boolean;
  preventDevTools:          boolean;
  preventExtensions:        boolean;
};

const STRATEGY_LABELS: { key: keyof Strategies; label: string }[] = [
  { key: 'preventSelection',          label: 'Text selection'       },
  { key: 'preventContextMenu',        label: 'Context menu'         },
  { key: 'preventKeyboardShortcuts',  label: 'Keyboard shortcuts'   },
  { key: 'preventPrinting',           label: 'Print / Save as PDF'  },
  { key: 'preventScreenshots',        label: 'Screenshot capture'   },
  { key: 'preventClipboard',          label: 'Clipboard copy/cut'   },
  { key: 'enableWatermark',           label: 'Watermark overlay'    },
  { key: 'preventDevTools',           label: 'DevTools detection'   },
  { key: 'preventExtensions',         label: 'Extension access'     },
];

const WATERMARK_OPTS = {
  text: 'TINDALABS DEMO', opacity: 0.18, density: 1,
  style: { color: 'rgba(255,255,255,0.9)' },
};

const DEFAULT_STRATEGIES: Strategies = {
  preventSelection:         true,
  preventContextMenu:       true,
  preventKeyboardShortcuts: true,
  preventPrinting:          true,
  preventScreenshots:       true,
  preventClipboard:         true,
  enableWatermark:          true,
  preventDevTools:          true,
  preventExtensions:        true,
};

export default function LiveStack() {
  const [status, setStatus] = useState<Status>('idle');
  const [shield, setShield] = useState<ShieldAssessment | null>(null);
  const [scent,  setScent]  = useState<ScentObservation | null>(null);
  const [error,  setError]  = useState<string | null>(null);

  // ContentProtector state
  const contentRef   = useRef<HTMLDivElement>(null);
  const protectorRef = useRef<ContentProtector | null>(null);
  const [protectionOn, setProtectionOn] = useState(false);
  const [strategies, setStrategies]     = useState<Strategies>({ ...DEFAULT_STRATEGIES });
  const [devToolsOpen, setDevToolsOpen] = useState<boolean | null>(null);
  const [lastEvent,    setLastEvent]    = useState<string | null>(null);

  // Policy engine state
  const policyRef      = useRef<InstanceType<typeof ContentProtector> | null>(null);
  const [policyStatus,     setPolicyStatus]     = useState<PolicyStatus>('idle');
  const [policyResult,     setPolicyResult]     = useState<PolicyResult | null>(null);
  const [matchedIndexes,   setMatchedIndexes]   = useState<Set<number>>(new Set());
  const [activeStrategies, setActiveStrategies] = useState<string[]>([]);

  // Account linking state — calls scentClient.identify() via the SDK method
  const scentClientRef  = useRef<ReturnType<typeof init> | null>(null);
  const [linkStatus,      setLinkStatus]      = useState<LinkStatus>('idle');
  const [localLinkCount,  setLocalLinkCount]  = useState(0);
  const [linkError,       setLinkError]       = useState<string | null>(null);

  // Blindspot custom event state
  const [eventCount,    setEventCount]    = useState(0);
  const [lastEventName, setLastEventName] = useState<string | null>(null);

  useEffect(() => () => { policyRef.current?.dispose(); }, []);

  async function linkIdentity() {
    if (!scentClientRef.current) return;
    setLinkStatus('running');
    setLinkError(null);
    try {
      await scentClientRef.current.identify(DEMO_ACCOUNT_ID);
      setLocalLinkCount(c => c + 1);
      setLinkStatus('done');
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : String(e));
      setLinkStatus('error');
    }
  }

  function emitDemoEvent() {
    const name = 'demo.content.viewed';
    recordEvent(name, { component: 'livestack', session_event: eventCount + 1 });
    setEventCount(c => c + 1);
    setLastEventName(name);
  }

  async function runPolicy() {
    setPolicyStatus('running');
    setPolicyResult(null);
    setMatchedIndexes(new Set());
    setActiveStrategies([]);
    policyRef.current?.dispose();
    policyRef.current = null;
    // Dispose any active manual protector for the same reason — overlapping
    // enableWatermark observers on body + child div cause a MutationObserver loop.
    if (protectorRef.current) {
      protectorRef.current.dispose();
      protectorRef.current = null;
      setProtectionOn(false);
      setLastEvent(null);
    }

    try {
      const captured = shield; // reuse existing assessment if available
      const result = await assessAndProtect(null, {
        policies: DEMO_POLICIES.map(({ when, enable, watermarkOptions }) =>
          watermarkOptions
            ? { when, enable: [...enable], watermarkOptions }
            : { when, enable: [...enable] },
        ),
        ...(captured ? { assessFn: async () => captured } : { assessOptions: { timeout: 600 } }),
        spanEmitter: (name, attrs) => {
          const span = getTracer().startSpan(name, { attributes: attrs }, getRouteContext());
          span.end();
        },
      });
      setPolicyResult(result);
      if (result.protector) {
        policyRef.current = result.protector as InstanceType<typeof ContentProtector>;
      }

      // Reconstruct which rules matched for highlighting
      const score   = result.assessment.risk.score;
      const signals = result.assessment.signals;
      const matched = new Set<number>();
      const strategies: string[] = [];
      DEMO_POLICIES.forEach((rule, i) => {
        const { riskScore, signals: sigCond } = rule.when as { riskScore?: { gte?: number }; signals?: Partial<ShieldAssessment['signals']> };
        let ok = true;
        if (riskScore?.gte !== undefined && score < riskScore.gte) ok = false;
        if (sigCond) {
          for (const [k, v] of Object.entries(sigCond)) {
            if (signals[k as keyof typeof signals] !== v) { ok = false; break; }
          }
        }
        if (ok) { matched.add(i); rule.enable.forEach(s => strategies.push(s)); }
      });
      setMatchedIndexes(matched);
      setActiveStrategies([...new Set(strategies)]);
      setPolicyStatus('done');
    } catch {
      setPolicyStatus('idle');
    }
  }

  // Seed devtools state from assess() result when available
  useEffect(() => {
    if (shield && devToolsOpen === null) {
      setDevToolsOpen(Boolean(shield.signals['shield.devtools.open']));
    }
  }, [shield, devToolsOpen]);

  // Cleanup ContentProtector on unmount
  useEffect(() => () => { protectorRef.current?.dispose(); }, []);

  const handlers = {
    onDevToolsOpen:            (open: boolean) => { setDevToolsOpen(open); setLastEvent(open ? 'DevTools opened — overlay shown' : 'DevTools closed'); },
    onSelectionAttempt:        ()              => setLastEvent('Text selection blocked'),
    onContextMenuAttempt:      ()              => setLastEvent('Context menu blocked'),
    onPrintAttempt:            ()              => setLastEvent('Print attempt blocked'),
    onKeyboardShortcutBlocked: ()              => setLastEvent('Keyboard shortcut blocked'),
    onClipboardAttempt:        ()              => setLastEvent('Clipboard access blocked'),
    onExtensionDetected:       ()              => setLastEvent('Extension access blocked'),
  };

  async function run() {
    setStatus('running');
    setError(null);
    try {
      const shieldResult = await assess({ timeout: 600 });
      setShield(shieldResult);
      setDevToolsOpen(Boolean(shieldResult.signals['shield.devtools.open']));

      const scentClient = init({
        apiKey: 'demo-api-key-dev',
        endpoint: 'http://localhost:3003/v1',
        persistence: 'balanced',
      });
      scentClientRef.current = scentClient;
      const scentResult = await scentClient.observe({
        extraSignals: shieldResult.signals as unknown as Record<string, string | number | boolean | null>,
      });
      await scentClient.flush();
      setScent(scentResult);

      const routeSpan = getRouteSpan();
      if (routeSpan) {
        routeSpan.setAttribute('scent.identity.id',         scentResult.identity.id);
        routeSpan.setAttribute('scent.identity.confidence', scentResult.identity.confidence);
        routeSpan.setAttribute('scent.identity.continuity', scentResult.identity.continuity);
        routeSpan.setAttribute('scent.identity.is_new',     scentResult.identity.isNew);
        routeSpan.setAttribute('scent.drift.detected',      scentResult.drift.detected);
        routeSpan.setAttribute('scent.drift.entropy',       scentResult.drift.entropy);
        routeSpan.setAttribute('scent.risk.score',          scentResult.risk.score);
      }

      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  function buildOptions(s: Strategies) {
    return {
      ...s,
      targetElement:    contentRef.current!,
      watermarkOptions: s.enableWatermark ? WATERMARK_OPTS : undefined,
      customHandlers:   handlers,
    };
  }

  function enableProtection() {
    if (!contentRef.current || protectorRef.current) return;
    // Dispose any active policy-engine protector first — two simultaneous
    // ContentProtectors with enableWatermark trigger a MutationObserver loop.
    if (policyRef.current) {
      policyRef.current.dispose();
      policyRef.current = null;
      setPolicyResult(null);
      setMatchedIndexes(new Set());
      setActiveStrategies([]);
      setPolicyStatus('idle');
    }
    const protector = attachShieldToSpan(buildOptions(strategies), (name, attrs) => {
      const span = getTracer().startSpan(name, { attributes: attrs }, getRouteContext());
      span.end();
    });
    protector.protect();
    protectorRef.current = protector;
    setProtectionOn(true);
    setLastEvent(null);
  }

  function disableProtection() {
    protectorRef.current?.dispose();
    protectorRef.current = null;
    setProtectionOn(false);
    setLastEvent(null);
  }

  function toggleStrategy(key: keyof Strategies) {
    const next = { ...strategies, [key]: !strategies[key] };
    setStrategies(next);
    // Live-update the active protector — it re-initialises only the changed strategy.
    if (protectorRef.current) {
      protectorRef.current.updateOptions({
        ...next,
        watermarkOptions: next.enableWatermark ? WATERMARK_OPTS : undefined,
        customHandlers: handlers,
      });
    }
  }

  const riskColor = (score: number) =>
    score >= 0.7 ? '#f87171' : score >= 0.4 ? '#fb923c' : score >= 0.2 ? '#fbbf24' : '#4ade80';

  const continuityColor = (c: string) => ({
    confirmed: '#4ade80', probable: '#60a5fa', uncertain: '#fbbf24', unknown: '#94a3b8',
  }[c] ?? '#94a3b8');

  const extensionDetected = Boolean(shield?.signals['shield.extension.detected']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Row 1: Shield · assess() + Scent · observe() ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* Shield card */}
        <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 600 }}>Shield · assess()</span>
            {status === 'idle' && (
              <button className="btn btn-primary" style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem' }} onClick={run} data-blindspot-label="live-run">Run</button>
            )}
            {status === 'running' && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Running…</span>}
          </div>

          {!shield && status !== 'error' && (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Click Run to assess this session.</p>
          )}
          {shield && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {(Object.entries(shield.signals) as [string, boolean | string][])
                  .filter(([k]) => k !== 'shield.extension.names')
                  .map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
                      <span style={{ color: '#94a3b8' }}>{key.replace('shield.', '')}</span>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500, background: val ? '#2c1010' : '#14532d', color: val ? '#f87171' : '#4ade80' }}>
                        {val ? 'Detected' : 'Clear'}
                      </span>
                    </div>
                  ))}
              </div>
              <div style={{ borderTop: '1px solid #1e2d40', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#94a3b8' }}>Risk score</span>
                  <span style={{ fontWeight: 600, color: riskColor(shield.risk.score) }}>{(shield.risk.score * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 4, background: '#1e2533', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${shield.risk.score * 100}%`, background: riskColor(shield.risk.score), borderRadius: 99 }} />
                </div>
              </div>
            </>
          )}
          {status === 'error' && error && <p style={{ color: '#f87171', fontSize: '0.83rem' }}>{error}</p>}
        </div>

        {/* Scent card */}
        <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 600 }}>Scent · observe()</span>
          </div>
          {!scent && (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              {status === 'running' ? 'Resolving identity…' : 'Runs after Shield assessment.'}
            </p>
          )}
          {scent && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                <Row label="Identity ID" value={scent.identity.id} mono />
                <Row label="Continuity"  value={scent.identity.continuity} valueStyle={{ color: continuityColor(scent.identity.continuity) }} />
                <Row label="Is new"      value={scent.identity.isNew ? 'Yes' : 'No'} />
                <Row label="Drift"       value={scent.drift.detected ? `Detected (entropy ${scent.drift.entropy.toFixed(2)})` : 'None'} />
              </div>
              <div style={{ borderTop: '1px solid #1e2d40', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#94a3b8' }}>Confidence</span>
                  <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{(scent.identity.confidence * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 4, background: '#1e2533', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${scent.identity.confidence * 100}%`, background: '#6366f1', borderRadius: 99 }} />
                </div>
              </div>
              {/* Persistence mode note */}
              <div style={{ borderTop: '1px solid #1e2d40', paddingTop: '0.6rem' }}>
                <pre style={{
                  fontSize: '0.68rem', color: '#475569', fontFamily: 'monospace',
                  lineHeight: 1.65, margin: 0, background: 'transparent', whiteSpace: 'pre-wrap',
                }}>
                  {`init({ persistence: 'balanced' })\n// 'aggressive'   — all storage APIs, max cross-session recall\n// 'conservative' — session memory only, no persistence`}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: Scent · identify() ── */}
      <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 600 }}>
            Scent · identify()
          </span>
          <button
            className="btn btn-primary"
            style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem' }}
            onClick={linkIdentity}
            disabled={!scent || linkStatus === 'running'}
          >
            {linkStatus === 'running' ? 'Linking…' : linkStatus === 'done' ? 'Link again' : 'Link identity'}
          </button>
        </div>

        {/* Code note always visible */}
        <pre style={{
          background: '#0d1117', borderRadius: 6, padding: '0.6rem 0.9rem',
          fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace',
          lineHeight: 1.65, margin: '0 0 0.75rem',
          border: '1px solid #1e2d40', whiteSpace: 'pre-wrap',
        }}>
          {`await scentClient.identify('${DEMO_ACCOUNT_ID}');\n// Links this fingerprint → account ID in one call`}
        </pre>

        {!scent && (
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Runs after identity is resolved above.</p>
        )}

        {scent && linkStatus === 'idle' && (
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Links <code style={{ color: '#94a3b8' }}>{scent.identity.id.slice(0, 12)}…</code> to account{' '}
            <code style={{ color: '#94a3b8' }}>{DEMO_ACCOUNT_ID}</code>.
          </p>
        )}

        {linkError && (
          <p style={{ color: '#f87171', fontSize: '0.83rem' }}>{linkError}</p>
        )}

        {linkStatus === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Row label="Identity ID" value={`${scent!.identity.id.slice(0, 16)}…`} mono />
            <Row label="Account"     value={DEMO_ACCOUNT_ID} />
            {localLinkCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
                <span style={{ color: '#94a3b8' }}>Linked this session</span>
                <span style={{ padding: '0.15rem 0.6rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, background: '#14532d', color: '#4ade80' }}>
                  {localLinkCount}×
                </span>
              </div>
            )}
            <p style={{ color: '#475569', fontSize: '0.72rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
              Repeated calls are idempotent and increment a server-side counter — try clicking again.
            </p>
          </div>
        )}
      </div>

      {/* ── Row 3: Shield · ContentProtector ── */}
      <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 600 }}>
            Shield · ContentProtector
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {lastEvent && (
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontStyle: 'italic', maxWidth: 220, textAlign: 'right' }}>{lastEvent}</span>
            )}
            {protectionOn
              ? <button className="btn btn-ghost"    style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem' }} onClick={disableProtection}>Disable</button>
              : <button className="btn btn-primary"  style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem' }} onClick={enableProtection}>Enable</button>
            }
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Protected content area */}
          <div
            ref={contentRef}
            style={{
              background: '#0d1117',
              border: `1px solid ${protectionOn ? '#4f46e5' : '#1e2d40'}`,
              borderRadius: 8,
              padding: '1.25rem',
              transition: 'border-color 0.2s',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f87171' }}>Confidential</span>
              {protectionOn && (
                <span style={{ fontSize: '0.65rem', background: '#1e1e40', color: '#a5b4fc', padding: '0.1rem 0.5rem', borderRadius: 20, fontWeight: 600 }}>Protected</span>
              )}
            </div>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>Q4 Financial Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {[['Client','Acme Corporation'],['Total Revenue','$4.2M'],['Growth (YoY)','+23%'],['Risk Rating','AA'],['Prepared by','Finance Dept.']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ color: '#94a3b8' }}>{v}</span>
                </div>
              ))}
            </div>
            {!protectionOn && (
              <p style={{ marginTop: '1rem', fontSize: '0.72rem', color: '#475569', fontStyle: 'italic' }}>
                Try selecting or copying this text. Enable protection to block it.
              </p>
            )}
          </div>

          {/* Strategy toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <p style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '0.25rem' }}>
              {protectionOn ? 'Click any strategy to toggle it live.' : 'Enable protection, then toggle strategies individually.'}
            </p>

            {STRATEGY_LABELS.map(({ key, label }) => {
              const isDevTools   = key === 'preventDevTools';
              const isExtensions = key === 'preventExtensions';
              const on = strategies[key];
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {/* DevTools live status badge */}
                    {isDevTools && protectionOn && on && devToolsOpen !== null && (
                      <span style={{ padding: '0.1rem 0.45rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 500, background: devToolsOpen ? '#2c1010' : '#14532d', color: devToolsOpen ? '#f87171' : '#4ade80' }}>
                        {devToolsOpen ? 'Open' : 'Clear'}
                      </span>
                    )}
                    {/* Extension detection badge — shown when assess() found an extension */}
                    {isExtensions && extensionDetected && (
                      <span style={{ padding: '0.1rem 0.45rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 500, background: '#2c1010', color: '#f87171' }}>
                        detected
                      </span>
                    )}
                    <button
                      onClick={() => toggleStrategy(key)}
                      disabled={!protectionOn}
                      style={{
                        padding: '0.15rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                        border: 'none', cursor: protectionOn ? 'pointer' : 'default',
                        background: on && protectionOn ? '#14532d' : '#1a2235',
                        color:      on && protectionOn ? '#4ade80' : '#475569',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      {on ? 'Active' : 'Off'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* DevTools status when protection is off but assess() ran */}
            {!protectionOn && devToolsOpen !== null && (
              <div style={{ borderTop: '1px solid #1e2d40', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '0.72rem', color: '#475569', fontStyle: 'italic' }}>
                DevTools last seen: {devToolsOpen ? 'Open' : 'Closed'} — enable protection for real-time monitoring.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 4: Shield · assessAndProtect() ── */}
      <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 600 }}>
            Shield · assessAndProtect()
          </span>
          <button
            className="btn btn-primary"
            style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem' }}
            onClick={runPolicy}
            disabled={policyStatus === 'running'}
          >
            {policyStatus === 'running' ? 'Assessing…' : 'Run policy engine'}
          </button>
        </div>

        {/* Policy rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
          {DEMO_POLICIES.map((rule, i) => {
            const matched = matchedIndexes.has(i);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                background: matched ? '#1a1f3a' : '#1a2235',
                border: `1px solid ${matched ? '#6366f1' : '#1e2d40'}`,
                borderRadius: 6, padding: '0.4rem 0.65rem', fontSize: '0.78rem',
                transition: 'border-color 0.2s',
              }}>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', minWidth: 130 }}>{rule.condLabel}</span>
                <span style={{ color: '#475569' }}>→</span>
                <div style={{ display: 'flex', gap: '0.3rem', flex: 1, flexWrap: 'wrap' }}>
                  {rule.enable.map(s => (
                    <span key={s} style={{
                      fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 4,
                      background: matched ? '#1e3a4a' : '#1e2d40',
                      color: matched ? '#7dd3fc' : '#64748b',
                    }}>{s}</span>
                  ))}
                </div>
                {matched && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 4, background: '#2d1f3a', color: '#a78bfa', marginLeft: 'auto' }}>
                    matched
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Result */}
        {policyStatus === 'idle' && (
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {shield ? 'Reuses the assess() result above — no extra network call.' : 'Click Run to assess and apply policies.'}
          </p>
        )}
        {policyResult && (
          <div style={{ borderTop: '1px solid #1e2d40', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
              <span style={{ color: '#64748b' }}>Risk score</span>
              <span style={{ fontWeight: 600, color: riskColor(policyResult.assessment.risk.score) }}>
                {(policyResult.assessment.risk.score * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
              <span style={{ color: '#64748b' }}>Matched rules</span>
              <span style={{ color: '#e2e8f0' }}>{matchedIndexes.size} / {DEMO_POLICIES.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
              <span style={{ color: '#64748b' }}>Protection</span>
              <span style={{ padding: '0.15rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                background: policyResult.protector ? '#1e1e40' : '#14532d',
                color:      policyResult.protector ? '#a5b4fc' : '#4ade80' }}>
                {policyResult.protector ? 'Active' : 'Not activated'}
              </span>
            </div>
            {activeStrategies.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.83rem', gap: '0.5rem' }}>
                <span style={{ color: '#64748b', flexShrink: 0 }}>Strategies</span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {activeStrategies.map(s => (
                    <span key={s} style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: '#1e3a4a', color: '#7dd3fc' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Row 5: Blindspot · recordEvent() ── */}
      <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 600 }}>
            Blindspot · recordEvent()
          </span>
          <button
            className="btn btn-primary"
            style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem' }}
            onClick={emitDemoEvent}
          >
            {eventCount === 0 ? 'Record event' : 'Record again'}
          </button>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Attach semantic events to the active OTel route trace — they appear inline with click and form data in Tempo.
        </p>

        {/* Code note */}
        <pre style={{
          background: '#0d1117', borderRadius: 6, padding: '0.7rem 1rem',
          fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace',
          lineHeight: 1.65, margin: '0 0 0.75rem',
          border: '1px solid #1e2d40', whiteSpace: 'pre-wrap',
        }}>
          {`recordEvent('checkout.started', {\n  'cart.item_count': 3,\n  'cart.total_usd': 142.50,\n  'user.plan': 'pro',\n});\n// → span added to the active route trace in Tempo`}
        </pre>

        {eventCount > 0 && lastEventName && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Row label="Event name"    value={lastEventName} mono />
            <Row label="component"     value="livestack" mono />
            <Row label="session_event" value={String(eventCount)} />
            <p style={{ color: '#475569', fontSize: '0.72rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
              Emitted to the active route span — open Tempo and search the current trace to see it.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

function Row({ label, value, mono, valueStyle }: {
  label: string; value: string; mono?: boolean; valueStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'monospace' : undefined, color: '#e2e8f0', ...valueStyle }}>{value}</span>
    </div>
  );
}
