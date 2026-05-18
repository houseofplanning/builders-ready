import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@br/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
