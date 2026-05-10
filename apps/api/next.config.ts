import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@plawcess/database"],
  // 첨부 텍스트 추출 라이브러리들은 worker / 동적 require 등 webpack 번들과
  // 충돌하는 패턴을 쓰므로 external로 두어 node_modules에서 직접 resolve.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "officeparser", "mammoth"],
};

export default nextConfig;
