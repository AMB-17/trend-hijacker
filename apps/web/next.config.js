/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@packages/types"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
