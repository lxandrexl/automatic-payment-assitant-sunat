'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-ink">No pudimos cargar esta pantalla</h1>
      <p className="mt-2 text-sm text-ink2">
        Puede ser un corte momentáneo de conexión. Tus datos no se perdieron.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
      >
        Reintentar
      </button>
    </div>
  );
}
