'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { computeRxhExterior, toCents } from '@tributo/core';
import { formatPen, formatUsd } from '@/lib/format';
import { mutate } from '@/lib/mutate';
import { DrawerButton, useDrawerClose } from '@/components/drawer';
import { FxRate, type RateInfo } from '@/components/fx-rate';
import { Field, inputCls, Row } from '@/components/ui';

/** Para un RxH que quedó registrado solo en soles pero se cobró en dólares. */
export function CompletarDolares({
  invoiceId,
  issueDate,
  retencionExteriorRate,
}: {
  invoiceId: string;
  issueDate: string;
  retencionExteriorRate: number;
}) {
  return (
    <DrawerButton small label="Completar datos en dólares" title="Datos en dólares del recibo">
      <Form invoiceId={invoiceId} issueDate={issueDate} rate={retencionExteriorRate} />
    </DrawerButton>
  );
}

function Form({ invoiceId, issueDate, rate }: { invoiceId: string; issueDate: string; rate: number }) {
  const router = useRouter();
  const close = useDrawerClose();
  const [usd, setUsd] = useState('');
  const [tc, setTc] = useState(0);
  const [info, setInfo] = useState<RateInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const grossCents = toCents(Number(usd) || 0);
  const x = tc > 0 && grossCents > 0 ? computeRxhExterior(grossCents, tc, rate) : null;

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await mutate(`/invoices/${invoiceId}/foreign`, 'PATCH', {
        foreignGrossCents: grossCents,
        exchangeRate: tc,
        rateInfo: info,
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
      <p className="text-sm text-ink2">
        Este recibo se registró solo en soles. Indica cuánto fue en dólares y con qué tipo de cambio
        se convirtió; el monto que declaras en Perú se recalcula con eso.
      </p>
      <Field label="Monto bruto (US$)">
        <input type="number" step="0.01" min="0" value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="2800" className={inputCls} />
      </Field>
      <Field label="Tipo de cambio (S/ por US$)">
        <FxRate
          period={issueDate.slice(0, 7)}
          onChange={(r, i) => {
            setTc(r);
            setInfo(i);
          }}
        />
      </Field>
      {x && (
        <div className="rounded-xl border border-line p-3">
          <Row label="Declaras en Perú" value={`${formatUsd(grossCents)} = ${formatPen(x.baseCents)}`} />
          {rate > 0 && (
            <Row label={`Retención en su país (${Math.round(rate * 100)}%)`} value={`− ${formatUsd(x.retencionExteriorFxCents)}`} />
          )}
          <Row label="Te llega a tu banco" value={`${formatUsd(x.netFxCents)} ≈ ${formatPen(x.netCents)}`} strong />
        </div>
      )}
      {err && <p className="text-sm text-bad">{err}</p>}
      <button
        onClick={submit}
        disabled={busy || !x}
        className="w-full rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}
