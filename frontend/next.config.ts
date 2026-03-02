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
      {
        source: '/api/wake-oracle',
        destination: process.env.NEXT_PUBLIC_LAMBDA_WAKE_URL || 'https://tywmfy7l2o5kskdhzadfdgrbei0acwlf.lambda-url.ap-south-1.on.aws/',
      },
    ];
  },
};

export default nextConfig;