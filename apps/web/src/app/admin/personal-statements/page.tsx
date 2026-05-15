import { cookies } from 'next/headers';
import { serverFetch, serverFetchOrThrow, getActiveProcessYear } from '@/lib/server-fetch';
import PersonalStatementsClient from './PersonalStatementsClient';
import type { CycleSchedule, SchoolTemplate } from '@/lib/api';

function resolveYear(raw: string | undefined, schedules: CycleSchedule[], fallback: string): string {
  const match = raw?.match(/\d{4}/)?.[0];
  if (match && schedules.some((s) => String(s.process_year) === match)) return match;
  return fallback;
}

export default async function PersonalStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: rawYear } = await searchParams;
  const token = (await cookies()).get('plawcess_token')?.value ?? '';

  const [schedules, activeYear] = await Promise.all([
    serverFetch<CycleSchedule[]>('/api/admin/cycle-schedules', token).then((s) => s ?? []),
    getActiveProcessYear(token),
  ]);

  const selectedYear = resolveYear(rawYear, schedules, activeYear);

  const data = await serverFetchOrThrow<{ templates: SchoolTemplate[] }>(
    `/api/admin/personal-statements?year=${encodeURIComponent(selectedYear)}`,
    token,
  );

  return (
    <PersonalStatementsClient
      schedules={schedules}
      selectedYear={selectedYear}
      initialTemplates={data.templates}
    />
  );
}
