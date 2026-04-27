import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import DashboardShell from '@/components/layout/DashboardShell';

const COOKIE_NAME = 'plawcess_token';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect('/login');
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not set');
    }
    jwt.verify(token, secret);
  } catch {
    redirect('/login');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
