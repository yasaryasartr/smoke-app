import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // experimental: {
  //   turbo: {},
  // },
  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "X-Author",
            value: "Suat Erenler",
          },
          {
            key: "X-Created-By",
            value: "Erenler Yazilim ve Bilisim Teknolojileri",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
