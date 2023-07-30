const { withSentryConfig } = require('@sentry/nextjs')
const path = require('path')

const landingPagePaths = [
  '/',
  '/pricing',
  '/privacy-policies',
  '/terms-of-service',
  '/about',
  '/oss-friends',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@typebot.io/lib',
    '@typebot.io/schemas',
    '@typebot.io/emails',
  ],
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  async rewrites() {
    return {
      beforeFiles: (process.env.LANDING_PAGE_URL
        ? landingPagePaths
            .map((path) => ({
              source: '/_next/static/:static*',
              destination: `${process.env.LANDING_PAGE_URL}/_next/static/:static*`,
              has: [
                {
                  type: 'header',
                  key: 'referer',
                  value: `https://typebot.io${path}`,
                },
              ],
            }))
            .concat(
              landingPagePaths.map((path) => ({
                source: '/typebots/:typebot*',
                destination: `${process.env.LANDING_PAGE_URL}/typebots/:typebot*`,
                has: [
                  {
                    type: 'header',
                    key: 'referer',
                    value: `https://typebot.io${path}`,
                  },
                ],
              }))
            )
            .concat(
              landingPagePaths.map((path) => ({
                source: '/styles/:style*',
                destination: `${process.env.LANDING_PAGE_URL}/styles/:style*`,
                has: [
                  {
                    type: 'header',
                    key: 'referer',
                    value: `https://typebot.io${path}`,
                  },
                ],
              }))
            )
            .concat(
              landingPagePaths.map((path) => ({
                source: path,
                destination: `${process.env.LANDING_PAGE_URL}${path}`,
                has: [
                  {
                    type: 'host',
                    value: 'typebot.io',
                  },
                ],
              }))
            )
        : []
      ).concat({
        source: '/api/typebots/:typebotId/blocks/:blockId/storage/upload-url',
        destination:
          '/api/v1/typebots/:typebotId/blocks/:blockId/storage/upload-url',
      }),
    }
  },
}

const sentryWebpackPluginOptions = {
  silent: true,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA + '-viewer',
}

module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(
      {
        ...nextConfig,
        sentry: {
          hideSourceMaps: true,
          widenClientFileUpload: true,
        },
      },
      sentryWebpackPluginOptions
    )
  : nextConfig
