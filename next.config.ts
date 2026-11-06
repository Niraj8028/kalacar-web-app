import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Hostinger reports many CPUs but limits threads, so the default number of build workers crashes the build.
  experimental: { cpus: 2 },
};

export default nextConfig;
