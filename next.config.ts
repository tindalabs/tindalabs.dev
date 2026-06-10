import type { NextConfig } from 'next';

// Static export for GitHub Pages.
//
// The site is fully client-rendered: the LiveStack demo runs Shield, Scent and
// Blindspot entirely in the browser (no backend - Scent scores against a
// localStorage baseline via @tindalabs/scent-engine, Blindspot renders its own
// spans in-page), so the whole thing ships as static HTML/JS with no server
// runtime. The Tindalabs SDKs are consumed from npm (see package.json).

// Served from a GitHub Pages project path (https://tindalabs.github.io/tindalabs.dev/),
// not a custom domain, so the export needs a basePath to prefix every asset and
// route. Applied only to the production build so local `next dev` stays at root.
const basePath = process.env.NODE_ENV === 'production' ? '/tindalabs.dev' : '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
