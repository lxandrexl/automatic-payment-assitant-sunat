import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiKeyGuard } from './common/api-key.guard';
import { ProblemFilter } from './common/problem.filter';
import { loadConfig } from './config';

async function bootstrap() {
  const cfg = loadConfig();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(new ApiKeyGuard(cfg.apiKey));
  app.useGlobalFilters(new ProblemFilter());
  await app.listen(cfg.port, '0.0.0.0');
}

void bootstrap();
