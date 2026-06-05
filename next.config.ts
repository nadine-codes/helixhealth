import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Lint is run separately; don't block hackathon deploys on lint config.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
