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
    'w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500';

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
    <div className="space-y-4">
      <Card title="Configuración">
        <div className="space-y-3">
          <Field label="RUC (solo lectura)">
            <input value={`${settings.ruc} · dígito ${settings.rucLastDigit}`} disabled className={`${inputCls} opacity-60`} />
          </Field>
          <Field label="UIT (S/)">
            <input type="number" value={uitSoles} onChange={(e) => setUitSoles(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Otros gastos anuales del negocio (S/)">
            <input type="number" value={otrosGastosSoles} onChange={(e) => setOtrosGastosSoles(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Gastos deducibles 3 UIT acreditados (S/, persona natural)">
            <input type="number" value={gastos3UitSoles} onChange={(e) => setGastos3UitSoles(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Cuenta detracciones (Banco de la Nación)">
            <input value={bnAccount} onChange={(e) => setBnAccount(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Chat ID de Telegram">
            <input value={chatId} onChange={(e) => setChatId(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Días de recordatorio (coma-separados)">
            <input value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            onClick={testNotify}
            disabled={busy}
            className="rounded-lg bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Enviar notificación de prueba
          </button>
        </div>
      </Card>

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
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputCls =
    'w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500';

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
  }));

  return (
    <Card title="Clientes">
      {clients.length === 0 ? (
        <p className="text-sm text-neutral-400">Sin clientes configurados.</p>
      ) : (
        <ul className="mb-3 space-y-1 text-sm">
          {clients.map((c, idx) => (
            <li key={c._id} className="flex items-center justify-between border-t border-neutral-800 py-1">
              <span>
                {c.name} <span className="text-neutral-500">· {c.kind}</span>
                {c.domiciliado === false && (
                  <span className="ml-2 rounded bg-sky-500/15 px-1.5 text-xs text-sky-400">
                    no domiciliado
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-neutral-500">{c.ruc}</span>
                <button
                  onClick={() => saveClients(existing.filter((_, i) => i !== idx))}
                  disabled={busy}
                  className="text-red-400 hover:text-red-300"
                  title="Eliminar cliente"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-neutral-800 pt-3">
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
          <option value="RXH">RxH</option>
        </select>
        <input
          type="number"
          value={form.baseSoles}
          onChange={(e) => setForm((f) => ({ ...f, baseSoles: e.target.value }))}
          placeholder="Base típica (S/)"
          className={inputCls}
        />
        <label className="col-span-2 flex items-center gap-2 px-1 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={form.domiciliado}
            onChange={(e) => setForm((f) => ({ ...f, domiciliado: e.target.checked }))}
          />
          Domiciliado en Perú (desmarca para clientes del exterior — RxH sin retención)
        </label>
      </div>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
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
            },
          ]).then(() => setForm((f) => ({ ...f, name: '', ruc: '' })))
        }
        disabled={busy || !form.name || !form.ruc}
        className="mt-3 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Agregar cliente'}
      </button>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-400">{label}</span>
      {children}
    </label>
  );
}
