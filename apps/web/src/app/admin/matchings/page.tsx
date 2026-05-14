import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AdminMatchingsClient from './AdminMatchingsClient';
import type { EligiblePool, GetMatchingResultsResponse, GetSuggestionsResponse } from '@/lib/api';

export default async function AdminMatchingsPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const [pool, suggestions, results] = await Promise.all([
    serverFetch<EligiblePool>('/api/admin/matchings/eligible', token),
    serverFetch<GetSuggestionsResponse>('/api/admin/matchings/suggestions', token),
    serverFetch<GetMatchingResultsResponse>('/api/admin/matchings/results', token),
  ]);
  return (
    <AdminMatchingsClient
      initialPool={pool}
      initialSuggestions={suggestions}
      initialResults={results}
    />
  );
}
