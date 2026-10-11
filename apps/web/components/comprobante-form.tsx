'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { computeFactura, computeRxh, computeRxhExterior, toCents } from '@tributo/core';
import { formatPen, formatUsd } from '@/lib/format';
import { mutate } from '@/lib/mutate';
import { useDrawerClose } from '@/components/drawer';
import type { Client } from '@/lib/types';
import { FxRate, type RateInfo } from '@/components/fx-rate';
import { Field, inputCls, Row } from '@/components/ui';

interface Props {
  clients: Client[];
  igvRate: number;
  detraccionRate: number;
  detraccionThresholdCents: number;
  retencion4taRate: number;
}

export function ComprobanteForm(props: Props) {
  const router = useRouter();
  const closeDrawer = useDrawerClose();
  const [kind, setKind] = useState<'FACTURA' | 'RXH'>('FACTURA');
  const [clientId, setClientId] = useState('');
  const [series, setSeries] = useState('E001');
  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [baseSoles, setBaseSoles] = useState('9000');
  const [tcNum, setTcNum] = useState(0);
  const [rateInfo, setRateInfo] = useState<RateInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedClient = props.clients.find((c) => c._id === clientId);
  // RxH a un cliente que paga en dólares: se ingresa en US$ + tipo de cambio.
  const enDolares = kind === 'RXH' && selectedClient?.currency === 'USD';
  const montoCents = toCents(Number(baseSoles) || 0); // en la moneda ingresada (S/ o US$)
  const ext = enDolares
    ? computeRxhExterior(montoCents, tcNum, selectedClient?.retencionExteriorRate ?? 0)
    : null;
  const baseCents = ext ? ext.baseCents : montoCents;
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
      await mutate('/invoices', 'POST', {
        kind,
        clientId,
        series,
        number,
        issueDate,
        baseCents,
        ...(enDolares ? { foreignGrossCents: montoCents, exchangeRate: tcNum, rateInfo } : {}),
      });
      setNumber('');
      router.refresh();
      closeDrawer();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select value={kind} onChange={(e) => setKind(e.target.value as 'FACTURA' | 'RXH')} className={inputCls}>
            <option value="FACTURA">Factura</option>
            <option value="RXH">Recibo por honorarios</option>
          </select>
        </Field>
        <Field label="Cliente">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
            <option value="">— Elige —</option>
            {props.clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Serie">
          <input value={series} onChange={(e) => setSeries(e.target.value)} placeholder="E001" className={inputCls} />
        </Field>
        <Field label="Número">
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="123" className={inputCls} />
        </Field>
        <Field label="Fecha de emisión">
          <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label={kind === 'FACTURA' ? 'Base imponible (S/)' : enDolares ? 'Monto bruto (US$)' : 'Monto bruto (S/)'}>
          <input type="number" value={baseSoles} onChange={(e) => setBaseSoles(e.target.value)} placeholder="9000" className={inputCls} />
        </Field>
        {enDolares && (
          <Field label="Tipo de cambio (S/ por US$)" full>
            <FxRate
              period={issueDate.slice(0, 7)}
              onChange={(rate, info) => {
                setTcNum(rate);
                setRateInfo(info);
              }}
            />
          </Field>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface p-3">
        {calc.kind === 'FACTURA' ? (
          <>
            <Row label="Base" value={formatPen(baseCents)} />
            <Row label="IGV (18%)" value={formatPen(calc.factura.igvCents)} />
            <Row label="Importe total" value={formatPen(calc.factura.totalCents)} strong />
            {calc.factura.detraccion && (
              <Row
                label="Detracción (depósito BN)"
                value={formatPen(calc.factura.detraccion.amountCents)}
              />
            )}
            <Row
              label="Neto a cobrar (transferencia)"
              value={formatPen(calc.factura.netCents)}
              strong
            />
          </>
        ) : (
          ext ? (
            <>
              <Row label="Bruto (lo que declaras en Perú)" value={`${formatUsd(montoCents)} = ${formatPen(ext.baseCents)}`} />
              <Row label={`Retención en su país (${Math.round((selectedClient?.retencionExteriorRate ?? 0) * 100)}%)`} value={`− ${formatUsd(ext.retencionExteriorFxCents)}`} />
              <Row label="Te llega a tu banco" value={`${formatUsd(ext.netFxCents)} ≈ ${formatPen(ext.netCents)}`} strong />
              <p className="mt-2 rounded bg-info-soft p-2 text-xs text-info">
                En SUNAT declaras los {formatUsd(montoCents)} completos. El adelanto de renta del 8% (
                {formatPen(Math.round(baseCents * props.retencion4taRate))}) lo pagas en el F.616 del
                mes{pagadorRetiene ? '' : ', porque tu cliente no te retiene en Perú'}.
              </p>
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
              <p className="mt-2 rounded bg-info-soft p-2 text-xs text-info">
                Cliente no domiciliado: no te retiene. El 8% (
                {formatPen(Math.round(baseCents * props.retencion4taRate))}) lo declaras tú en el
                F.616 del mes — el recordatorio lo incluirá.
              </p>
            )}
          </>
          )
        )}
      </div>

      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      <button
        onClick={submit}
        disabled={busy || !clientId || !number || (enDolares && !tcNum)}
        className="mt-3 w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Registrar comprobante'}
      </button>
    </div>
  );
}
