import { cookies } from 'next/headers';
import ApplicationsClient from './ApplicationsClient';
import type { CycleSchedule, BasicInfoAdmission, ConcernData, MenteeApplicationStatus } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const COOKIE_NAME = 'plawcess_token';

async function fetchWithCookie<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ApplicationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? '';

  const activeSchedule = await fetchWithCookie<CycleSchedule>('/api/cycle-schedules/active', token);

  let initialAdmission: BasicInfoAdmission | null = null;
  let initialConcerns: ConcernData | null = null;
  let initialStatus: MenteeApplicationStatus | null = null;
  if (activeSchedule) {
    const year = encodeURIComponent(`${activeSchedule.process_year}학년도`);
    const [basicInfo, concerns, status] = await Promise.all([
      fetchWithCookie<{ admission: BasicInfoAdmission }>(`/api/mentee/basic-info?year=${year}`, token),
      fetchWithCookie<ConcernData>(`/api/mentee/concerns?year=${year}`, token),
      fetchWithCookie<MenteeApplicationStatus>(`/api/mentee/applications/status?year=${year}`, token),
    ]);
    initialAdmission = basicInfo?.admission ?? null;
    initialConcerns = concerns;
    initialStatus = status;
  }

  return (
    <ApplicationsClient
      initialSchedule={activeSchedule}
      initialAdmission={initialAdmission}
      initialConcerns={initialConcerns}
      initialStatus={initialStatus}
    />
  );
}
