-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "GroupMemberType" AS ENUM ('USER', 'ROLE', 'ROLE_AND_SUBORDINATES');

-- CreateEnum
CREATE TYPE "TimeClockStatus" AS ENUM ('clock_in', 'clock_out', 'unclosed_needs_resolution');

-- CreateEnum
CREATE TYPE "HoursType" AS ENUM ('regular', 'holiday', 'personal', 'sick', 'vacation');

-- CreateEnum
CREATE TYPE "LaborStatus" AS ENUM ('working', 'break', 'lunch');

-- AlterTable (first_name/username added nullable, backfilled from existing rows, then locked
-- NOT NULL — the skeleton database already has a bootstrap Super Admin row, ADR-185/T-022)
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "default_location" TEXT,
ADD COLUMN     "failed_login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role_id" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "username" TEXT;

UPDATE "users" SET "first_name" = COALESCE("first_name", split_part("email", '@', 1)),
                    "username" = COALESCE("username", split_part("email", '@', 1))
WHERE "first_name" IS NULL OR "username" IS NULL;

ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL,
                     ALTER COLUMN "username" SET NOT NULL;

-- CreateTable
CREATE TABLE "user_hr_profiles" (
    "user_id" TEXT NOT NULL,
    "salary" DECIMAL(12,2),
    "hire_date" DATE,

    CONSTRAINT "user_hr_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "user_id" TEXT NOT NULL,
    "default_landing_page" TEXT NOT NULL DEFAULT 'dashboard',
    "theme" TEXT NOT NULL DEFAULT 'light',

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_role_id" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_two_factor_requirements" (
    "role_id" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_two_factor_requirements_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_profiles" (
    "role_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,

    CONSTRAINT "role_profiles_pkey" PRIMARY KEY ("role_id","profile_id")
);

-- CreateTable
CREATE TABLE "profile_module_action_permissions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "profile_module_action_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_memberships" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "member_type" "GroupMemberType" NOT NULL,
    "member_id" TEXT NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_clock_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "punch_date" DATE NOT NULL,
    "status" "TimeClockStatus" NOT NULL,
    "hours_type" "HoursType" NOT NULL DEFAULT 'regular',
    "help_message" TEXT,

    CONSTRAINT "time_clock_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clock_in_task_details" (
    "id" TEXT NOT NULL,
    "time_clock_record_id" TEXT NOT NULL,
    "labor_status" "LaborStatus" NOT NULL DEFAULT 'working',
    "task" TEXT,

    CONSTRAINT "clock_in_task_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_days" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hours_type" "HoursType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "day_count" INTEGER,
    "start_time" TEXT,
    "end_time" TEXT,
    "note" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_time" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "session_id" TEXT,
    "user_ip" TEXT,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quickbooks_sync_pointers" (
    "user_id" TEXT NOT NULL,
    "qb_list_id" TEXT,
    "qb_edit_sequence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "quickbooks_sync_pointers_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "mail_accounts" (
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "reply_to_email" TEXT NOT NULL,
    "signature" TEXT,

    CONSTRAINT "mail_accounts_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "notification_schedulers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_schedulers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "word_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_user_id_notification_type_key" ON "user_notification_preferences"("user_id", "notification_type");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_name_key" ON "profiles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "profile_module_action_permissions_profile_id_module_action_key" ON "profile_module_action_permissions"("profile_id", "module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE INDEX "time_clock_records_user_id_punch_date_idx" ON "time_clock_records"("user_id", "punch_date");

-- CreateIndex
CREATE INDEX "login_history_username_login_time_idx" ON "login_history"("username", "login_time");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hr_profiles" ADD CONSTRAINT "user_hr_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_parent_role_id_fkey" FOREIGN KEY ("parent_role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_two_factor_requirements" ADD CONSTRAINT "role_two_factor_requirements_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_profiles" ADD CONSTRAINT "role_profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_profiles" ADD CONSTRAINT "role_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_module_action_permissions" ADD CONSTRAINT "profile_module_action_permissions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_records" ADD CONSTRAINT "time_clock_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clock_in_task_details" ADD CONSTRAINT "clock_in_task_details_time_clock_record_id_fkey" FOREIGN KEY ("time_clock_record_id") REFERENCES "time_clock_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_days" ADD CONSTRAINT "personal_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quickbooks_sync_pointers" ADD CONSTRAINT "quickbooks_sync_pointers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_accounts" ADD CONSTRAINT "mail_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
