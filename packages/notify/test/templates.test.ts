import { describe, expect, it } from 'vitest';
import { dueReminderMsg, detraccionOverdueMsg } from '../src/templates';

describe('plantillas', () => {
  it('recordatorio con fecha estimada añade el sufijo de advertencia', () => {
    const msg = dueReminderMsg({
      period: '2027-01',
      dueDateIso: '2027-02-16',
      daysBefore: 3,
      estimated: true,
      igvPagarCents: 135000,
      pagoCuentaCents: 9000,
      npsEstimadoCents: 16600,
    });
    expect(msg).toContain('mar 16/02/2027');
    expect(msg).toContain('S/ 1,350.00');
    expect(msg).toContain('⚠️ fecha estimada');
  });

  it('recordatorio oficial no lleva el sufijo; "VENCE HOY" con daysBefore 0', () => {
    const msg = dueReminderMsg({
      period: '2026-07',
      dueDateIso: '2026-08-18',
      daysBefore: 0,
      estimated: false,
      igvPagarCents: 0,
      pagoCuentaCents: 9000,
      npsEstimadoCents: 9000,
    });
    expect(msg).toContain('VENCE HOY');
    expect(msg).not.toContain('fecha estimada');
  });

  it('con pago616 anuncia F.621 + F.616 y muestra el monto', () => {
    const msg = dueReminderMsg({
      period: '2026-08',
      dueDateIso: '2026-09-15',
      daysBefore: 1,
      estimated: false,
      igvPagarCents: 135000,
      pagoCuentaCents: 9000,
      npsEstimadoCents: 16600,
      pago616Cents: 72000,
    });
    expect(msg).toContain('F.621 + F.616');
    expect(msg).toContain('F.616 (4ta, RxH sin retención): S/ 720.00');
  });

  it('detracción vencida formatea monto y fecha', () => {
    const msg = detraccionOverdueMsg({
      period: '2026-07',
      amountCents: 127400,
      depositDueDateIso: '2026-08-10',
    });
    expect(msg).toContain('S/ 1,274.00');
    expect(msg).toContain('lun 10/08/2026');
    expect(msg).toContain('constancia');
  });

  it('con F.621 ya pagado, el recordatorio habla solo del F.616 pendiente', () => {
    const msg = dueReminderMsg({
      period: '2026-09',
      dueDateIso: '2026-10-15',
      daysBefore: 1,
      estimated: false,
      igvPagarCents: 126000,
      pagoCuentaCents: 8000,
      npsEstimadoCents: 94000,
      pago616Cents: 76900,
      f621Pagado: true,
    });
    expect(msg).toContain('F.616');
    expect(msg).toContain('S/ 769.00');
    expect(msg).not.toContain('F.621');
    expect(msg).not.toContain('IGV a pagar');
  });
});
