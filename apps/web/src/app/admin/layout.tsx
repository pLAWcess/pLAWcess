import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { getAuthUser } from '@/lib/server-fetch';

const COOKIE_NAME = 'plawcess_token';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) redirect('/login');

  const initialUser = await getAuthUser(token);
  if (!initialUser) redirect('/login');

  return (
    <DashboardShell initialUser={initialUser}>
      <div className="page-container w-full">{children}</div>
    </DashboardShell>
  );
}
