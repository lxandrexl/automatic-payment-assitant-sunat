'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mutate } from '@/lib/mutate';
import type { Settings } from '@/lib/types';
import { Card } from '@/components/ui';

export function ConfigForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [uitSoles, setUitSoles] = useState(String(settings.uitCents / 100));
  const [otrosGastosSoles, setOtrosGastosSoles] = useState(String(settings.otrosGastosCents / 100));
  const [gastos3UitSoles, setGastos3UitSoles] = useState(
    String((settings.gastos3UitCents ?? 0) / 100),
  );
  const [bnAccount, setBnAccount] = useState(settings.bnDetraccionAccount ?? '');
  const [chatId, setChatId] = useState(settings.notify.telegramChatId);
  const [reminderDays, setReminderDays] = useState(settings.notify.reminderDaysBefore.join(', '));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputCls =
    'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand';

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await mutate('/settings', 'PATCH', {
        uitCents: Math.round(Number(uitSoles) * 100),
        otrosGastosCents: Math.round(Number(otrosGastosSoles) * 100),
        gastos3UitCents: Math.round(Number(gastos3UitSoles) * 100),
        bnDetraccionAccount: bnAccount || null,
        notify: {
          telegramChatId: chatId,
          reminderDaysBefore: reminderDays
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n) && n > 0),
        },
      });
      setMsg('Guardado.');
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function testNotify() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await mutate<Record<string, string>>('/notify/test', 'POST', {});
      setMsg(`Telegram: ${r.telegram} · Email: ${r.email}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
        <Card title="Tus datos tributarios">
          <div className="space-y-4">
            <Field label="RUC" hint="Lo define tu cuenta; no se edita aquí. El último dígito decide tus fechas de vencimiento.">
              <input value={`${settings.ruc} · último dígito ${settings.rucLastDigit}`} disabled className={`${inputCls} opacity-60`} />
            </Field>
            <Field label="Valor de la UIT (S/)" hint="Lo fija SUNAT cada año. Muchos límites del impuesto se miden en UIT.">
              <input type="number" value={uitSoles} onChange={(e) => setUitSoles(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Cuenta de detracciones (Banco de la Nación)" hint="Opcional. Solo para tu referencia.">
              <input value={bnAccount} onChange={(e) => setBnAccount(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card title="Gastos para el cálculo anual">
          <div className="space-y-4">
            <Field label="Otros gastos anuales del negocio (S/)" hint="Gastos deducibles que no registras en Compras. Bajan la ganancia del negocio y por tanto el impuesto.">
              <input type="number" value={otrosGastosSoles} onChange={(e) => setOtrosGastosSoles(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Gastos personales deducibles (S/)" hint="Hasta 3 UIT en total (salud, alquiler, restaurantes…) con comprobante electrónico y pago bancario. Bajan el impuesto de tus honorarios.">
              <input type="number" value={gastos3UitSoles} onChange={(e) => setGastos3UitSoles(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card title="Avisos">
          <div className="space-y-4">
            <Field label="Chat ID de Telegram" hint="Dónde te llegan los recordatorios. Lo obtienes con tu bot de Telegram.">
              <input value={chatId} onChange={(e) => setChatId(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Días de aviso antes del vencimiento" hint="Separados por coma. Ejemplo: 7, 3, 1 = te avisa a 7, 3 y 1 día antes.">
              <input value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            onClick={testNotify}
            disabled={busy}
            className="rounded-lg bg-sunken px-4 py-2.5 text-sm font-medium text-ink hover:bg-line disabled:opacity-50"
          >
            Enviar aviso de prueba
          </button>
          {msg && <span className="text-sm text-ok">{msg}</span>}
        </div>
      </div>

      <ClientsEditor clients={settings.clients} />
    </div>
  );
}

function ClientsEditor({ clients }: { clients: Settings['clients'] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    ruc: '',
    kind: 'FACTURA' as 'FACTURA' | 'RXH',
    baseSoles: '9000',
    domiciliado: true,
    currency: 'PEN' as 'PEN' | 'USD',
    retExtPct: '0',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputCls =
    'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand';

  // El PATCH reemplaza el array completo: mandamos los existentes + el nuevo (o menos el borrado).
  async function saveClients(next: object[]) {
    setBusy(true);
    setErr(null);
    try {
      await mutate('/settings', 'PATCH', { clients: next });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  // _id se preserva para no romper la referencia clientId de comprobantes ya emitidos.
  const existing = clients.map((c) => ({
    _id: c._id,
    name: c.name,
    ruc: c.ruc,
    kind: c.kind,
    defaultBaseCents: c.defaultBaseCents,
    domiciliado: c.domiciliado !== false,
    currency: c.currency ?? 'PEN',
    retencionExteriorRate: c.retencionExteriorRate ?? 0,
  }));

  return (
    <Card title="Tus clientes">
      {clients.length === 0 ? (
        <p className="mb-3 text-sm text-ink2">Todavía no agregaste clientes. Agrega uno abajo para poder emitir comprobantes.</p>
      ) : (
        <ul className="mb-4 text-sm">
          {clients.map((c, idx) => (
            <li key={c._id} className="flex items-center justify-between gap-3 border-t border-line py-2.5">
              <span>
                {c.name} <span className="text-ink3">· {c.kind === 'FACTURA' ? 'Factura' : 'Recibo por honorarios'}</span>
                {c.currency === 'USD' && (
                  <span className="ml-2 rounded bg-hono-soft px-1.5 text-xs text-hono">
                    en dólares
                    {c.retencionExteriorRate ? ` · retiene ${Math.round(c.retencionExteriorRate * 100)}%` : ''}
                  </span>
                )}
                {c.domiciliado === false && (
                  <span className="ml-2 rounded bg-info-soft px-1.5 text-xs text-info">
                    no domiciliado
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-ink3">{c.ruc}</span>
                <button
                  onClick={() => saveClients(existing.filter((_, i) => i !== idx))}
                  disabled={busy}
                  className="rounded px-1.5 text-ink3 hover:bg-bad-soft hover:text-bad"
                  title="Eliminar cliente"
                  aria-label="Eliminar cliente"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-line pt-4">
        <p className="col-span-2 text-sm font-medium text-ink">Agregar un cliente</p>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Nombre"
          className={inputCls}
        />
        <input
          value={form.ruc}
          onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
          placeholder="RUC / ID fiscal extranjero"
          className={inputCls}
        />
        <select
          value={form.kind}
          onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as 'FACTURA' | 'RXH' }))}
          className={inputCls}
        >
          <option value="FACTURA">Factura</option>
          <option value="RXH">Recibo por honorarios</option>
        </select>
        <input
          type="number"
          value={form.baseSoles}
          onChange={(e) => setForm((f) => ({ ...f, baseSoles: e.target.value }))}
          placeholder="Base típica (S/)"
          className={inputCls}
        />
        <label className="col-span-2 flex items-center gap-2 px-1 text-sm text-ink2">
          <input
            type="checkbox"
            checked={form.domiciliado}
            onChange={(e) => setForm((f) => ({ ...f, domiciliado: e.target.checked }))}
          />
          Domiciliado en Perú (desmarca para clientes del exterior — RxH sin retención)
        </label>
        <select
          value={form.currency}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as 'PEN' | 'USD' }))}
          className={inputCls}
          aria-label="Moneda en que le cobras"
        >
          <option value="PEN">Le cobro en soles</option>
          <option value="USD">Le cobro en dólares</option>
        </select>
        <input
          type="number"
          min="0"
          max="100"
          value={form.retExtPct}
          onChange={(e) => setForm((f) => ({ ...f, retExtPct: e.target.value }))}
          placeholder="Retención en su país (%)"
          className={inputCls}
          aria-label="Retención que el cliente hace en su país (%)"
        />
        <p className="col-span-2 -mt-1 text-xs text-ink3">
          “Retención en su país”: el % que tu cliente descuenta allá antes de pagarte (por ejemplo
          10%). Reduce lo que llega a tu banco, pero en Perú sigues declarando el monto completo.
        </p>
      </div>
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      <button
        onClick={() =>
          saveClients([
            ...existing,
            {
              name: form.name,
              ruc: form.ruc,
              kind: form.kind,
              defaultBaseCents: Math.round(Number(form.baseSoles) * 100),
              domiciliado: form.domiciliado,
              currency: form.currency,
              retencionExteriorRate: Math.min(100, Math.max(0, Number(form.retExtPct) || 0)) / 100,
            },
          ]).then(() => setForm((f) => ({ ...f, name: '', ruc: '' })))
        }
        disabled={busy || !form.name || !form.ruc}
        className="mt-3 w-full rounded-lg bg-sunken px-3 py-2 text-sm font-medium text-ink hover:bg-line disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Agregar cliente'}
      </button>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs leading-relaxed text-ink3">{hint}</span>}
    </label>
  );
}
