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
          <Field label="Otros gastos anuales (S/)">
            <input type="number" value={otrosGastosSoles} onChange={(e) => setOtrosGastosSoles(e.target.value)} className={inputCls} />
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

      <Card title="Clientes">
        {settings.clients.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin clientes configurados.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {settings.clients.map((c) => (
              <li key={c._id} className="flex justify-between border-t border-neutral-800 py-1">
                <span>
                  {c.name} <span className="text-neutral-500">· {c.kind}</span>
                </span>
                <span className="text-neutral-500">{c.ruc}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
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
