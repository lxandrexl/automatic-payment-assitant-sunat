import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  computeFactura,
  computeRxh,
  computeRxhExterior,
  detraccionDepositDueDate,
  isDetraccionDepositMatch,
  limaIsoToDate,
  periodOfDate,
} from '@tributo/core';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { PeriodsService } from '../periods/periods.service';
import { SettingsService } from '../settings/settings.service';
import {
  CompleteForeignDto,
  CreateInvoiceDto,
  DetraccionDepositDto,
  type RateInfoDto,
  UpdateInvoiceDto,
} from './invoices.dto';

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

    // Cobro en moneda extranjera: el impuesto en Perú va sobre el BRUTO convertido;
    // lo que el cliente retiene en su país solo reduce lo que llega al banco.
    let foreign: ReturnType<typeof buildForeign>['foreign'] | null = null;
    let baseCents = dto.baseCents;
    if (dto.foreignGrossCents != null) {
      if (!dto.exchangeRate) throw new BadRequestException('Falta el tipo de cambio');
      const f = buildForeign(dto.foreignGrossCents, dto.exchangeRate, client?.retencionExteriorRate ?? 0, dto.rateInfo);
      baseCents = f.baseCents;
      foreign = f.foreign;
    }

    const r = computeRxh(baseCents, s, pagadorRetiene);
    return this.model.create({
      ...base,
      baseCents,
      igvCents: 0,
      totalCents: baseCents,
      detraccion: null,
      retencion: { amountCents: r.retencionCents },
      foreign,
    });
  }

  /**
   * Completa un RxH que quedó registrado solo en soles: agrega el bruto en dólares, el tipo de
   * cambio usado y la retención del exterior; recalcula la base en soles (lo que se declara).
   */
  async completeForeign(id: string, dto: CompleteForeignDto): Promise<InvoiceDocument> {
    const doc = await this.byId(id);
    if (doc.kind !== 'RXH') throw new BadRequestException('Solo un recibo por honorarios puede estar en dólares');
    if (doc.status !== 'ISSUED') throw new BadRequestException(`El comprobante está ${doc.status}`);
    const s = await this.settings.calcSettings();
    const settingsDoc = await this.settings.get();
    const client = settingsDoc.clients.find((c) => c._id.equals(doc.clientId));
    const f = buildForeign(dto.foreignGrossCents, dto.exchangeRate, client?.retencionExteriorRate ?? 0, dto.rateInfo);
    doc.baseCents = f.baseCents;
    doc.totalCents = f.baseCents;
    doc.retencion = { amountCents: computeRxh(f.baseCents, s, client?.domiciliado !== false).retencionCents };
    doc.foreign = f.foreign;
    return doc.save();
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
    doc.detraccion.constanciaNumber = dto.constanciaNumber?.trim() || null;
    doc.detraccion.reference = dto.reference?.trim() ?? '';
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

/** RxH en moneda extranjera: base en soles (se declara) + datos en USD con el tipo de cambio usado. */
function buildForeign(grossCents: number, exchangeRate: number, retencionExteriorRate: number, rateInfo?: RateInfoDto) {
  const x = computeRxhExterior(grossCents, exchangeRate, retencionExteriorRate);
  return {
    baseCents: x.baseCents,
    foreign: {
      currency: 'USD' as const,
      grossCents,
      exchangeRate,
      withholdingCents: x.retencionExteriorFxCents,
      rateInfo: rateInfo
        ? {
            source: rateInfo.source,
            kind: rateInfo.kind ?? 'venta',
            dates: rateInfo.dates,
            values: rateInfo.values,
            provisional: rateInfo.provisional ?? false,
          }
        : { source: 'MANUAL', kind: 'venta' as const, dates: [], values: [], provisional: false },
    },
  };
}
