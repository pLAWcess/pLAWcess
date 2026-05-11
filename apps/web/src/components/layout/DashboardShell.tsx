'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { useIsMobile } from '@/lib/useIsMobile';

import type { AuthUser } from '@/lib/api';

export default function DashboardShell({ children, role, initialUser }: { children: React.ReactNode; role?: string; initialUser?: AuthUser | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile(768);

  return (
    <div className="flex flex-col h-screen">
      <Navbar
        onMenuToggle={isMobile ? () => setMobileOpen((o) => !o) : undefined}
        initialUser={initialUser}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          initialRole={role}
          initialUser={initialUser}
          isMobile={isMobile}
        />
        <main className="flex-1 overflow-auto bg-page-bg">
          <div className="px-4 py-6 md:px-10 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
