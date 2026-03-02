import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add this to prevent Next.js from mangling the AWS SDK imports
  serverExternalPackages: [
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner'
  ],

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