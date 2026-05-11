import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@plawcess/database"],
  // mammoth는 동적 require로 인코딩 테이블을 읽어 webpack 번들과 충돌 →
  // node_modules에서 직접 resolve하도록 external 처리.
  serverExternalPackages: ["mammoth"],
};

export default nextConfig;
