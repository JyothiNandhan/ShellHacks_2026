import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', outputFileTracingRoot: new URL('../..', import.meta.url).pathname, poweredByHeader: false, logging: { incomingRequests: false, fetches: { fullUrl: false } } };
export default config;
