import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { loadConfig } from './config';
import { HealthController } from './health.controller';
import { AlertsModule } from './alerts/alerts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { IncomeModule } from './income/income.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotifyModule } from './notify/notify.module';
import { PeriodsModule } from './periods/periods.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({ useFactory: () => ({ uri: loadConfig().mongoUri }) }),
    SettingsModule,
    PeriodsModule,
    InvoicesModule,
    PurchasesModule,
    AlertsModule,
    DashboardModule,
    NotifyModule,
    IncomeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
