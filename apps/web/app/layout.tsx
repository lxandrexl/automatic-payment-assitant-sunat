import type { Metadata } from 'next';
import './globals.css';
import { BottomNav, MobileHeader, Sidebar } from '@/components/nav';

export const metadata: Metadata = {
  title: 'Tributo',
  description: 'Panel tributario personal SUNAT',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <Sidebar />
        <div className="lg:pl-60">
          <MobileHeader />
          <main className="w-full max-w-[2200px] px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-9 lg:pb-12 2xl:px-14">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
