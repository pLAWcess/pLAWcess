import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";
import { resolveProcessYear } from "@/lib/active-cycle";

/**
 * preferred_group 이 '가'면 가군이 1지망, 아니면 나군이 1지망.
 * preferred_group 미지정인 경우는 가군을 1지망으로 fallback.
 */
function pickPreferenceSchools(
  preferredGroup: string | null,
  ga: string | null,
  na: string | null,
): { first: string | null; second: string | null } {
  if (preferredGroup === "나") return { first: na, second: ga };
  return { first: ga, second: na };
}

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const yr = await resolveProcessYear(req);
  if (yr.error) return yr.error;
  const year = yr.year;

  const baseSelect = {
    application_id: true,
    user: {
      select: {
        user_id: true,
        name: true,
        student_id: true,
        account_status: true,
        undergrad_first_major: true,
      },
    },
  } as const;

  const [menteeRows, mentorRows] = await prisma.$transaction([
    prisma.application.findMany({
      where: { role: "mentee", process_year: year, application_status: "approved" },
      orderBy: { user: { name: "asc" } },
      select: {
        ...baseSelect,
        mentee_record: {
          select: {
            target_school_ga: true,
            target_school_na: true,
            preferred_group: true,
          },
        },
      },
    }),
    prisma.application.findMany({
      where: { role: "mentor", process_year: year, application_status: "approved" },
      orderBy: { user: { name: "asc" } },
      select: baseSelect,
    }),
  ]);

  // 멘토 latest record 의 lawschool_name
  const mentorUserIds = mentorRows.map((r) => r.user.user_id);
  const records =
    mentorUserIds.length === 0
      ? []
      : await prisma.mentorRecord.findMany({
          where: { user_id: { in: mentorUserIds } },
          orderBy: { process_year: "desc" },
          select: { user_id: true, lawschool_name: true },
        });
  const lawschoolByUser = new Map<string, string | null>();
  for (const r of records) {
    if (!lawschoolByUser.has(r.user_id)) {
      lawschoolByUser.set(r.user_id, r.lawschool_name);
    }
  }

  return NextResponse.json({
    year,
    mentees: menteeRows.map((r) => {
      const pref = pickPreferenceSchools(
        r.mentee_record?.preferred_group ?? null,
        r.mentee_record?.target_school_ga ?? null,
        r.mentee_record?.target_school_na ?? null,
      );
      return {
        applicationId: r.application_id,
        userId: r.user.user_id,
        name: r.user.name,
        studentId: r.user.student_id ?? "",
        major: r.user.undergrad_first_major ?? "",
        firstPreferenceSchool: pref.first,
        secondPreferenceSchool: pref.second,
        accountStatus: r.user.account_status,
      };
    }),
    mentors: mentorRows.map((r) => ({
      applicationId: r.application_id,
      userId: r.user.user_id,
      name: r.user.name,
      studentId: r.user.student_id ?? "",
      undergradMajor: r.user.undergrad_first_major ?? "",
      lawSchool: lawschoolByUser.get(r.user.user_id) ?? null,
      accountStatus: r.user.account_status,
    })),
  });
}
