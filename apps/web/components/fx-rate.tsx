'use client';

import { useEffect, useState } from 'react';
import { formatFechaCorta } from '@/lib/format';
import { inputCls } from '@/components/ui';

export interface RateInfo {
  source: string;
  kind: 'venta' | 'compra';
  dates: string[];
  values: number[];
  provisional: boolean;
}

interface FxResponse {
  rate: number;
  kind: 'venta';
  source: string;
  provisional: boolean;
  days: { date: string; compra: number; venta: number }[];
}

/**
 * Tipo de cambio USD→PEN. Se propone automáticamente el promedio (venta) de los últimos
 * 3 días hábiles del mes según SUNAT y se deja registrado de dónde salió. Si SUNAT no
 * responde, o prefieres otro valor, se escribe a mano (queda marcado como manual).
 */
export function FxRate({
  period,
  onChange,
}: {
  period: string;
  onChange: (rate: number, info: RateInfo | null) => void;
}) {
  const [text, setText] = useState('');
  const [info, setInfo] = useState<FxResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [manual, setManual] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setManual(false);
    fetch(`/proxy/fx/usd?period=${period}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as FxResponse;
      })
      .then((j) => {
        if (cancelled) return;
        setInfo(j);
        setText(String(j.rate));
        setState('ok');
        onChange(j.rate, {
          source: j.source,
          kind: j.kind,
          dates: j.days.map((d) => d.date),
          values: j.days.map((d) => d.venta),
          provisional: j.provisional,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setInfo(null);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
    // onChange es estable en el uso (setState del padre); solo recargamos por mes o por reintento.
  }, [period, nonce]);

  return (
    <div>
      <input
        type="number"
        step="0.001"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setManual(true);
          onChange(Number(e.target.value) || 0, { source: 'MANUAL', kind: 'venta', dates: [], values: [], provisional: false });
        }}
        placeholder={state === 'loading' ? 'Consultando SUNAT…' : 'Ej. 3.430'}
        className={inputCls}
      />
      <div className="mt-1 text-xs leading-relaxed text-ink3">
        {state === 'loading' && 'Consultando el tipo de cambio de SUNAT (promedio de los 3 últimos días hábiles del mes)…'}
        {state === 'error' && (
          <>
            No se pudo consultar SUNAT. Escríbelo a mano.{' '}
            <button type="button" onClick={() => setNonce((n) => n + 1)} className="font-medium text-brand underline">
              Reintentar
            </button>
          </>
        )}
        {state === 'ok' && info && !manual && (
          <>
            {info.source} · promedio venta de{' '}
            {info.days.map((d) => `${formatFechaCorta(d.date).replace(/ \d{4}$/, '')}: ${d.venta.toFixed(3)}`).join(' · ')}
            {info.provisional && (
              <span className="mt-1 block font-medium text-warn">
                Mes en curso: valor provisional, hasta el cierre del mes.
              </span>
            )}
          </>
        )}
        {state === 'ok' && manual && 'Valor escrito a mano: queda registrado como manual.'}
      </div>
    </div>
  );
}
