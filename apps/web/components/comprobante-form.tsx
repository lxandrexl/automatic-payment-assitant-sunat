'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { computeFactura, computeRxh, toCents } from '@tributo/core';
import { formatPen } from '@/lib/format';
import { mutate } from '@/lib/mutate';
import type { Client } from '@/lib/types';
import { Card, Row } from '@/components/ui';

interface Props {
  clients: Client[];
  igvRate: number;
  detraccionRate: number;
  detraccionThresholdCents: number;
  retencion4taRate: number;
}

export function ComprobanteForm(props: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<'FACTURA' | 'RXH'>('FACTURA');
  const [clientId, setClientId] = useState('');
  const [series, setSeries] = useState('E001');
  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [baseSoles, setBaseSoles] = useState('9000');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const baseCents = toCents(Number(baseSoles) || 0);
  const selectedClient = props.clients.find((c) => c._id === clientId);
  const pagadorRetiene = selectedClient?.domiciliado !== false;
  const calc = useMemo(() => {
    const s = {
      igvRate: props.igvRate,
      detraccionRate: props.detraccionRate,
      detraccionThresholdCents: props.detraccionThresholdCents,
      pagoCuentaRate: 0.01,
      retencion4taRate: props.retencion4taRate,
    };
    return kind === 'FACTURA'
      ? { kind: 'FACTURA' as const, factura: computeFactura(baseCents, s) }
      : { kind: 'RXH' as const, rxh: computeRxh(baseCents, s, pagadorRetiene) };
  }, [kind, baseCents, props, pagadorRetiene]);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await mutate('/invoices', 'POST', { kind, clientId, series, number, issueDate, baseCents });
      setNumber('');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500';

  return (
    <Card title="Nuevo comprobante">
      <div className="grid grid-cols-2 gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as 'FACTURA' | 'RXH')} className={inputCls}>
          <option value="FACTURA">Factura</option>
          <option value="RXH">Recibo por honorarios</option>
        </select>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
          <option value="">— Cliente —</option>
          {props.clients.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <input value={series} onChange={(e) => setSeries(e.target.value)} placeholder="Serie" className={inputCls} />
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número" className={inputCls} />
        <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
        <input
          type="number"
          value={baseSoles}
          onChange={(e) => setBaseSoles(e.target.value)}
          placeholder="Base (S/)"
          className={inputCls}
        />
      </div>

      <div className="mt-3 rounded-lg bg-neutral-950 p-3">
        {calc.kind === 'FACTURA' ? (
          <>
            <Row label="Base" value={formatPen(baseCents)} />
            <Row label="IGV (18%)" value={formatPen(calc.factura.igvCents)} />
            <Row label="Total" value={formatPen(calc.factura.totalCents)} strong />
            {calc.factura.detraccion && (
              <Row label="Detracción (12%)" value={formatPen(calc.factura.detraccion.amountCents)} />
            )}
            <Row label="Neto a cobrar" value={formatPen(calc.factura.netCents)} strong />
          </>
        ) : (
          <>
            <Row label="Bruto" value={formatPen(baseCents)} />
            <Row
              label={pagadorRetiene ? 'Retención (8%)' : 'Retención (no domiciliado)'}
              value={formatPen(calc.rxh.retencionCents)}
            />
            <Row label="Neto a cobrar" value={formatPen(calc.rxh.netCents)} strong />
            {!pagadorRetiene && (
              <p className="mt-2 rounded bg-sky-500/10 p-2 text-xs text-sky-300">
                Cliente no domiciliado: no te retiene. El 8% (
                {formatPen(Math.round(baseCents * props.retencion4taRate))}) lo declaras tú en el
                F.616 del mes — el recordatorio lo incluirá.
              </p>
            )}
          </>
        )}
      </div>

      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      <button
        onClick={submit}
        disabled={busy || !clientId || !number}
        className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Registrar comprobante'}
      </button>
    </Card>
  );
}
