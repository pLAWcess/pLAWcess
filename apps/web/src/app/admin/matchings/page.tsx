import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AdminMatchingsClient from './AdminMatchingsClient';
import type { EligiblePool } from '@/lib/api';

export default async function AdminMatchingsPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const pool = await serverFetch<EligiblePool>('/api/admin/matchings/eligible', token);
  return <AdminMatchingsClient initialPool={pool} />;
}
