'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toCents } from '@tributo/core';
import { mutate } from '@/lib/mutate';

export function DetraccionDeposit({
  invoiceId,
  expectedCents,
}: {
  invoiceId: string;
  expectedCents: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function register() {
    const constanciaNumber = window.prompt('Nro de constancia:');
    if (!constanciaNumber) return;
    const montoStr = window.prompt('Monto depositado (S/):', String(expectedCents / 100));
    if (montoStr === null) return;
    setBusy(true);
    try {
      await mutate(`/invoices/${invoiceId}/detraccion-deposit`, 'POST', {
        depositedAt: new Date().toISOString().slice(0, 10),
        constanciaNumber,
        amountCents: toCents(Number(montoStr)),
      });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={register} disabled={busy} className="text-emerald-400 underline disabled:opacity-50">
      {busy ? '…' : 'Registrar depósito'}
    </button>
  );
}
