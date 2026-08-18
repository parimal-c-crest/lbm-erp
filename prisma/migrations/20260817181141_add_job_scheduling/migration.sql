-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('running', 'success', 'failure', 'timeout');

-- CreateTable
CREATE TABLE "job_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_hour" INTEGER NOT NULL,
    "base_minute" INTEGER NOT NULL,
    "master_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_schedules" (
    "id" TEXT NOT NULL,
    "job_definition_id" TEXT NOT NULL,
    "tenant_subdomain" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "offset_minutes" INTEGER NOT NULL DEFAULT 0,
    "timezone_reference" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "job_definition_id" TEXT NOT NULL,
    "tenant_subdomain" TEXT NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "error_message" TEXT,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_definitions_name_key" ON "job_definitions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "job_schedules_job_definition_id_tenant_subdomain_key" ON "job_schedules"("job_definition_id", "tenant_subdomain");

-- AddForeignKey
ALTER TABLE "job_schedules" ADD CONSTRAINT "job_schedules_job_definition_id_fkey" FOREIGN KEY ("job_definition_id") REFERENCES "job_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_schedules" ADD CONSTRAINT "job_schedules_tenant_subdomain_fkey" FOREIGN KEY ("tenant_subdomain") REFERENCES "tenant_registries"("subdomain") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_job_definition_id_fkey" FOREIGN KEY ("job_definition_id") REFERENCES "job_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
