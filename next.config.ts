import type { NextConfig } from 'next';
import path from 'node:path';

// Static export for GitHub Pages.
//
// The site is fully client-rendered: the LiveStack demo runs Shield, Scent and
// Blindspot entirely in the browser (no backend — Scent scores against a
// localStorage baseline via @tindalabs/scent-engine, Blindspot renders its own
// spans in-page), so the whole thing ships as static HTML/JS with no server
// runtime. The Tindalabs SDKs are now consumed from npm (see package.json).
//
// Workaround: @tindalabs/shield's published dist still emits a self-referential
// `@/core/index.js` import that tsc did not rewrite to a relative path (a shield
// packaging bug — affects any bundler-based consumer). Map `@/…` to shield's own
// dist, scoped to modules inside @tindalabs/shield so the app's own `@/` alias
// (see tsconfig paths) is untouched. Remove once shield ships relative imports.
const shieldDist = path.resolve('node_modules/@tindalabs/shield/dist');

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  webpack(config: Parameters<NonNullable<NextConfig['webpack']>>[0], { webpack }) {
    config.plugins!.push(
      new webpack.NormalModuleReplacementPlugin(/^@\//, (resource: { context: string; request: string }) => {
        if (resource.context.startsWith(shieldDist)) {
          resource.request = resource.request.replace(/^@\//, shieldDist + '/');
        }
      }),
    );
    return config;
  },
};

export default nextConfig;
