import { cookies } from 'next/headers';
import MentorDashboardClient from './MentorDashboardClient';
import { serverFetch } from '@/lib/server-fetch';
import type { MentorProcessStatus, CycleSchedule } from '@/lib/api';

export default async function MentorDashboardPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';

  const [status, cycle] = await Promise.all([
    serverFetch<MentorProcessStatus>('/api/mentor/process-status', token),
    serverFetch<CycleSchedule>('/api/cycle-schedules/active', token),
  ]);

  return <MentorDashboardClient status={status} cycle={cycle} />;
}
