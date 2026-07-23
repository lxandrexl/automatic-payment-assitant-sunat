import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from '../schemas/invoice.schema';
import { Period, PeriodSchema } from '../schemas/period.schema';
import { Purchase, PurchaseSchema } from '../schemas/purchase.schema';
import { SettingsModule } from '../settings/settings.module';
import { PeriodsController } from './periods.controller';
import { PeriodsService } from './periods.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Period.name, schema: PeriodSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
    SettingsModule,
  ],
  controllers: [PeriodsController],
  providers: [PeriodsService],
  exports: [PeriodsService],
})
export class PeriodsModule {}
