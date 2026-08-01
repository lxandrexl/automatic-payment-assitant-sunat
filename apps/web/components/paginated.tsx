'use client';

import { Children, useState } from 'react';

// Paginador genérico: recibe una lista de elementos ya ordenados (el caller decide
// el orden, típicamente más reciente arriba) y muestra `pageSize` por página, con
// controles solo si hay más de una página. Evita scroll largo en listas que crecen.
export function Paginated({
  children,
  pageSize = 6,
  className = 'space-y-2',
  label = 'registros',
}: {
  children: React.ReactNode;
  pageSize?: number;
  className?: string;
  label?: string;
}) {
  const items = Children.toArray(children);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages - 1);
  const start = current * pageSize;
  const shown = items.slice(start, start + pageSize);

  return (
    <>
      <div className={className}>{shown}</div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-neutral-800 pt-3 text-xs text-neutral-400">
          <span>
            {items.length} {label} · pág {current + 1}/{pages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              className="rounded-md bg-neutral-800 px-2 py-1 hover:bg-neutral-700 disabled:opacity-40"
            >
              ← Ant.
            </button>
            <button
              onClick={() => setPage(current + 1)}
              disabled={current >= pages - 1}
              className="rounded-md bg-neutral-800 px-2 py-1 hover:bg-neutral-700 disabled:opacity-40"
            >
              Sig. →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
