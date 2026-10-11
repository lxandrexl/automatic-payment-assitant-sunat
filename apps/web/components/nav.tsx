'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Íconos de trazo (24x24), sin dependencias.
const ICONS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  coins: 'M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5S9.8 10 12 10s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  cart: 'M3 4h2l2.5 11h10L20 7H6.5M9 20h.01M17 20h.01',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2l.4 2.7h4l.4-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 17h.01',
};

interface Item {
  href: string;
  label: string;
  icon: string;
  also?: string; // otra ruta que cuenta como "dentro de esta sección"
}

// Agrupado por "para qué lo uso", no por tabla de la base de datos.
const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Hoy', items: [{ href: '/', label: 'Resumen', icon: 'home' }] },
  {
    title: 'Impuestos',
    items: [{ href: '/calendario', label: 'Calendario', icon: 'calendar', also: '/periodos' }],
  },
  {
    title: 'Dinero',
    items: [
      { href: '/comprobantes', label: 'Ventas', icon: 'doc' },
      { href: '/compras', label: 'Compras', icon: 'cart' },
      { href: '/ingresos', label: 'Ingresos', icon: 'coins' },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { href: '/config', label: 'Ajustes', icon: 'gear' },
      { href: '/ayuda', label: 'Ayuda', icon: 'help' },
    ],
  },
];

const MOBILE: Item[] = [
  { href: '/', label: 'Resumen', icon: 'home' },
  { href: '/calendario', label: 'Calendario', icon: 'calendar', also: '/periodos' },
  { href: '/comprobantes', label: 'Ventas', icon: 'doc' },
  { href: '/compras', label: 'Compras', icon: 'cart' },
  { href: '/ingresos', label: 'Ingresos', icon: 'coins' },
  { href: '/config', label: 'Ajustes', icon: 'gear', also: '/ayuda' },
];

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function isActive(pathname: string, it: Item): boolean {
  if (it.href === '/') return pathname === '/';
  return pathname.startsWith(it.href) || (!!it.also && pathname.startsWith(it.also));
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
        T
      </span>
      <span className="text-base font-semibold tracking-tight text-ink">Tributo</span>
    </span>
  );
}

/** Barra lateral fija (escritorio). */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
      <Link href="/" className="px-5 py-5">
        <Logo />
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="px-3 pb-1.5 text-xs font-medium text-ink3">{g.title}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = isActive(pathname, it);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-brand-soft text-brand'
                        : 'text-ink2 hover:bg-sunken hover:text-ink'
                    }`}
                  >
                    <Icon name={it.icon} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-5 py-4 text-xs leading-relaxed text-ink3">
        Panel tributario personal
        <br />
        Régimen MYPE Tributario
      </div>
    </aside>
  );
}

/** Barra superior compacta (móvil). */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <Link href="/">
        <Logo />
      </Link>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-3xl">
        {MOBILE.map((it) => {
          const active = isActive(pathname, it);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition ${
                active ? 'text-brand' : 'text-ink3'
              }`}
            >
              <Icon name={it.icon} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
