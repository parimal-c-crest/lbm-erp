import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { TenantProvisioningController } from './provisioning/tenant-provisioning.controller';
import { TenantProvisioningService } from './provisioning/tenant-provisioning.service';
import { SkeletonOnlyGuard } from './skeleton-only.guard';
import { TenantClientRegistryService } from './tenant-client-registry.service';
import { TenantContextService } from './tenant-context.service';
import { TenantResolutionMiddleware } from './tenant-resolution.middleware';

@Global()
@Module({
  controllers: [TenantProvisioningController],
  providers: [
    TenantClientRegistryService,
    TenantContextService,
    SkeletonOnlyGuard,
    TenantProvisioningService,
  ],
  exports: [TenantClientRegistryService, TenantContextService],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolutionMiddleware).forRoutes('*');
  }
}
