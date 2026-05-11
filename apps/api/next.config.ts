import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@plawcess/database"],
  // 첨부 텍스트 추출 라이브러리들은 worker / 동적 require 등 webpack 번들과
  // 충돌하는 패턴을 쓰므로 external로 두어 node_modules에서 직접 resolve.
  serverExternalPackages: ["unpdf", "officeparser", "mammoth"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
