'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-page-bg">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
