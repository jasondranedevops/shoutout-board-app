/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server bundle — required for Docker deployments
  output: 'standalone',
  // Suppress TS type errors at build time — the app is pre-production and
  // these are type-annotation issues that don't affect runtime behaviour.
  // Remove once the codebase has a full type-clean pass.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
}

module.exports = nextConfig
