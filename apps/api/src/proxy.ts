import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// TODO: 스테이징 서버 배포 후 해당 Vercel 주소 추가
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3002",
  "https://p-law-cess-web.vercel.app",
];

const COOKIE_NAME = "plawcess_token";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const PUBLIC_PREFIXES = ["/api/auth/", "/api/health"];

const ROLE_GUARDS: { prefix: string; role: "admin" | "mentor" | "mentee" }[] = [
  { prefix: "/api/admin/", role: "admin" },
  { prefix: "/api/mentor/", role: "mentor" },
  { prefix: "/api/mentee/", role: "mentee" },
];

async function getRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as { current_role?: string }).current_role ?? null;
  } catch {
    return null;
  }
}

function applyCors(res: NextResponse, allowOrigin: string): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", allowOrigin);
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

export async function proxy(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => path === p.replace(/\/$/, "") || path.startsWith(p),
  );

  if (!isPublic) {
    const guard = ROLE_GUARDS.find((g) => path.startsWith(g.prefix));
    if (guard) {
      const role = await getRole(req);
      if (!role) {
        return applyCors(
          NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
          allowOrigin,
        );
      }
      if (role !== "admin" && role !== guard.role) {
        return applyCors(
          NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }),
          allowOrigin,
        );
      }
    }
  }

  return applyCors(NextResponse.next(), allowOrigin);
}

export const config = {
  matcher: "/api/:path*",
};
