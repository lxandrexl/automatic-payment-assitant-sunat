import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { dateToLimaIso } from '@tributo/core';
import { Invoice, type InvoiceDocument, InvoiceSchema } from '../schemas/invoice.schema';

// Módulo de ingresos: cuánto percibes REALMENTE por mes.
// El titular es el LÍQUIDO EN BANCO (lo que entra a tu cuenta); el detalle interno
// muestra el total, IGV, detracción (a tu BN) y retención (adelanto de IR).

interface IncomeLine {
  id: string;
  kind: 'FACTURA' | 'RXH';
  ref: string; // "E001-1"
  issueDate: string;
  baseCents: number;
  igvCents: number;
  totalCents: number;
  detraccionDepositoCents: number; // a tu cuenta del Banco de la Nación
  retencionCents: number; // a SUNAT (adelanto de IR 4ta)
  netoBancoCents: number; // lo que te transfieren
}

interface MonthIncome {
  period: string;
  emitidoCents: number; // total facturas + bruto RxH
  igvCents: number;
  detraccionDepositoCents: number;
  retencionCents: number;
  netoBancoCents: number; // TITULAR: líquido recibido en banco
  lines: IncomeLine[];
}

function emptyTotals(): Omit<MonthIncome, 'period' | 'lines'> {
  return {
    emitidoCents: 0,
    igvCents: 0,
    detraccionDepositoCents: 0,
    retencionCents: 0,
    netoBancoCents: 0,
  };
}

@Injectable()
class IncomeService {
  constructor(@InjectModel(Invoice.name) private readonly invoices: Model<InvoiceDocument>) {}

  async byYear(year: number) {
    const from = new Date(Date.UTC(year, 0, 1, 5));
    const to = new Date(Date.UTC(year + 1, 0, 1, 5));
    const docs = await this.invoices
      .find({ issueDate: { $gte: from, $lt: to }, status: { $ne: 'VOIDED' } })
      .sort({ issueDate: 1 })
      .lean();

    const months = new Map<string, MonthIncome>();
    const totals = emptyTotals();

    for (const i of docs) {
      const line = toLine(i as unknown as LeanInvoice);
      const period = i.period ?? dateToLimaIso(i.issueDate).slice(0, 7);
      const m =
        months.get(period) ?? { period, ...emptyTotals(), lines: [] as IncomeLine[] };

      const emitido = i.kind === 'FACTURA' ? line.totalCents : line.baseCents;
      m.emitidoCents += emitido;
      m.igvCents += line.igvCents;
      m.detraccionDepositoCents += line.detraccionDepositoCents;
      m.retencionCents += line.retencionCents;
      m.netoBancoCents += line.netoBancoCents;
      m.lines.push(line);
      months.set(period, m);

      totals.emitidoCents += emitido;
      totals.igvCents += line.igvCents;
      totals.detraccionDepositoCents += line.detraccionDepositoCents;
      totals.retencionCents += line.retencionCents;
      totals.netoBancoCents += line.netoBancoCents;
    }

    return {
      year,
      months: [...months.values()].sort((a, b) => a.period.localeCompare(b.period)),
      totals,
    };
  }
}

type LeanInvoice = {
  _id: unknown;
  kind: 'FACTURA' | 'RXH';
  series: string;
  number: string;
  issueDate: Date;
  baseCents?: number;
  igvCents?: number;
  totalCents?: number;
  detraccion?: { amountCents?: number; exactAmountCents?: number } | null;
  retencion?: { amountCents?: number } | null;
};

function toLine(i: LeanInvoice): IncomeLine {
  const base = i.baseCents ?? 0;
  const igv = i.igvCents ?? 0;
  const total = i.totalCents ?? base;
  const detrExacta = i.detraccion?.exactAmountCents ?? 0;
  const detrDeposito = i.detraccion?.amountCents ?? 0;
  const retencion = i.retencion?.amountCents ?? 0;
  const netoBanco = i.kind === 'FACTURA' ? total - detrExacta : base - retencion;
  return {
    id: String(i._id),
    kind: i.kind,
    ref: `${i.series}-${i.number}`,
    issueDate: dateToLimaIso(i.issueDate),
    baseCents: base,
    igvCents: igv,
    totalCents: total,
    detraccionDepositoCents: detrDeposito,
    retencionCents: retencion,
    netoBancoCents: netoBanco,
  };
}

@Controller('income')
class IncomeController {
  constructor(private readonly service: IncomeService) {}

  @Get()
  byYear(@Query('year') year?: string) {
    return this.service.byYear(Number(year) || new Date().getFullYear());
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }])],
  controllers: [IncomeController],
  providers: [IncomeService],
})
export class IncomeModule {}
