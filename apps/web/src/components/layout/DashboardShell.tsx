'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      <Navbar onMenuToggle={() => setMobileOpen((o) => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="flex-1 overflow-auto bg-page-bg">
          <div className="px-10 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
