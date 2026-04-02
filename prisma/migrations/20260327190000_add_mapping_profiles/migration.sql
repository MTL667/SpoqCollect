-- CreateTable: mapping_profiles
CREATE TABLE "mapping_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'BE',
    "has_region_logic" BOOLEAN NOT NULL DEFAULT false,
    "odoo_export_enabled" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mapping_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mapping_profiles_name_key" ON "mapping_profiles"("name");

-- CreateTable: profile_subcontractors
CREATE TABLE "profile_subcontractors" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "export_label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "profile_subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_subcontractors_profile_id_name_key" ON "profile_subcontractors"("profile_id", "name");

-- CreateTable: profile_subcontractor_object_types
CREATE TABLE "profile_subcontractor_object_types" (
    "subcontractor_id" TEXT NOT NULL,
    "object_type_id" TEXT NOT NULL,
    CONSTRAINT "profile_subcontractor_object_types_pkey" PRIMARY KEY ("subcontractor_id", "object_type_id")
);

-- CreateTable: profile_mapping_rules
CREATE TABLE "profile_mapping_rules" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "object_type_id" TEXT NOT NULL,
    "regime" TEXT,
    "region" TEXT,
    "min_quantity" INTEGER,
    "max_quantity" INTEGER,
    "odoo_product_code" TEXT NOT NULL,
    "start_price_product_code" TEXT,
    "label_nl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "profile_mapping_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: profile_subasset_configs
CREATE TABLE "profile_subasset_configs" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "parent_object_type_id" TEXT NOT NULL,
    "child_object_type_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "profile_subasset_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_subasset_configs_profile_id_parent_object_type_id_child_object_type_id_key"
ON "profile_subasset_configs"("profile_id", "parent_object_type_id", "child_object_type_id");

-- AlterTable: inventory_sessions – add mapping_profile_id
ALTER TABLE "inventory_sessions" ADD COLUMN "mapping_profile_id" TEXT;

-- AddForeignKey: profile_subcontractors → mapping_profiles
ALTER TABLE "profile_subcontractors" ADD CONSTRAINT "profile_subcontractors_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "mapping_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: profile_subcontractor_object_types → profile_subcontractors
ALTER TABLE "profile_subcontractor_object_types" ADD CONSTRAINT "profile_subcontractor_object_types_subcontractor_id_fkey"
    FOREIGN KEY ("subcontractor_id") REFERENCES "profile_subcontractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: profile_subcontractor_object_types → object_types
ALTER TABLE "profile_subcontractor_object_types" ADD CONSTRAINT "profile_subcontractor_object_types_object_type_id_fkey"
    FOREIGN KEY ("object_type_id") REFERENCES "object_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: profile_mapping_rules → mapping_profiles
ALTER TABLE "profile_mapping_rules" ADD CONSTRAINT "profile_mapping_rules_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "mapping_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: profile_mapping_rules → object_types
ALTER TABLE "profile_mapping_rules" ADD CONSTRAINT "profile_mapping_rules_object_type_id_fkey"
    FOREIGN KEY ("object_type_id") REFERENCES "object_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: profile_subasset_configs → mapping_profiles
ALTER TABLE "profile_subasset_configs" ADD CONSTRAINT "profile_subasset_configs_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "mapping_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: profile_subasset_configs → object_types (parent)
ALTER TABLE "profile_subasset_configs" ADD CONSTRAINT "profile_subasset_configs_parent_object_type_id_fkey"
    FOREIGN KEY ("parent_object_type_id") REFERENCES "object_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: profile_subasset_configs → object_types (child)
ALTER TABLE "profile_subasset_configs" ADD CONSTRAINT "profile_subasset_configs_child_object_type_id_fkey"
    FOREIGN KEY ("child_object_type_id") REFERENCES "object_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: inventory_sessions → mapping_profiles
ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_mapping_profile_id_fkey"
    FOREIGN KEY ("mapping_profile_id") REFERENCES "mapping_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
