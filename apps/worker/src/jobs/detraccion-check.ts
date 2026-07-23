import { dateToLimaIso, detraccionState, todayLimaIso } from '@tributo/core';
import { detraccionOverdueMsg, detraccionSoonMsg } from '@tributo/notify';
import { InvoiceModel } from '../db';
import { sendOnce } from '../notify';
import { logger } from '../logger';

// SPEC §6 detraccion-check — 09:00. PENDING vencidas → OVERDUE + alerta; por vencer → aviso suave.
export async function detraccionCheck(): Promise<void> {
  const today = todayLimaIso();
  const pending = await InvoiceModel.find({ 'detraccion.status': 'PENDING' });

  for (const inv of pending) {
    const det = inv.detraccion;
    if (!det?.depositDueDate) continue;
    const dueIso = dateToLimaIso(det.depositDueDate);
    const state = detraccionState(today, dueIso);
    const data = { period: inv.period!, amountCents: det.amountCents ?? 0, depositDueDateIso: dueIso };

    if (state === 'OVERDUE') {
      det.status = 'OVERDUE';
      await inv.save();
      const sent = await sendOnce(`detr:${inv._id}:overdue`, 'DETRACCION_OVERDUE', detraccionOverdueMsg(data));
      if (sent) logger.info({ invoice: String(inv._id) }, 'detracción marcada OVERDUE');
    } else if (state === 'SOON') {
      const sent = await sendOnce(`detr:${inv._id}:soon`, 'DETRACCION_PENDING', detraccionSoonMsg(data));
      if (sent) logger.info({ invoice: String(inv._id) }, 'aviso de detracción por vencer');
    }
  }
}
