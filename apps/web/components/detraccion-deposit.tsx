'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toCents } from '@tributo/core';
import { formatPen } from '@/lib/format';
import { mutate } from '@/lib/mutate';
import { Field, inputCls } from '@/components/ui';

export function DetraccionDeposit({
  invoiceId,
  expectedCents,
}: {
  invoiceId: string;
  expectedCents: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [depositedAt, setDepositedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [constanciaNumber, setConstanciaNumber] = useState('');
  const [montoSoles, setMontoSoles] = useState(String((expectedCents / 100).toFixed(2)));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setErr(null);
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await mutate(`/invoices/${invoiceId}/detraccion-deposit`, 'POST', {
        depositedAt,
        constanciaNumber,
        amountCents: toCents(Number(montoSoles)),
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-emerald-600/15 px-2 py-0.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/25"
      >
        Registrar depósito
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border border-neutral-800 bg-neutral-900 p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold">Registrar depósito de detracción</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Monto esperado: {formatPen(expectedCents)} (se acepta ±1 sol de diferencia).
            </p>

            <div className="mt-4 space-y-3">
              <Field label="Fecha del depósito">
                <input
                  type="date"
                  value={depositedAt}
                  onChange={(e) => setDepositedAt(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="N° de constancia">
                <input
                  value={constanciaNumber}
                  onChange={(e) => setConstanciaNumber(e.target.value)}
                  placeholder="de la constancia del Banco de la Nación"
                  className={inputCls}
                />
              </Field>
              <Field label="Monto depositado (S/)">
                <input
                  type="number"
                  step="0.01"
                  value={montoSoles}
                  onChange={(e) => setMontoSoles(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

            <div className="mt-4 flex gap-2">
              <button
                onClick={close}
                disabled={busy}
                className="flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={busy || !constanciaNumber || !montoSoles}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {busy ? 'Guardando…' : 'Confirmar depósito'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
