# [FE 핸드오프] 보안 헤더 적용 (`apps/web/next.config.mjs`)

- **작성일**: 2026-05-11
- **연관 계획서**: `docs/superpowers/plans/2026-05-11-security-remediation.md` §H2
- **연관 학습 문서**: `docs/2026-05-11-security-deep-dive.md` §H2 + [H1·H2 보충]
- **BE 측 작업**: 완료 (apps/api/next.config.ts 에 동일 헤더 적용 + apps/api/src/lib/auth.ts 에 Secure 플래그 적용)

---

## 목적

HTTPS 통신만 강제하고 XSS·클릭재킹·MIME 스니핑·Referrer 누설을 차단하기 위해 사용자 응답 (apps/web) 에 보안 헤더를 추가.

특히 **HSTS** 가 없으면 사용자가 매번 첫 방문 시 HTTP 로 시도 → SSL Stripping 공격 가능 → 본 작업으로 해결.

---

## 변경 파일

`apps/web/next.config.mjs` — 단일 파일.

## 변경 전

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

## 변경 후 (적용 부탁드립니다)

```js
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
```

---

## 각 헤더의 의미

| 헤더 | 값 | 방어 위협 |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | SSL Stripping, HTTPS 다운그레이드. 2년간 HTTPS 강제. |
| `X-Content-Type-Options` | `nosniff` | 브라우저의 MIME 추측으로 인한 XSS. |
| `X-Frame-Options` | `DENY` | 클릭재킹 (투명 iframe 위장). |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 외부 사이트로 이동 시 URL 내 토큰·세션 누설. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | XSS 발생 시에도 강력한 API 자체 차단. |

상세 학습 자료: `docs/2026-05-11-security-deep-dive.md` §H2 + 보충 섹션.

---

## 검증 방법

배포 후:

```bash
curl -I https://<prod-domain>/
# 위 헤더 5개가 응답에 포함되는지 확인
```

또는 https://securityheaders.com/?q=<prod-domain> 에서 A 등급 이상 확인.

로컬:

```bash
pnpm --filter web dev
curl -I http://localhost:3000/
# 동일 헤더 확인 (단, HSTS 는 HTTP 응답에서는 브라우저가 무시하므로 헤더 자체만 확인)
```

---

## 주의사항

1. **HSTS preload 등록은 별도 작업**: 헤더 추가만으로는 첫 방문이 여전히 HTTP. `hstspreload.org` 에 도메인 등록 필요. 등록 전에는 `max-age` 짧게 시작 권장 가능하지만, 본 프로젝트는 운영 도메인이 안정적이므로 2년 즉시 적용도 OK.

2. **CSP 는 별도 단계**: Content-Security-Policy 는 inline script / Next.js hydration 영향 커서 본 PR 에 포함 안 함. 별도 PR 에서 Report-Only 로 시작 → 위반 로그 수집 → enforce 권장.

3. **`X-Frame-Options: DENY`**: 본 서비스가 어떤 외부 사이트의 iframe 으로 임베드될 필요가 있다면 `SAMEORIGIN` 으로 변경. 현재로서는 DENY 가 안전.

4. **`images.remotePatterns` (L5)**: 별도 항목. 이번 PR 에 포함해도 좋고 (외부 이미지 도메인 allowlist), 분리해도 OK.

---

## 추가 점검 권장 (선택)

`apps/web/next.config.mjs:7` 의 fallback `http://localhost:3001` 은 prod 빌드 시점에 `NEXT_PUBLIC_API_URL` 이 누락된 경우에만 사용됨. CI/Vercel 환경변수가 prod 에서 반드시 설정되도록 확인.

prod 배포 시 그 fallback 이 동작하지 않도록 다음과 같이 강화 가능:

```js
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL must be set in production');
  }
}
const apiBase = apiUrl || 'http://localhost:3001';
```

(선택 사항. 본 PR 스코프 외이므로 분리 가능.)
