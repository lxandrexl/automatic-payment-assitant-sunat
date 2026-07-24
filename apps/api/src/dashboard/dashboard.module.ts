import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  computeAnnualProjection,
  computeAnnualRenta4ta,
  computePago616,
  dateToLimaIso,
  todayLimaIso,
  upcomingRentaAnual,
} from '@tributo/core';
import { Alert, AlertDocument, AlertSchema } from '../schemas/alert.schema';
import { Invoice, InvoiceDocument, InvoiceSchema } from '../schemas/invoice.schema';
import { Period, PeriodDocument, PeriodSchema } from '../schemas/period.schema';
import { Purchase, PurchaseDocument, PurchaseSchema } from '../schemas/purchase.schema';
import { PeriodsModule } from '../periods/periods.module';
import { PeriodsService } from '../periods/periods.service';
import { SettingsModule } from '../settings/settings.module';
import { SettingsService } from '../settings/settings.service';

@Injectable()
class DashboardService {
  constructor(
    @InjectModel(Period.name) private readonly periods: Model<PeriodDocument>,
    @InjectModel(Invoice.name) private readonly invoices: Model<InvoiceDocument>,
    @InjectModel(Purchase.name) private readonly purchases: Model<PurchaseDocument>,
    @InjectModel(Alert.name) private readonly alerts: Model<AlertDocument>,
    private readonly periodsService: PeriodsService,
    private readonly settings: SettingsService,
  ) {}

  async build() {
    const today = todayLimaIso();
    const year = Number(today.slice(0, 4));

    const nextDue = await this.periods
      .findOne({ status: 'OPEN', dueDate: { $gte: new Date() } })
      .sort({ dueDate: 1 });
    const nextDueSummary = nextDue ? await this.periodsService.summaryOf(nextDue._id) : null;

    const currentPeriodId = today.slice(0, 7);
    const currentSummary = (await this.periods.findById(currentPeriodId))
      ? await this.periodsService.summaryOf(currentPeriodId)
      : null;

    const pendingDetracciones = await this.invoices.find({
      'detraccion.status': { $in: ['PENDING', 'OVERDUE'] },
    });

    const projection = await this.annualProjection(year);
    const projection4ta = await this.annualProjection4ta(year);
    const settings = await this.settings.get();
    const ra = upcomingRentaAnual(today, settings.rucLastDigit);
    const recentAlerts = await this.alerts.find().sort({ sentAt: -1 }).limit(10);

    return {
      today,
      nextDue: nextDue
        ? {
            period: nextDue._id,
            dueDate: dateToLimaIso(nextDue.dueDate),
            source: nextDue.dueDateSource,
            status: nextDue.status,
            summary: nextDueSummary,
          }
        : null,
      currentPeriod: currentSummary ? { period: currentPeriodId, summary: currentSummary } : null,
      detracciones: pendingDetracciones.map((i) => ({
        id: i._id,
        period: i.period,
        amountCents: i.detraccion?.amountCents ?? 0,
        depositDueDate: i.detraccion ? dateToLimaIso(i.detraccion.depositDueDate) : null,
        status: i.detraccion?.status,
      })),
      projection,
      projection4ta,
      rentaAnual: { ejercicio: ra.ejercicio, dueDate: ra.date, source: ra.source },
      recentAlerts,
    };
  }

  /** Liquidación anual estimada de 4ta (RxH): modelo del plan financiero del dueño. */
  private async annualProjection4ta(year: number) {
    const s = await this.settings.get();
    const from = new Date(Date.UTC(year, 0, 1, 5));
    const to = new Date(Date.UTC(year + 1, 0, 1, 5));
    const rxhs = await this.invoices.find({
      issueDate: { $gte: from, $lt: to },
      kind: 'RXH',
      status: { $ne: 'VOIDED' },
    });
    const brutoAnualCents = rxhs.reduce((a, i) => a + i.baseCents, 0);
    const retencionesCents = rxhs.reduce((a, i) => a + (i.retencion?.amountCents ?? 0), 0);
    // Pagos F.616 estimados: por mes, 8% del bruto menos lo retenido ese mes.
    const porMes = new Map<string, { bruto: number; ret: number }>();
    for (const i of rxhs) {
      const m = porMes.get(i.period) ?? { bruto: 0, ret: 0 };
      m.bruto += i.baseCents;
      m.ret += i.retencion?.amountCents ?? 0;
      porMes.set(i.period, m);
    }
    let pagosCuentaCents = 0;
    for (const m of porMes.values()) {
      pagosCuentaCents += computePago616(m.bruto, m.ret, s.retencion4taRate);
    }
    return computeAnnualRenta4ta({
      brutoAnualCents,
      retencionesCents,
      pagosCuentaCents,
      gastos3UitCents: s.gastos3UitCents ?? 0,
      uitCents: s.uitCents,
    });
  }

  private async annualProjection(year: number) {
    const s = await this.settings.get();
    const from = new Date(Date.UTC(year, 0, 1, 5));
    const to = new Date(Date.UTC(year + 1, 0, 1, 5));
    const [invoices, purchases] = await Promise.all([
      this.invoices.find({
        issueDate: { $gte: from, $lt: to },
        kind: 'FACTURA',
        status: { $ne: 'VOIDED' },
      }),
      this.purchases.find({ issueDate: { $gte: from, $lt: to }, deductibleIR: true }),
    ]);
    const periods = await this.periods.find({ year });
    let pagosACuentaCents = 0;
    for (const p of periods) {
      pagosACuentaCents += (await this.periodsService.summaryOf(p._id)).pagoCuentaCents;
    }
    return computeAnnualProjection({
      ventasBaseCents: invoices.reduce((a, i) => a + i.baseCents, 0),
      comprasDeduciblesCents: purchases.reduce((a, p) => a + p.baseCents, 0),
      otrosGastosCents: s.otrosGastosCents,
      pagosACuentaCents,
      uitCents: s.uitCents,
    });
  }
}

@Controller('dashboard')
class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get()
  get() {
    return this.service.build();
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Period.name, schema: PeriodSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: Alert.name, schema: AlertSchema },
    ]),
    PeriodsModule,
    SettingsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
