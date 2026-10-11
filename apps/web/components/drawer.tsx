'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// Panel deslizante (derecha en escritorio, hoja inferior en móvil) para formularios
// de alta: la lista queda visible detrás y no hay que bajar a buscar el formulario.
const CloseCtx = createContext<() => void>(() => {});
export const useDrawerClose = () => useContext(CloseCtx);

export function DrawerButton({
  label,
  title,
  children,
  small,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
  /** Botón secundario compacto (acciones dentro de una tarjeta), sin el "+". */
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          small
            ? 'rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover'
            : 'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover'
        }
      >
        {!small && (
          <span aria-hidden className="text-base leading-none">
            +
          </span>
        )}
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
          <div className="absolute inset-0 bg-ink/40" onClick={close} />
          <aside className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-2xl bg-surface shadow-xl lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[30rem] lg:rounded-none">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-ink">{title}</h2>
              <button
                onClick={close}
                aria-label="Cerrar"
                className="rounded-lg px-2 py-1 text-lg leading-none text-ink3 hover:bg-sunken hover:text-ink"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <CloseCtx.Provider value={close}>{children}</CloseCtx.Provider>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
