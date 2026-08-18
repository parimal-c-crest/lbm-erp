-- UOM module (T-073, `docs-kit/5-modules/uom/4-schema.md`). Hand-written (not CLI-generated) to
-- avoid the pre-existing, unrelated `holidays`/`holiday_assignments` drift in this dev database
-- triggering `prisma migrate dev`'s reset prompt — same shape Prisma itself would emit for this
-- schema diff.

-- CreateTable
CREATE TABLE "uom_categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "uom_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uom_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category_id" TEXT,
    "sort_order" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "uom_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uom_functional_roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "uom_functional_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uom_groups" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category_id" TEXT,
    "base_type_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "uom_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uom_role_assignments" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "uom_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uom_conversion_factors" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "units_per_base" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "uom_conversion_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uom_type_factor_history" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uom_type_factor_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uom_picking_hierarchy" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "uom_picking_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: uniqueness on name scoped to non-deleted rows (`4-schema.md` §4/§6) — a partial
-- index, not a plain unique constraint, since Prisma's `@@unique` can't express the
-- `WHERE is_deleted = false` scope. Case-sensitive per `4-schema.md` (only `uom_groups.name` is
-- documented as case-insensitive, BR-001/ADR-191 — see below).
CREATE UNIQUE INDEX "uom_categories_name_key" ON "uom_categories" ("name") WHERE "is_deleted" = false;
CREATE UNIQUE INDEX "uom_types_name_key" ON "uom_types" ("name") WHERE "is_deleted" = false;
CREATE UNIQUE INDEX "uom_functional_roles_name_key" ON "uom_functional_roles" ("name") WHERE "is_deleted" = false;

-- CreateIndex: `uom_groups.name` — case-insensitive functional unique index (BR-001/ADR-191).
CREATE UNIQUE INDEX "uom_groups_name_lower_key" ON "uom_groups" (LOWER("name")) WHERE "is_deleted" = false;

-- CreateIndex
CREATE UNIQUE INDEX "uom_role_assignments_group_id_role_id_key" ON "uom_role_assignments"("group_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "uom_conversion_factors_group_id_type_id_key" ON "uom_conversion_factors"("group_id", "type_id");

-- CreateIndex: performance index supporting the effective-date lookup (FR-007).
CREATE INDEX "uom_type_factor_history_group_id_type_id_effective_from_idx" ON "uom_type_factor_history"("group_id", "type_id", "effective_from");

-- CreateIndex: at most one "currently effective" row per (group_id, type_id) — partial unique index.
CREATE UNIQUE INDEX "uom_type_factor_history_current_key" ON "uom_type_factor_history"("group_id", "type_id") WHERE "effective_to" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "uom_picking_hierarchy_group_id_type_id_key" ON "uom_picking_hierarchy"("group_id", "type_id") WHERE "is_deleted" = false;
CREATE UNIQUE INDEX "uom_picking_hierarchy_group_id_sort_order_key" ON "uom_picking_hierarchy"("group_id", "sort_order") WHERE "is_deleted" = false;

-- CheckConstraint: units_per_base > 0 and a whole number (BR-003/BR-004).
ALTER TABLE "uom_conversion_factors" ADD CONSTRAINT "uom_conversion_factors_units_per_base_check" CHECK ("units_per_base" > 0 AND "units_per_base" = FLOOR("units_per_base"));

-- CheckConstraint: effective_to >= effective_from when set (`4-schema.md` §6).
ALTER TABLE "uom_type_factor_history" ADD CONSTRAINT "uom_type_factor_history_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");

-- AddForeignKey
ALTER TABLE "uom_types" ADD CONSTRAINT "uom_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "uom_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uom_types" ADD CONSTRAINT "uom_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uom_types" ADD CONSTRAINT "uom_types_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "uom_categories" ADD CONSTRAINT "uom_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uom_categories" ADD CONSTRAINT "uom_categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "uom_functional_roles" ADD CONSTRAINT "uom_functional_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uom_functional_roles" ADD CONSTRAINT "uom_functional_roles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "uom_groups" ADD CONSTRAINT "uom_groups_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "uom_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uom_groups" ADD CONSTRAINT "uom_groups_base_type_id_fkey" FOREIGN KEY ("base_type_id") REFERENCES "uom_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uom_groups" ADD CONSTRAINT "uom_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uom_groups" ADD CONSTRAINT "uom_groups_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "uom_role_assignments" ADD CONSTRAINT "uom_role_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "uom_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uom_role_assignments" ADD CONSTRAINT "uom_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "uom_functional_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uom_role_assignments" ADD CONSTRAINT "uom_role_assignments_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "uom_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uom_role_assignments" ADD CONSTRAINT "uom_role_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uom_role_assignments" ADD CONSTRAINT "uom_role_assignments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "uom_conversion_factors" ADD CONSTRAINT "uom_conversion_factors_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "uom_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uom_conversion_factors" ADD CONSTRAINT "uom_conversion_factors_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "uom_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uom_conversion_factors" ADD CONSTRAINT "uom_conversion_factors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uom_conversion_factors" ADD CONSTRAINT "uom_conversion_factors_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "uom_type_factor_history" ADD CONSTRAINT "uom_type_factor_history_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "uom_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uom_type_factor_history" ADD CONSTRAINT "uom_type_factor_history_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "uom_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "uom_picking_hierarchy" ADD CONSTRAINT "uom_picking_hierarchy_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "uom_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uom_picking_hierarchy" ADD CONSTRAINT "uom_picking_hierarchy_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "uom_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uom_picking_hierarchy" ADD CONSTRAINT "uom_picking_hierarchy_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uom_picking_hierarchy" ADD CONSTRAINT "uom_picking_hierarchy_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: the 11 starter Functional Roles (`5-data-dictionary.md` §5, ADR-094).
INSERT INTO "uom_functional_roles" ("id", "name", "sort_order", "created_at", "updated_at") VALUES
  (gen_random_uuid()::text, 'Selling', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Pricing', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Stocking', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Physical Inventory', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Picking', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Purchase', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Purchase-Cost', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Receiving', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Reporting', 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Inner-Pack', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Outer-Pack', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
