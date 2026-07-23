import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tributo',
  description: 'Panel tributario personal SUNAT',
};

const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/periodos', label: 'Periodos' },
  { href: '/comprobantes', label: 'Comprobantes' },
  { href: '/compras', label: 'Compras' },
  { href: '/config', label: 'Config' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
          <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3 py-2 text-sm">
            <span className="mr-2 py-1.5 font-semibold text-emerald-400">Tributo</span>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="whitespace-nowrap rounded px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-3 py-4">{children}</main>
      </body>
    </html>
  );
}
