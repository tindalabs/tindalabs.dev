'use client';

import { createElement, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

type EffectName = 'scramble' | 'rgbSplit' | 'scanlines' | 'flicker' | 'slice' | 'shake';
type Trigger = 'hover' | 'click' | 'scroll' | 'manual' | 'always';

interface GlitchTextProps {
  as?: keyof React.JSX.IntrinsicElements;
  children: ReactNode;
  effects: EffectName[];
  /** Default 'hover'. Use 'manual' + autoRunMs for a one-shot reveal on load. */
  trigger?: Trigger;
  /** For trigger='manual': run once on mount, then stop after this many ms. */
  autoRunMs?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A thin React wrapper around @isonimus/glitch-js (our own package). The library
 * is vanilla DOM, so we run it client-side in an effect against a ref and clean
 * up with destroy(). It is purely decorative: glitch-js is dynamically imported
 * (code-split, never blocks first paint) and the whole thing is skipped when the
 * visitor prefers reduced motion - which Blindspot itself reports, so honoring it
 * is on-brand.
 */
export default function GlitchText({
  as = 'span',
  children,
  effects,
  trigger = 'hover',
  autoRunMs,
  className,
  style,
}: GlitchTextProps) {
  const ref = useRef<HTMLElement>(null);
  const effectsKey = effects.join('|');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let glitch: { start(): void; stop(): void; destroy(): void } | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    import('@isonimus/glitch-js')
      .then(({ Glitch, Effects }) => {
        if (cancelled || !ref.current) return;
        glitch = new Glitch(ref.current, {
          trigger,
          effects: effectsKey.split('|').map((name) => Effects[name as EffectName]()),
        });
        if (trigger === 'manual' && autoRunMs) {
          glitch.start();
          timer = setTimeout(() => glitch?.stop(), autoRunMs);
        }
      })
      .catch(() => {
        /* decorative only - ignore load failures */
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      glitch?.destroy();
    };
  }, [trigger, autoRunMs, effectsKey]);

  return createElement(as, { ref, className, style } as Record<string, unknown>, children);
}
