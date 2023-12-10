/**
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '500kb',
    },
  },
  reactStrictMode: true,
  publicRuntimeConfig: {
    publicApiKey: process.env.publicApiKey || '',
    authDomain: process.env.FIREBASE_AUTH_HOST || '',
    projectId: process.env.projectId || '',
  },
}

module.exports = nextConfig;
