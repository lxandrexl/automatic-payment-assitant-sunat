'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/calendario', label: 'Calendario', icon: '📅' },
  { href: '/ingresos', label: 'Ingresos', icon: '💰' },
  { href: '/comprobantes', label: 'Emitir', icon: '🧾' },
  { href: '/compras', label: 'Compras', icon: '🛒' },
  { href: '/config', label: 'Config', icon: '⚙️' },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden gap-1 sm:flex">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            isActive(pathname, t.href)
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-3xl">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition ${
                active ? 'text-emerald-400' : 'text-neutral-500'
              }`}
            >
              <span className={`text-lg leading-none ${active ? '' : 'opacity-70'}`}>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
