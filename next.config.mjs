import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

export default function nextConfig(phase) {
  return {
    reactStrictMode: true,
    // Keep development output separate from production builds so `next build`
    // cannot corrupt a running `next dev` server.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  };
}
