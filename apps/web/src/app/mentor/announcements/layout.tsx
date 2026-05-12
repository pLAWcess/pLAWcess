import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { getAuthUser, serverFetch } from '@/lib/server-fetch';

const COOKIE_NAME = 'plawcess_token';

export default async function MentorAnnouncementsLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) redirect('/login');

  const [initialUser, reminderStatus] = await Promise.all([
    getAuthUser(token),
    serverFetch<{ showReminder: boolean }>('/api/auth/password-reminder-status', token),
  ]);
  if (!initialUser) redirect('/login');
  if (initialUser.current_role !== 'mentor') redirect('/login');

  return (
    <DashboardShell initialUser={initialUser} showPasswordReminder={reminderStatus?.showReminder ?? false}>
      {children}
    </DashboardShell>
  );
}
