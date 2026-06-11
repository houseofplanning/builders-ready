import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@br/shared'],
  // typedRoutes is disabled because several server-action return values
  // (e.g. createTenantAndOwner -> /onboarding/branding,
  //  acceptInvitation   -> /<slug>/dashboard,
  //  signInAction       -> /<slug>/dashboard) pass dynamic strings to
  // router.push, which the type checker rejects when typedRoutes is on.
  // Re-enable once those call sites are typed via `Route` casts.
  typedRoutes: false,
};

export default nextConfig;
