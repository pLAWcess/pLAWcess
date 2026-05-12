import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  const active = await prisma.cycleSchedule.findFirst({
    where: { is_active: true },
  });

  return NextResponse.json(active);
}
