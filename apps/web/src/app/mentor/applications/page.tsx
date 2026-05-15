import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import type { CycleSchedule, MentorApplicationStatus } from '@/lib/api';
import MentorApplicationsClient from './MentorApplicationsClient';

const COOKIE_NAME = 'plawcess_token';

export default async function MentorApplicationsPage() {
  const token = (await cookies()).get(COOKIE_NAME)?.value ?? '';

  const activeSchedule = await serverFetch<CycleSchedule>('/api/cycle-schedules/active', token);

  let initialStatus: MentorApplicationStatus | null = null;
  if (activeSchedule) {
    const year = encodeURIComponent(`${activeSchedule.process_year}학년도`);
    initialStatus = await serverFetch<MentorApplicationStatus>(
      `/api/mentor/applications/status?year=${year}`,
      token,
    );
  }

  return (
    <MentorApplicationsClient
      initialSchedule={activeSchedule}
      initialStatus={initialStatus}
    />
  );
}
