import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { BottomNav, TopNav } from '@/components/nav';

export const metadata: Metadata = {
  title: 'Tributo',
  description: 'Panel tributario personal SUNAT',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-sm">
                📊
              </span>
              <span className="font-semibold tracking-tight text-white">Tributo</span>
            </Link>
            <TopNav />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-5 pb-24 sm:pb-8">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
