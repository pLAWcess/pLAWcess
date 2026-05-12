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
  // mammoth는 동적 require로 인코딩 테이블을 읽어 webpack 번들과 충돌 →
  // node_modules에서 직접 resolve하도록 external 처리.
  serverExternalPackages: ["mammoth", "playwright-core", "@sparticuz/chromium"],
  // playwright-core / @sparticuz/chromium은 비-JS 파일(browsers.json 등)을 동적 require하므로
  // Vercel 파일 트레이싱이 누락 → 성적 스크래핑 라우트에 패키지 전체를 강제 포함
  outputFileTracingIncludes: {
    "/api/mentee/grades": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
      "../../node_modules/.pnpm/playwright-core@*/node_modules/playwright-core/**/*",
      "../../node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/**/*",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
