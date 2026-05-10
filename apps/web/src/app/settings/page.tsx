import { cookies } from 'next/headers';
import { getAuthUser } from '@/lib/server-fetch';
import AccountSettings from '@/components/settings/AccountSettings';

const COOKIE_NAME = 'plawcess_token';

export default async function SettingsPage() {
  const token = (await cookies()).get(COOKIE_NAME)?.value ?? '';
  const initialUser = await getAuthUser(token);
  return <AccountSettings initialUser={initialUser} />;
}
