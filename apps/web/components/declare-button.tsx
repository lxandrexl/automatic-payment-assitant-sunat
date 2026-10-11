'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mutate } from '@/lib/mutate';
import { inputCls } from '@/components/ui';

export function DeclareButton({ period }: { period: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function declare() {
    setBusy(true);
    setErr(null);
    try {
      await mutate(`/periods/${period}/declare`, 'POST', ref.trim() ? { paymentRef: ref.trim() } : {});
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover sm:w-auto"
      >
        ✓ Ya declaré y pagué
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="N.º de orden o constancia (opcional)"
        className={inputCls}
      />
      <div className="flex gap-2">
        <button
          onClick={declare}
          disabled={busy}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Confirmar'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl bg-sunken px-4 py-2 text-sm hover:bg-line"
        >
          Cancelar
        </button>
      </div>
      {err && <p className="text-sm text-bad">{err}</p>}
    </div>
  );
}
