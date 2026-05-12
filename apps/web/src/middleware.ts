import { NextRequest, NextResponse } from "next/server";

// Content-Security-Policy — nonce 기반 엄격 정책. 지금은 Report-Only(차단 안 함, 위반만
// 브라우저 콘솔에 로그) 로 깔아 두고, 위반을 관찰한 뒤 후속 PR 에서 enforce 로 전환한다.
//
// Next.js 의 nonce 메커니즘: 미들웨어가 요청 헤더에 "Content-Security-Policy" 를 세팅하면
// Next 가 거기서 'nonce-...' 를 추출해 자기 인라인 <script>/<style> 에 자동 부착한다.
// 앱 코드에서 인라인 스크립트가 필요하면 headers().get("x-nonce") 로 받아 쓰면 된다.
//
// 기존 보안 헤더 5종은 next.config.mjs 의 headers() 에서 계속 적용된다(X-Frame-Options 포함 —
// CSP frame-ancestors 미지원 구형 브라우저 폴백).

export function middleware(request: NextRequest) {
  // Edge 런타임이라 Buffer 가 없음 → crypto.getRandomValues + btoa.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));

  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    `default-src 'self'`,
    // dev 에서는 Next HMR/React refresh 가 eval 을 써서 'unsafe-eval' 이 필요(프로덕션엔 없음).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' blob: data:`, // HWP 에디터 페이지 렌더링 / OG 이미지 등
    `font-src 'self'`, // Pretendard — public/ 로컬 폰트
    `connect-src 'self'`, // API 는 /api/* rewrite 라 same-origin
    `worker-src 'self' blob:`, // @rhwp/editor 가 Worker 를 쓸 수 있음
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next 가 nonce 를 추출하려면 요청 헤더의 "Content-Security-Policy" 를 본다 (-Report-Only 아님).
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // 브라우저에는 Report-Only 로 — 위반을 콘솔에 로그만 하고 차단하지 않는다.
  response.headers.set("Content-Security-Policy-Report-Only", csp);
  return response;
}

export const config = {
  // _next 내부·favicon·정적 에셋(확장자 있는 경로)·/api/* 는 제외 — HTML 페이지 요청에만.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
