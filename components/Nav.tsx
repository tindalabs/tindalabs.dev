'use client';
import Link from 'next/link';
import { GitHubIcon } from './icons';

export default function Nav() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(15,17,23,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #1e2d40',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem' }}>
        <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
          Tindalabs
        </span>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="#blindspot" style={{ color: '#94a3b8', fontSize: '0.875rem' }} data-blindspot-label="nav-blindspot">Blindspot</Link>
          <Link href="#shield"    style={{ color: '#94a3b8', fontSize: '0.875rem' }} data-blindspot-label="nav-shield">Shield</Link>
          <Link href="#scent"     style={{ color: '#94a3b8', fontSize: '0.875rem' }} data-blindspot-label="nav-scent">Scent</Link>
          <a
            href="https://github.com/tindalabs"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            data-blindspot-label="nav-github"
          >
            <GitHubIcon /> GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
