import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/inventory",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
