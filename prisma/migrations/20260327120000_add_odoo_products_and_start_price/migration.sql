-- CreateTable
CREATE TABLE "odoo_products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'Stuks',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "odoo_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "odoo_products_code_key" ON "odoo_products"("code");

-- AlterTable
ALTER TABLE "service_code_mappings" ADD COLUMN "start_price_product_code" TEXT;
