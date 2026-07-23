'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mutate } from '@/lib/mutate';

export function DeclareButton({ period }: { period: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function declare() {
    setBusy(true);
    setErr(null);
    try {
      const paymentRef = window.prompt('Nro de orden NPS / constancia (opcional):') ?? undefined;
      await mutate(`/periods/${period}/declare`, 'POST', paymentRef ? { paymentRef } : {});
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={declare}
        disabled={busy}
        className="mt-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy ? 'Marcando…' : 'Marcar declarado'}
      </button>
      {err && <p className="mt-1 text-sm text-red-400">{err}</p>}
    </div>
  );
}
