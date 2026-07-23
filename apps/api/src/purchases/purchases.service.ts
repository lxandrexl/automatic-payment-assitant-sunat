import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { limaIsoToDate, periodOfDate } from '@tributo/core';
import { Purchase, PurchaseDocument } from '../schemas/purchase.schema';
import { PeriodsService } from '../periods/periods.service';
import { CreatePurchaseDto, UpdatePurchaseDto } from './purchases.dto';

// Sobre este monto, sin bancarización se pierde crédito fiscal y gasto (SPEC §3.4).
const BANCARIZACION_THRESHOLD_CENTS = 200000; // S/ 2,000

export interface PurchaseView {
  bancarizacionWarning: string | null;
}

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Purchase.name) private readonly model: Model<PurchaseDocument>,
    private readonly periods: PeriodsService,
  ) {}

  async list(period?: string) {
    const docs = await this.model.find(period ? { period } : {}).sort({ issueDate: 1 });
    return docs.map((d) => withWarning(d));
  }

  async create(dto: CreatePurchaseDto) {
    const period = periodOfDate(dto.issueDate);
    await this.periods.ensure(period);
    const igvCents = dto.igvCents ?? Math.round(dto.baseCents * 0.18);
    const doc = await this.model.create({
      period,
      issueDate: limaIsoToDate(dto.issueDate),
      supplierName: dto.supplierName,
      supplierRuc: dto.supplierRuc,
      series: dto.series,
      number: dto.number,
      concept: dto.concept ?? '',
      category: dto.category,
      baseCents: dto.baseCents,
      igvCents,
      totalCents: dto.baseCents + igvCents,
      creditFiscal: dto.creditFiscal ?? true,
      deductibleIR: dto.deductibleIR ?? true,
      bancarizado: dto.bancarizado ?? false,
      notes: dto.notes ?? '',
    });
    return withWarning(doc);
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    const doc = await this.byId(id);
    Object.assign(doc, dto);
    if (dto.baseCents !== undefined || dto.igvCents !== undefined) {
      doc.totalCents = doc.baseCents + doc.igvCents;
    }
    await doc.save();
    return withWarning(doc);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const res = await this.model.findByIdAndDelete(id);
    if (!res) throw new NotFoundException(`Compra ${id} no existe`);
    return { deleted: true };
  }

  private async byId(id: string): Promise<PurchaseDocument> {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException(`Compra ${id} no existe`);
    return doc;
  }
}

// Campo derivado (no en DB, SPEC §3.4).
function withWarning(d: PurchaseDocument): Record<string, unknown> & PurchaseView {
  const warning =
    d.totalCents > BANCARIZACION_THRESHOLD_CENTS && !d.bancarizado
      ? 'Sin bancarización pierde crédito fiscal y gasto'
      : null;
  return { ...d.toObject(), bancarizacionWarning: warning };
}
