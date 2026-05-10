import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import LandingNavbar from './LandingNavbar';
import type { AuthUser } from '@/lib/api';

export default async function LandingNavbarServer() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = token
    ? await serverFetch<{ user: AuthUser }>('/api/auth/me', token)
    : null;
  return <LandingNavbar initialUser={data?.user ?? null} />;
}
