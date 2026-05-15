import type { NextConfig } from 'next';
import path from 'path';

// Tindalabs packages are resolved directly from source until published to npm.
// tsconfig.json paths handle TypeScript; webpack aliases handle runtime bundling.
const tindalabsAliases: Record<string, string> = {
  '@tindalabs/blindspot':      path.resolve('../blindspot-ux/packages/web/src/index.ts'),
  '@tindalabs/blindspot-next': path.resolve('../blindspot-ux/packages/next/src/index.ts'),
  '@tindalabs/scent-sdk':      path.resolve('../scent/packages/sdk/src/index.ts'),
  '@tindalabs/scent-engine':   path.resolve('../scent/packages/engine/src/index.ts'),
  '@tindalabs/shield':         path.resolve('../shield/src/index.ts'),
};

const shieldSrc = path.resolve('../shield/src');

const nextConfig: NextConfig = {
  webpack(config: Parameters<NonNullable<NextConfig['webpack']>>[0], { webpack }) {
    config.resolve.alias = { ...config.resolve.alias, ...tindalabsAliases };
    // Source files in sibling repos use .js extensions for ESM compatibility;
    // tell webpack to also try .ts/.tsx when a .js import can't be found.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    // Shield's source uses @/ as a self-referencing alias for its own src/.
    // Intercept those imports only when they originate from within Shield.
    config.plugins!.push(
      new webpack.NormalModuleReplacementPlugin(/^@\//, (resource: { context: string; request: string }) => {
        if (resource.context.startsWith(shieldSrc)) {
          resource.request = resource.request.replace(/^@\//, shieldSrc + '/');
        }
      }),
    );
    return config;
  },
  async rewrites() {
    return [
      { source: '/v1/traces', destination: 'http://localhost:4318/v1/traces' },
    ];
  },
};

export default nextConfig;
