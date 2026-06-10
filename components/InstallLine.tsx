'use client';

import { useState } from 'react';

/** An `npm install …` line with a copy-to-clipboard button (dev-audience DX). */
export default function InstallLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (e.g. insecure context) - no-op */
    }
  }

  return (
    <div
      className="install-line"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
    >
      <span>{command}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy: ${command}`}
        style={{
          flexShrink: 0,
          padding: '0.15rem 0.55rem',
          borderRadius: 6,
          border: '1px solid #1e2d40',
          background: copied ? '#14532d' : 'transparent',
          color: copied ? '#4ade80' : '#64748b',
          fontSize: '0.72rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}
