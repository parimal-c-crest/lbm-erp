import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { BarcodeLabelsController } from './barcode-labels/barcode-labels.controller';
import { BarcodeLabelsService } from './barcode-labels/barcode-labels.service';
import { GroupsController } from './groups/groups.controller';
import { GroupsService } from './groups/groups.service';
import { HolidaysController } from './holidays/holidays.controller';
import { HolidaysService } from './holidays/holidays.service';
import { LoginHistoryController } from './login-history/login-history.controller';
import { LoginHistoryService } from './login-history/login-history.service';
import { MailAccountsController } from './mail-accounts/mail-accounts.controller';
import { MailAccountsService } from './mail-accounts/mail-accounts.service';
import { NotificationSchedulersController } from './notification-schedulers/notification-schedulers.controller';
import { NotificationSchedulersService } from './notification-schedulers/notification-schedulers.service';
import { PayrollController } from './payroll/payroll.controller';
import { PayrollService } from './payroll/payroll.service';
import { PermissionsService } from './permissions/permissions.service';
import { PersonalDaysController } from './personal-days/personal-days.controller';
import { PersonalDaysService } from './personal-days/personal-days.service';
import { ProfilesController } from './profiles/profiles.controller';
import { ProfilesService } from './profiles/profiles.service';
import { QuickBooksSyncController } from './quickbooks/quickbooks-sync.controller';
import { QuickBooksSyncProcessor } from './quickbooks/quickbooks-sync.processor';
import { QuickBooksSyncService } from './quickbooks/quickbooks-sync.service';
import { QUICKBOOKS_SYNC_QUEUE } from './quickbooks/quickbooks.constants';
import { RolesController } from './roles/roles.controller';
import { RolesService } from './roles/roles.service';
import { TimeclockAutoCloseProcessor } from './timeclock/auto-close.processor';
import { TimeclockAutoCloseScheduler } from './timeclock/auto-close.scheduler';
import { TimeclockAutoCloseService } from './timeclock/auto-close.service';
import { TIMECLOCK_AUTO_CLOSE_QUEUE } from './timeclock/timeclock.constants';
import { TimeclockController } from './timeclock/timeclock.controller';
import { TimeclockService } from './timeclock/timeclock.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { WordTemplatesController } from './word-templates/word-templates.controller';
import { WordTemplatesService } from './word-templates/word-templates.service';

// Identity/RBAC backbone (`docs-kit/5-modules/users/1-module.md`) — gates every other module's
// authorization behavior. `TenantContextService` (used throughout) comes from the `@Global()`
// `TenantModule`, not imported here. `BullModule.registerQueue` here reuses the root connection
// already configured by `JobsModule`'s `forRootAsync` — no second Redis connection.
@Module({
  imports: [
    BullModule.registerQueue({ name: TIMECLOCK_AUTO_CLOSE_QUEUE }),
    BullModule.registerQueue({ name: QUICKBOOKS_SYNC_QUEUE }),
  ],
  controllers: [
    UsersController,
    RolesController,
    ProfilesController,
    GroupsController,
    TimeclockController,
    PayrollController,
    PersonalDaysController,
    HolidaysController,
    LoginHistoryController,
    QuickBooksSyncController,
    MailAccountsController,
    NotificationSchedulersController,
    WordTemplatesController,
    BarcodeLabelsController,
  ],
  providers: [
    UsersService,
    RolesService,
    ProfilesService,
    GroupsService,
    PermissionsService,
    TimeclockService,
    TimeclockAutoCloseService,
    TimeclockAutoCloseProcessor,
    TimeclockAutoCloseScheduler,
    PayrollService,
    PersonalDaysService,
    HolidaysService,
    LoginHistoryService,
    QuickBooksSyncService,
    QuickBooksSyncProcessor,
    MailAccountsService,
    NotificationSchedulersService,
    WordTemplatesService,
    BarcodeLabelsService,
  ],
  exports: [UsersService, PermissionsService],
})
export class UsersModule {}
