import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AdminApplicationsClient from './AdminApplicationsClient';
import type { CycleSchedule, Paged, AdminMenteeApplicationRow, AdminMentorApplicationRow } from '@/lib/api';

export default async function AdminApplicationsPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const schedules = await serverFetch<CycleSchedule[]>('/api/admin/cycle-schedules', token) ?? [];
  const active = schedules.find((s) => s.is_active);
  const initialYear = active?.process_year ?? (schedules.length > 0 ? schedules[0].process_year : null);

  const [initialMenteeData, initialMentorData] = await Promise.all([
    initialYear
      ? serverFetch<Paged<AdminMenteeApplicationRow>>(`/api/admin/applications?role=mentee&year=${initialYear}&page=1&limit=5`, token)
      : null,
    initialYear
      ? serverFetch<Paged<AdminMentorApplicationRow>>(`/api/admin/applications?role=mentor&year=${initialYear}&page=1&limit=5`, token)
      : null,
  ]);

  return (
    <AdminApplicationsClient
      initialYear={initialYear}
      initialMenteeData={initialMenteeData ?? null}
      initialMentorData={initialMentorData ?? null}
    />
  );
}
