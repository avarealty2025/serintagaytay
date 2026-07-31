import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The engine and data modules import with explicit .ts extensions so that
  // bare `node scripts/*.ts` works without a loader. See DECISIONS.md D14.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
