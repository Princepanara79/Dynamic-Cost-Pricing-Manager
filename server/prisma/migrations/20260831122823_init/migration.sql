-- CreateTable
CREATE TABLE "manufacturers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'manufacturer',
    "manufacturerId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_materials" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentPrice" DECIMAL(65,30) NOT NULL,
    "previousPrice" DECIMAL(65,30),
    "priceChange" DECIMAL(65,30),
    "priceChangePct" DECIMAL(65,30),
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_price_history" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "rawMaterialId" INTEGER NOT NULL,
    "previousPrice" DECIMAL(65,30) NOT NULL,
    "newPrice" DECIMAL(65,30) NOT NULL,
    "difference" DECIMAL(65,30) NOT NULL,
    "changePct" DECIMAL(65,30) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_material_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "additionalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "previousCost" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'active',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_materials" (
    "id" SERIAL NOT NULL,
    "componentId" INTEGER NOT NULL,
    "rawMaterialId" INTEGER NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "component_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "weight" DECIMAL(65,30),
    "size" TEXT,
    "labourCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "machineCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "manufacturingOverhead" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "packagingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "transportationCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "wastagePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profitType" TEXT NOT NULL DEFAULT 'markup',
    "profitPercentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "givenSellingPrice" DECIMAL(65,30),
    "materialCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "wastageCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "manufacturingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "recommendedSellingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "previousManufacturingCost" DECIMAL(65,30),
    "lastRecalculatedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_components" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "product_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packaging_configs" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "unitsPerParent" INTEGER NOT NULL DEFAULT 1,
    "productsPerUnit" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "packaging_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_product_prices" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sellingPrice" DECIMAL(65,30) NOT NULL,
    "profit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "markup" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profitMargin" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_price_history" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "previousPrice" DECIMAL(65,30) NOT NULL,
    "newPrice" DECIMAL(65,30) NOT NULL,
    "difference" DECIMAL(65,30) NOT NULL,
    "changePct" DECIMAL(65,30) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_change_history" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "previousCost" DECIMAL(65,30) NOT NULL,
    "newCost" DECIMAL(65,30) NOT NULL,
    "difference" DECIMAL(65,30) NOT NULL,
    "differencePct" DECIMAL(65,30) NOT NULL,
    "previousRecommendedPrice" DECIMAL(65,30),
    "newRecommendedPrice" DECIMAL(65,30),
    "reason" TEXT,
    "triggerMaterialId" INTEGER,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_change_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "sellingPrice" DECIMAL(65,30) NOT NULL,
    "costAtSale" DECIMAL(65,30) NOT NULL,
    "revenue" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "profit" DECIMAL(65,30) NOT NULL,
    "profitMargin" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "what_if_scenarios" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parameters" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "what_if_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "raw_materials_manufacturerId_idx" ON "raw_materials"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "raw_materials_manufacturerId_name_key" ON "raw_materials"("manufacturerId", "name");

-- CreateIndex
CREATE INDEX "raw_material_price_history_manufacturerId_idx" ON "raw_material_price_history"("manufacturerId");

-- CreateIndex
CREATE INDEX "components_manufacturerId_idx" ON "components"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "components_manufacturerId_name_key" ON "components"("manufacturerId", "name");

-- CreateIndex
CREATE INDEX "products_manufacturerId_idx" ON "products"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "products_manufacturerId_sku_key" ON "products"("manufacturerId", "sku");

-- CreateIndex
CREATE INDEX "clients_manufacturerId_idx" ON "clients"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_manufacturerId_code_key" ON "clients"("manufacturerId", "code");

-- CreateIndex
CREATE INDEX "client_product_prices_manufacturerId_idx" ON "client_product_prices"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "client_product_prices_clientId_productId_key" ON "client_product_prices"("clientId", "productId");

-- CreateIndex
CREATE INDEX "client_price_history_manufacturerId_idx" ON "client_price_history"("manufacturerId");

-- CreateIndex
CREATE INDEX "cost_change_history_manufacturerId_idx" ON "cost_change_history"("manufacturerId");

-- CreateIndex
CREATE INDEX "sales_manufacturerId_idx" ON "sales"("manufacturerId");

-- CreateIndex
CREATE INDEX "what_if_scenarios_manufacturerId_idx" ON "what_if_scenarios"("manufacturerId");

-- CreateIndex
CREATE INDEX "audit_logs_manufacturerId_idx" ON "audit_logs"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_price_history" ADD CONSTRAINT "raw_material_price_history_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_materials" ADD CONSTRAINT "component_materials_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_materials" ADD CONSTRAINT "component_materials_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_configs" ADD CONSTRAINT "packaging_configs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_configs" ADD CONSTRAINT "packaging_configs_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "packaging_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_product_prices" ADD CONSTRAINT "client_product_prices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_product_prices" ADD CONSTRAINT "client_product_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_price_history" ADD CONSTRAINT "client_price_history_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_change_history" ADD CONSTRAINT "cost_change_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "what_if_scenarios" ADD CONSTRAINT "what_if_scenarios_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
