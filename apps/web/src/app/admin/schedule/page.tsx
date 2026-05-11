import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import type { CycleSchedule } from '@/lib/api';
import ScheduleClient from './ScheduleClient';

export default async function SchedulePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const schedules = await serverFetch<CycleSchedule[]>('/api/admin/cycle-schedules', token);
  return <ScheduleClient initialSchedules={schedules ?? []} />;
}
