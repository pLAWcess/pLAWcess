import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AdminApplicationsClient from './AdminApplicationsClient';
import type { CycleSchedule } from '@/lib/api';

export default async function AdminApplicationsPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const schedules = await serverFetch<CycleSchedule[]>('/api/admin/cycle-schedules', token) ?? [];
  return <AdminApplicationsClient initialSchedules={schedules} />;
}
