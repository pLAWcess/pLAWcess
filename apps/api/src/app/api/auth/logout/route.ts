import { NextResponse } from "next/server";
import { makeClearCookie } from "@/lib/auth";

export async function POST() {
  return NextResponse.json(
    { message: "로그아웃 되었습니다." },
    { headers: { "Set-Cookie": makeClearCookie() } }
  );
}
