import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid corrupted webpack pack cache causing MODULE_NOT_FOUND in dev
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
