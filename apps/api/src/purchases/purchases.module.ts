import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Purchase, PurchaseSchema } from '../schemas/purchase.schema';
import { PeriodsModule } from '../periods/periods.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Purchase.name, schema: PurchaseSchema }]),
    PeriodsModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
