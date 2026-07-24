import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  computePeriodSummary,
  dateToLimaIso,
  getDueDate,
  limaIsoToDate,
  parsePeriod,
  type InvoiceForSummary,
  type PeriodSummary,
  type PurchaseForSummary,
} from '@tributo/core';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Period, PeriodDocument } from '../schemas/period.schema';
import { Purchase, PurchaseDocument } from '../schemas/purchase.schema';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class PeriodsService {
  constructor(
    @InjectModel(Period.name) private readonly periods: Model<PeriodDocument>,
    @InjectModel(Invoice.name) private readonly invoices: Model<InvoiceDocument>,
    @InjectModel(Purchase.name) private readonly purchases: Model<PurchaseDocument>,
    private readonly settings: SettingsService,
  ) {}

  /** Crea el periodo con su dueDate si no existe (SPEC §5: on-the-fly). */
  async ensure(period: string): Promise<PeriodDocument> {
    const existing = await this.periods.findById(period);
    if (existing) return existing;
    const { year, month } = parsePeriod(period);
    const { rucLastDigit } = await this.settings.calcSettings();
    const { date, source } = getDueDate(period, rucLastDigit);
    return this.periods.create({
      _id: period,
      year,
      month,
      dueDate: limaIsoToDate(date),
      dueDateSource: source,
    });
  }

  async findById(period: string): Promise<PeriodDocument> {
    const doc = await this.periods.findById(period);
    if (!doc) throw new NotFoundException(`Periodo ${period} no existe`);
    return doc;
  }

  /** Summary de un periodo con arrastre de saldo a favor desde el primer periodo (SPEC §4.4). */
  async summaryOf(period: string): Promise<PeriodSummary> {
    const s = await this.settings.calcSettings();
    const priorPeriods = await this.periods.find({ _id: { $lte: period } }).sort({ _id: 1 });
    let saldo = 0;
    let result: PeriodSummary | null = null;
    for (const p of priorPeriods) {
      const [inv, pur] = await Promise.all([
        this.invoices.find({ period: p._id }),
        this.purchases.find({ period: p._id }),
      ]);
      const summary = computePeriodSummary(
        inv.map(toInvoiceForSummary),
        pur.map(toPurchaseForSummary),
        s,
        saldo,
      );
      saldo = summary.saldoFavorCents;
      if (p._id === period) result = summary;
    }
    return result ?? computePeriodSummary([], [], s, saldo);
  }

  async listByYear(year: number) {
    const docs = await this.periods.find({ year }).sort({ _id: 1 });
    return Promise.all(
      docs.map(async (p) => ({ ...p.toObject(), summary: await this.summaryOf(p._id) })),
    );
  }

  async detail(period: string) {
    const doc = await this.findById(period);
    const [summary, inv, pur] = await Promise.all([
      this.summaryOf(period),
      this.invoices.find({ period }),
      this.purchases.find({ period }),
    ]);
    return { ...doc.toObject(), summary, invoices: inv, purchases: pur };
  }

  async declare(period: string, declaredAt?: string, paymentRef?: string) {
    const doc = await this.findById(period);
    doc.status = paymentRef ? 'PAID' : 'DECLARED';
    doc.declaredAt = declaredAt ? new Date(declaredAt) : new Date();
    if (paymentRef) doc.paymentRef = paymentRef;
    return doc.save();
  }

  /** Recalcula dueDate de periodos OPEN con source ESTIMATED (SPEC §4.1). */
  async recomputeDueDates(): Promise<{ updated: string[] }> {
    const { rucLastDigit } = await this.settings.calcSettings();
    const candidates = await this.periods.find({ status: 'OPEN', dueDateSource: 'ESTIMATED' });
    const updated: string[] = [];
    for (const p of candidates) {
      const { date, source } = getDueDate(p._id, rucLastDigit);
      const newDue = limaIsoToDate(date);
      if (source === 'OFFICIAL' || dateToLimaIso(p.dueDate) !== date) {
        p.dueDate = newDue;
        p.dueDateSource = source;
        await p.save();
        updated.push(p._id);
      }
    }
    return { updated };
  }
}

function toInvoiceForSummary(i: InvoiceDocument): InvoiceForSummary {
  return {
    kind: i.kind,
    status: i.status,
    baseCents: i.baseCents,
    igvCents: i.igvCents,
    detraccion: i.detraccion
      ? { status: i.detraccion.status, amountCents: i.detraccion.amountCents }
      : null,
    retencionCents: i.retencion?.amountCents ?? 0,
  };
}

function toPurchaseForSummary(p: PurchaseDocument): PurchaseForSummary {
  return { baseCents: p.baseCents, igvCents: p.igvCents, creditFiscal: p.creditFiscal };
}
