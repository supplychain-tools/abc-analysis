import type { NextConfig } from 'next';

/**
 * Static export: every calculation runs in the browser, so there is nothing to
 * serve beyond files. `next build` writes a complete site to out/, which is
 * what Vercel deploys and what the Playwright suite runs against.
 *
 * The shared layer ships as TypeScript source rather than as a built artefact,
 * so it has to be compiled with the app that imports it. One workspace, one
 * copy of the design system, and no build step between the two.
 */
const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@sct/shared', '@sct/tools'],
};

export default nextConfig;
