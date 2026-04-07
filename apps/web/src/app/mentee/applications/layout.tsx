import DashboardShell from '@/components/layout/DashboardShell';

export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
