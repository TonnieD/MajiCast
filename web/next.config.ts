import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow local images from public/ to be optimised
    unoptimized: false,
  },
  // Ensure environmental.csv is bundled with the /api/data serverless function on Vercel
  outputFileTracingIncludes: {
    "/api/data": ["./data/processed/environmental.csv"],
  },
  // Allow the inference API to be called server-side
  async rewrites() {
    return [];
  },
};

export default nextConfig;
