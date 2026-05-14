import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import MentorArchiveClient from './MentorArchiveClient';
import type { ArchiveCase, ArchiveCaseDefaults, ArchiveListResponse } from '@/lib/api';

export const metadata: Metadata = {
  title: 'pLAWcess | 합격 아카이브',
};

const EMPTY_LIST: ArchiveListResponse = {
  cases: [],
  filters: { majors: [], schools: [], years: [] },
};

export default async function MentorArchivePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  // 공개 케이스 + 본인 케이스 + 프리필 — SSR 에서 한 번에 조회.
  const [pub, mine, defaults] = await Promise.all([
    serverFetch<ArchiveListResponse>('/api/archive', token),
    serverFetch<{ cases: ArchiveCase[] }>('/api/mentor/archive', token),
    serverFetch<ArchiveCaseDefaults>('/api/mentor/archive/defaults', token),
  ]);

  return (
    <MentorArchiveClient
      initialPublic={pub ?? EMPTY_LIST}
      initialMine={mine ?? { cases: [] }}
      initialDefaults={defaults}
    />
  );
}
