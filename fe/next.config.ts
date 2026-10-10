import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  experimental: { proxyClientMaxBodySize: '260mb' },
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000';
    const algo = process.env.ALGO_INTERNAL_URL || 'http://localhost:8080';
    return [
      { source: '/api/:path*/', destination: `${backend}/api/:path*/` },
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/algo-api/:path*', destination: `${algo}/api/:path*` },
    ];
  },
  // Docker trên Windows: sự kiện đổi file không truyền vào container -> quét định kỳ
  webpack: (config, { dev }) => {
    if (dev && process.env.WATCHPACK_POLLING) {
      config.watchOptions = { ...config.watchOptions, poll: 1000, aggregateTimeout: 300 };
    }
    return config;
  },
};

export default nextConfig;
