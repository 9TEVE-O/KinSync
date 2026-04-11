import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from the API in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
