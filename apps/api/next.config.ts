import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // API 는 JSON 응답만 — 스크립트/스타일/프레임이 실행될 일이 없으므로 가장 엄격하게.
  { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@plawcess/database"],
  // mammoth는 동적 require로 인코딩 테이블을 읽어 webpack 번들과 충돌 →
  // node_modules에서 직접 resolve하도록 external 처리.
  serverExternalPackages: ["mammoth"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
