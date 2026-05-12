import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { getAuthUser, serverFetch, getRoleHomePath } from '@/lib/server-fetch';

const COOKIE_NAME = 'plawcess_token';

export default async function MentorDashboardLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) redirect('/login');

  const [initialUser, reminderStatus] = await Promise.all([
    getAuthUser(token),
    serverFetch<{ showReminder: boolean }>('/api/auth/password-reminder-status', token),
  ]);
  if (!initialUser) redirect('/login');
  if (initialUser.current_role !== 'mentor') redirect(getRoleHomePath(initialUser.current_role));

  return (
    <DashboardShell initialUser={initialUser} showPasswordReminder={reminderStatus?.showReminder ?? false}>
      {children}
    </DashboardShell>
  );
}
