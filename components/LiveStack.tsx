'use client';
import { useState, useEffect } from 'react';
import { assess } from '@tindalabs/shield';
import type { ShieldAssessment } from '@tindalabs/shield';
import { init } from '@tindalabs/scent-sdk';
import type { ScentObservation } from '@tindalabs/scent-sdk';

type Status = 'idle' | 'running' | 'done' | 'error';

export default function LiveStack() {
  const [status, setStatus] = useState<Status>('idle');
  const [shield, setShield] = useState<ShieldAssessment | null>(null);
  const [scent, setScent] = useState<ScentObservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setStatus('running');
    setError(null);
    try {
      const shieldResult = await assess({ timeout: 600 });
      setShield(shieldResult);

      const scentClient = init({
        apiKey: 'demo',
        endpoint: 'http://localhost:3002',
        persistence: 'balanced',
      });
      const scentResult = await scentClient.observe({ extraSignals: shieldResult.signals as unknown as Record<string, string | number | boolean | null> });
      await scentClient.flush();
      setScent(scentResult);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  const riskColor = (score: number) =>
    score >= 0.7 ? '#f87171' : score >= 0.4 ? '#fb923c' : score >= 0.2 ? '#fbbf24' : '#4ade80';

  const continuityColor = (c: string) => ({
    confirmed: '#4ade80', probable: '#60a5fa', uncertain: '#fbbf24', unknown: '#94a3b8',
  }[c] ?? '#94a3b8');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      {/* Shield card */}
      <div style={{ background: '#161b27', border: '1px solid #1e2d40', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 600 }}>Shield · assess()</span>
          {status === 'idle' && (
            <button className="btn btn-primary" style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem' }} onClick={run} data-blindspot-label="live-run">
              Run
            </button>
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
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                      background: val ? '#2c1010' : '#14532d',
                      color: val ? '#f87171' : '#4ade80',
                    }}>
                      {val ? (key === 'shield.extension.names' ? String(val) : 'Detected') : 'Clear'}
                    </span>
                  </div>
                ))}
            </div>
            <div style={{ borderTop: '1px solid #1e2d40', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Risk score</span>
                <span style={{ fontWeight: 600, color: riskColor(shield.risk.score) }}>
                  {(shield.risk.score * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 4, background: '#1e2533', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${shield.risk.score * 100}%`, background: riskColor(shield.risk.score), borderRadius: 99 }} />
              </div>
            </div>
          </>
        )}

        {status === 'error' && error && (
          <p style={{ color: '#f87171', fontSize: '0.83rem' }}>{error}</p>
        )}
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
              <Row label="Identity ID"   value={scent.identity.id.slice(0, 16) + '…'} mono />
              <Row label="Continuity"    value={scent.identity.continuity}
                valueStyle={{ color: continuityColor(scent.identity.continuity) }} />
              <Row label="Is new"        value={scent.identity.isNew ? 'Yes' : 'No'} />
              <Row label="Drift"         value={scent.drift.detected ? `Detected (entropy ${scent.drift.entropy.toFixed(2)})` : 'None'} />
            </div>

            <div style={{ borderTop: '1px solid #1e2d40', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Confidence</span>
                <span style={{ fontWeight: 600, color: '#a5b4fc' }}>
                  {(scent.identity.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 4, background: '#1e2533', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${scent.identity.confidence * 100}%`, background: '#6366f1', borderRadius: 99 }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono, valueStyle }: {
  label: string;
  value: string;
  mono?: boolean;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'monospace' : undefined, color: '#e2e8f0', ...valueStyle }}>{value}</span>
    </div>
  );
}
