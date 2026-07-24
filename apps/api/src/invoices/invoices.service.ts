import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  computeFactura,
  computeRxh,
  detraccionDepositDueDate,
  isDetraccionDepositMatch,
  limaIsoToDate,
  periodOfDate,
} from '@tributo/core';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { PeriodsService } from '../periods/periods.service';
import { SettingsService } from '../settings/settings.service';
import { CreateInvoiceDto, DetraccionDepositDto, UpdateInvoiceDto } from './invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private readonly model: Model<InvoiceDocument>,
    private readonly periods: PeriodsService,
    private readonly settings: SettingsService,
  ) {}

  list(period?: string) {
    return this.model.find(period ? { period } : {}).sort({ issueDate: 1 });
  }

  async create(dto: CreateInvoiceDto): Promise<InvoiceDocument> {
    const s = await this.settings.calcSettings();
    const period = periodOfDate(dto.issueDate);
    await this.periods.ensure(period);
    const issueDate = limaIsoToDate(dto.issueDate);
    const base = {
      period,
      kind: dto.kind,
      series: dto.series,
      number: dto.number,
      clientId: new Types.ObjectId(dto.clientId),
      issueDate,
      baseCents: dto.baseCents,
    };

    if (dto.kind === 'FACTURA') {
      const f = computeFactura(dto.baseCents, s);
      return this.model.create({
        ...base,
        igvCents: f.igvCents,
        totalCents: f.totalCents,
        detraccion: f.detraccion
          ? {
              applies: true,
              amountCents: f.detraccion.amountCents,
              exactAmountCents: f.detraccion.exactAmountCents,
              depositDueDate: limaIsoToDate(detraccionDepositDueDate(dto.issueDate)),
              status: 'PENDING',
            }
          : null,
        retencion: null,
      });
    }

    // Cliente no domiciliado (ej. Chile) → sin retención; el 8% se paga vía F.616.
    const settingsDoc = await this.settings.get();
    const client = settingsDoc.clients.find((c) => c._id.equals(dto.clientId));
    const pagadorRetiene = client?.domiciliado !== false;
    const r = computeRxh(dto.baseCents, s, pagadorRetiene);
    return this.model.create({
      ...base,
      igvCents: 0,
      totalCents: dto.baseCents,
      detraccion: null,
      retencion: { amountCents: r.retencionCents },
    });
  }

  async update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceDocument> {
    const doc = await this.byId(id);
    if (dto.paidAt !== undefined) {
      doc.paidAt = new Date(dto.paidAt);
      // SPEC §4.3: el depósito vence en el pago o el 5.º hábil del mes siguiente,
      // lo que ocurra primero → si el pago llegó antes, la fecha límite se ajusta.
      if (
        doc.detraccion &&
        doc.detraccion.status === 'PENDING' &&
        doc.paidAt < doc.detraccion.depositDueDate
      ) {
        doc.detraccion.depositDueDate = doc.paidAt;
      }
    }
    if (dto.status !== undefined) doc.status = dto.status;
    return doc.save();
  }

  async registerDetraccionDeposit(id: string, dto: DetraccionDepositDto): Promise<InvoiceDocument> {
    const doc = await this.byId(id);
    if (!doc.detraccion) throw new BadRequestException('La factura no tiene detracción');
    const matches = isDetraccionDepositMatch(dto.amountCents, {
      amountCents: doc.detraccion.amountCents,
      exactAmountCents: doc.detraccion.exactAmountCents,
    });
    if (!matches) {
      throw new BadRequestException(
        `Monto depositado no coincide con la detracción esperada (${doc.detraccion.amountCents} céntimos ±1 sol)`,
      );
    }
    doc.detraccion.depositedAt = new Date(dto.depositedAt);
    doc.detraccion.constanciaNumber = dto.constanciaNumber;
    doc.detraccion.status = 'DEPOSITED';
    return doc.save();
  }

  /** DELETE = soft VOID, solo si sigue ISSUED (SPEC §5). */
  async void(id: string): Promise<InvoiceDocument> {
    const doc = await this.byId(id);
    if (doc.status !== 'ISSUED') {
      throw new BadRequestException(`Solo se puede anular una factura ISSUED (está ${doc.status})`);
    }
    doc.status = 'VOIDED';
    return doc.save();
  }

  private async byId(id: string): Promise<InvoiceDocument> {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException(`Comprobante ${id} no existe`);
    return doc;
  }
}
