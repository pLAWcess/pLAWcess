import { cookies } from 'next/headers';
import { serverFetchOrThrow } from '@/lib/server-fetch';
import type { CycleSchedule } from '@/lib/api';
import YearSettingsClient from './YearSettingsClient';

export default async function YearSettingsPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const schedules = await serverFetchOrThrow<CycleSchedule[]>('/api/admin/cycle-schedules', token);
  return <YearSettingsClient initialSchedules={schedules} />;
}
