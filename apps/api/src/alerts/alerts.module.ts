import { Controller, Get, Module, Query } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alert, AlertDocument, AlertSchema } from '../schemas/alert.schema';

@Controller('alerts')
class AlertsController {
  constructor(@InjectModel(Alert.name) private readonly model: Model<AlertDocument>) {}

  @Get()
  list(@Query('limit') limit?: string) {
    return this.model
      .find()
      .sort({ sentAt: -1 })
      .limit(Math.min(Number(limit ?? 50), 200));
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }])],
  controllers: [AlertsController],
})
export class AlertsModule {}
