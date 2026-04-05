import { redirect } from 'next/navigation';

export default function DashboardPage() {
  redirect('/mentee/dashboard/basic-info');
}
