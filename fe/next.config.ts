import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker trên Windows: sự kiện đổi file không truyền vào container -> quét định kỳ
  webpack: (config, { dev }) => {
    if (dev && process.env.WATCHPACK_POLLING) {
      config.watchOptions = { ...config.watchOptions, poll: 1000, aggregateTimeout: 300 };
    }
    return config;
  },
};

export default nextConfig;
