import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers for static assets and routes not handled by middleware
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
