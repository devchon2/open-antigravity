/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@open-antigravity/shared'],
  output: 'standalone',
};
module.exports = nextConfig;
