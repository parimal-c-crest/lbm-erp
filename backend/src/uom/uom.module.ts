import { Module } from '@nestjs/common';

import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { ConversionController } from './conversion/conversion.controller';
import { ConversionService } from './conversion/conversion.service';
import { FunctionalRolesController } from './functional-roles/functional-roles.controller';
import { FunctionalRolesService } from './functional-roles/functional-roles.service';
import { GroupsController } from './groups/groups.controller';
import { GroupsService } from './groups/groups.service';
import { HistoryController } from './history/history.controller';
import { HistoryService } from './history/history.service';
import { ImportExportController } from './import-export/import-export.controller';
import { ImportExportService } from './import-export/import-export.service';
import { TypesController } from './types/types.controller';
import { TypesService } from './types/types.service';

// UOM module (M3, EPIC-011, `docs-kit/5-modules/uom/`). `TenantContextService` (used throughout)
// comes from the `@Global()` `TenantModule`, not imported here — same convention as `UsersModule`.
//
// **Controller registration order matters**: `ImportExportController` (`/uom/groups/import`,
// `/uom/groups/export`) is registered before `GroupsController` (`/uom/groups/:id`) so Nest's
// Express router tries the literal `import`/`export` routes before the single-segment `:id`
// wildcard would otherwise swallow them.
@Module({
  controllers: [
    CategoriesController,
    TypesController,
    FunctionalRolesController,
    ImportExportController,
    GroupsController,
    HistoryController,
    ConversionController,
  ],
  providers: [
    CategoriesService,
    TypesService,
    FunctionalRolesService,
    GroupsService,
    HistoryService,
    ConversionService,
    ImportExportService,
  ],
  exports: [GroupsService, ConversionService],
})
export class UomModule {}
