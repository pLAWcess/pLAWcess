import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import type { CycleSchedule } from '@/lib/api';
import YearSettingsClient from './YearSettingsClient';

export default async function YearSettingsPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const schedules = await serverFetch<CycleSchedule[]>('/api/admin/cycle-schedules', token);
  return <YearSettingsClient initialSchedules={schedules ?? []} />;
}
