import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { computeAnnualProjection, dateToLimaIso, todayLimaIso } from '@tributo/core';
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

    const currentPeriodId = today.slice(0, 7);
    const currentSummary = (await this.periods.findById(currentPeriodId))
      ? await this.periodsService.summaryOf(currentPeriodId)
      : null;

    const pendingDetracciones = await this.invoices.find({
      'detraccion.status': { $in: ['PENDING', 'OVERDUE'] },
    });

    const projection = await this.annualProjection(year);
    const recentAlerts = await this.alerts.find().sort({ sentAt: -1 }).limit(10);

    return {
      today,
      nextDue: nextDue
        ? {
            period: nextDue._id,
            dueDate: dateToLimaIso(nextDue.dueDate),
            source: nextDue.dueDateSource,
            status: nextDue.status,
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
      recentAlerts,
    };
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
