import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow local images from public/ to be optimised
    unoptimized: false,
  },
  // Allow the inference API to be called server-side
  async rewrites() {
    return [];
  },
};

export default nextConfig;
