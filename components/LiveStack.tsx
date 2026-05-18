'use client';
import { useState, useRef, useEffect } from 'react';
import { assess, attachShieldToSpan, ContentProtector } from '@tindalabs/shield';
import type { ShieldAssessment } from '@tindalabs/shield';
import { getTracer, getRouteContext } from '@tindalabs/blindspot';
import { init } from '@tindalabs/scent-sdk';
import type { ScentObservation } from '@tindalabs/scent-sdk';

type Status = 'idle' | 'running' | 'done' | 'error';

type Strategies = {
  preventSelection:        boolean;
  preventContextMenu:      boolean;
  preventKeyboardShortcuts:boolean;
  preventPrinting:         boolean;
  preventScreenshots:      boolean;
  enableWatermark:         boolean;
  preventDevTools:         boolean;
};

const STRATEGY_LABELS: { key: keyof Strategies; label: string }[] = [
  { key: 'preventSelection',          label: 'Text selection'       },
  { key: 'preventContextMenu',        label: 'Context menu'         },
  { key: 'preventKeyboardShortcuts',  label: 'Keyboard shortcuts'   },
  { key: 'preventPrinting',           label: 'Print / Save as PDF'  },
  { key: 'preventScreenshots',        label: 'Screenshot capture'   },
  { key: 'enableWatermark',           label: 'Watermark overlay'    },
  { key: 'preventDevTools',           label: 'DevTools detection'   },
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
  enableWatermark:          true,
  preventDevTools:          true,
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
      const scentResult = await scentClient.observe({
        extraSignals: shieldResult.signals as unknown as Record<string, string | number | boolean | null>,
      });
      await scentClient.flush();
      setScent(scentResult);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  function buildOptions(s: Strategies) {
    return {
      ...s,
      targetElement:   contentRef.current!,
      watermarkOptions: s.enableWatermark ? WATERMARK_OPTS : undefined,
      customHandlers:  handlers,
    };
  }

  function enableProtection() {
    if (!contentRef.current || protectorRef.current) return;
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
              <div style={{ borderTop: '1px solid #1e2d40', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#94a3b8' }}>Confidence</span>
                  <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{(scent.identity.confidence * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 4, background: '#1e2533', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${scent.identity.confidence * 100}%`, background: '#6366f1', borderRadius: 99 }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: Shield · ContentProtector ── */}
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
                Try selecting this text. Enable protection to block it.
              </p>
            )}
          </div>

          {/* Strategy toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <p style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '0.25rem' }}>
              {protectionOn ? 'Click any strategy to toggle it live.' : 'Enable protection, then toggle strategies individually.'}
            </p>

            {STRATEGY_LABELS.map(({ key, label }) => {
              const isDevTools = key === 'preventDevTools';
              const on = strategies[key];
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {/* DevTools live status badge (shown alongside its toggle when active) */}
                    {isDevTools && protectionOn && on && devToolsOpen !== null && (
                      <span style={{ padding: '0.1rem 0.45rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 500, background: devToolsOpen ? '#2c1010' : '#14532d', color: devToolsOpen ? '#f87171' : '#4ade80' }}>
                        {devToolsOpen ? 'Open' : 'Clear'}
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
