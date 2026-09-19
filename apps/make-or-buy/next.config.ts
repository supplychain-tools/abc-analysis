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
/**
 * Where the site is mounted, when it is not at the root of its domain.
 *
 * GitHub Pages serves a project repository under /<repo>/, so every asset URL
 * the build writes has to carry that prefix or the page loads and then fails
 * to find its own stylesheet — a wall of unstyled text.
 *
 * It comes from the environment rather than being written in, because the same
 * source has to serve two mountings: the deployment at /make-or-buy/, and the
 * dev server and Playwright suite at the root of localhost. Unset means root,
 * which is what every local command gets.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@sct/shared', '@sct/tools'],
  basePath,
};

export default nextConfig;
