import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** 社内 Nginx の `location /tanaoroshi/` と対応（末尾スラッシュなしでプロキシすること） */
  basePath: "/tanaoroshi",
};

export default nextConfig;
