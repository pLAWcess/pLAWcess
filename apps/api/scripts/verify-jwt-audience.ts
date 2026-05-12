// JWT 세션 토큰 audience/issuer 강제 검증.
// 실행: node --env-file=apps/api/.env --experimental-strip-types apps/api/scripts/verify-jwt-audience.ts
//
// verifyToken 은 세션 audience("session")·issuer("pLAWcess")인 토큰만 인정해야 한다.
// 그 외(aud 없음, 다른 aud, 다른 iss, 다른 secret, 만료) → null.
import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../src/lib/auth.ts";

const SECRET = process.env.JWT_SECRET as string;
if (!SECRET) {
  console.error("JWT_SECRET 가 없습니다. node --env-file=apps/api/.env ... 로 실행하세요.");
  process.exit(1);
}

const payload = { user_id: "00000000-0000-0000-0000-000000000001", current_role: "mentee" };

type Case = { name: string; token: string; expect: "ok" | "null" };

const cases: Case[] = [
  {
    name: "signToken 산출물 (aud=session, iss=pLAWcess)",
    token: signToken(payload),
    expect: "ok",
  },
  {
    name: "aud/iss 없음 (jwt.sign(payload, SECRET))",
    token: jwt.sign(payload, SECRET),
    expect: "null",
  },
  {
    name: "aud=password-reset, iss=pLAWcess",
    token: jwt.sign(payload, SECRET, { audience: "password-reset", issuer: "pLAWcess" }),
    expect: "null",
  },
  {
    name: "aud=email-verification:signup, iss=pLAWcess",
    token: jwt.sign(payload, SECRET, { audience: "email-verification:signup", issuer: "pLAWcess" }),
    expect: "null",
  },
  {
    name: "aud=session, iss=evil",
    token: jwt.sign(payload, SECRET, { audience: "session", issuer: "evil" }),
    expect: "null",
  },
  {
    name: "aud=session, iss=pLAWcess, 다른 secret 으로 서명",
    token: jwt.sign(payload, SECRET + "-wrong", { audience: "session", issuer: "pLAWcess" }),
    expect: "null",
  },
  {
    name: "aud=session, iss=pLAWcess, 만료됨",
    token: jwt.sign(payload, SECRET, { audience: "session", issuer: "pLAWcess", expiresIn: "-1s" }),
    expect: "null",
  },
];

let failed = 0;
for (const c of cases) {
  const r = verifyToken(c.token);
  const got = r === null ? "null" : "ok";
  let pass = got === c.expect;
  // ok 케이스는 payload 보존도 확인
  if (pass && c.expect === "ok" && (r?.user_id !== payload.user_id || r?.current_role !== payload.current_role)) {
    pass = false;
  }
  if (!pass) failed++;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${c.name}  →  expected ${c.expect}, got ${got}` +
      (c.expect === "ok" && r ? ` (user_id=${r.user_id}, role=${r.current_role})` : ""),
  );
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} cases passed.`);
