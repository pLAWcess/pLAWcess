import { cookies } from 'next/headers';
import MenteeDetailClient from './MenteeDetailClient';
import { serverFetch } from '@/lib/server-fetch';
import type { MenteeDetailResponse } from '@/lib/api';

export default async function MenteeDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = await serverFetch<MenteeDetailResponse>(
    `/api/mentor/mentees/${encodeURIComponent(matchId)}`,
    token,
  );

  return <MenteeDetailClient data={data} />;
}
