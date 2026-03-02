import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/oracle/:path*',
        destination: `${process.env.NEXT_PUBLIC_ORACLE_URL || 'http://13.233.210.171:8000'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
