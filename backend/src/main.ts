import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // ADR-176: CORS locked to the project's own frontend origin(s) only, no third-party allowlist.
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3001' });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
