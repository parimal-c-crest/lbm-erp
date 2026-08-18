import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // ADR-176: CORS locked to the project's own frontend origin(s) only, no third-party allowlist.
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3001' });

  // OpenAPI docs (T-064) — auto-generated from every controller/DTO already in the app, tagged
  // per module via `@ApiTags`. Schemas for `class-validator`-decorated DTOs are inferred by the
  // `@nestjs/swagger` compiler plugin (`nest-cli.json`), not hand-duplicated `@ApiProperty` on
  // every field.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('LBM ERP API')
    .setDescription('REST API — see docs-kit/5-modules/*/8-api.md for the per-module design docs.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
