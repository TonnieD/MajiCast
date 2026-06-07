/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow local images from public/ to be optimised
    unoptimized: false,
  },
  experimental: {
    // Bundle environmental.csv into the /api/data serverless function on Vercel.
    // process.cwd() inside the function resolves to the project root, so the
    // traced path is: <root>/data/processed/environmental.csv
    outputFileTracingIncludes: {
      "/api/data": ["./data/processed/environmental.csv"],
    },
  },
};

export default nextConfig;
