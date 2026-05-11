import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import PersonalStatementsClient from './PersonalStatementsClient';
import type { SchoolTemplate } from '@/lib/api';

const YEAR = new Date().getFullYear().toString();

export default async function PersonalStatementsPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = await serverFetch<{ templates: SchoolTemplate[] }>(
    `/api/admin/personal-statements?year=${encodeURIComponent(YEAR)}`,
    token,
  );
  return <PersonalStatementsClient initialTemplates={data?.templates ?? []} />;
}
