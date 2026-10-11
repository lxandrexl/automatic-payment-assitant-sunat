'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mutate } from '@/lib/mutate';
import { formatFechaCorta, formatPen } from '@/lib/format';
import { DrawerButton, useDrawerClose } from '@/components/drawer';
import { Field, inputCls } from '@/components/ui';
import type { FormPayment } from '@/lib/types';

type Form = 'f621' | 'f616';

/**
 * Estado de pago de UN formulario del mes. El F.621 y el F.616 se presentan y pagan
 * por separado, así que cada uno tiene su propio registro (fecha, monto y operación).
 */
export function FormPaymentBox({
  period,
  form,
  expectedCents,
  payment,
}: {
  period: string;
  form: Form;
  expectedCents: number;
  payment: FormPayment | null;
}) {
  const nombre = form === 'f621' ? 'F.621' : 'F.616';
  return payment ? (
    <Paid period={period} form={form} nombre={nombre} payment={payment} />
  ) : (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-page px-3 py-3">
      <span className="text-sm text-ink2">
        {expectedCents > 0 ? `Pendiente de pago: ${formatPen(expectedCents)}` : 'Nada que pagar por ahora'}
      </span>
      <DrawerButton small label={`Registrar pago del ${nombre}`} title={`Pago del ${nombre}`}>
        <PayForm period={period} form={form} expectedCents={expectedCents} />
      </DrawerButton>
    </div>
  );
}

function Paid({
  period,
  form,
  nombre,
  payment,
}: {
  period: string;
  form: Form;
  nombre: string;
  payment: FormPayment;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function undo() {
    setBusy(true);
    setErr(null);
    try {
      await mutate(`/periods/${period}/payments/${form}`, 'DELETE');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-ok-soft px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-ok">
          {nombre} pagado · {formatPen(payment.amountCents)}
        </span>
        {confirm ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-ink2">¿Quitar este pago?</span>
            <button onClick={undo} disabled={busy} className="font-semibold text-bad hover:underline disabled:opacity-50">
              Sí, quitar
            </button>
            <button onClick={() => setConfirm(false)} className="text-ink2 hover:underline">
              No
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirm(true)} className="text-xs text-ink3 hover:text-bad hover:underline">
            Deshacer
          </button>
        )}
      </div>
      <div className="mt-0.5 text-xs text-ink2">
        {formatFechaCorta(payment.paidAt)}
        {payment.ref && ` · Operación ${payment.ref}`}
      </div>
      {err && <p className="mt-1 text-xs text-bad">{err}</p>}
    </div>
  );
}

function PayForm({
  period,
  form,
  expectedCents,
}: {
  period: string;
  form: Form;
  expectedCents: number;
}) {
  const router = useRouter();
  const close = useDrawerClose();
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [monto, setMonto] = useState((expectedCents / 100).toFixed(2));
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await mutate(`/periods/${period}/payments/${form}`, 'POST', {
        paidAt,
        amountCents: Math.round((Number(monto) || 0) * 100),
        ...(ref.trim() ? { ref: ref.trim() } : {}),
      });
      router.refresh();
      close();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Fecha de pago">
        <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Monto pagado (S/)">
        <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} className={inputCls} />
        <span className="mt-1 block text-xs text-ink3">
          Lo que realmente pagaste. Puede ser 0 si lo cubriste con tus detracciones.
        </span>
      </Field>
      <Field label="N.º de operación u orden (opcional)">
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ej. 7848179635" className={inputCls} />
      </Field>
      {err && <p className="text-sm text-bad">{err}</p>}
      <button
        onClick={submit}
        disabled={busy || !paidAt}
        className="w-full rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Guardar pago'}
      </button>
    </div>
  );
}
